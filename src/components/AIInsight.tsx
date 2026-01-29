import { useState, useEffect, useRef } from 'react';
import { Sparkles, Info, ArrowRight } from 'lucide-react';
import { aiService, type AIContext } from '../services/aiService';

interface AIInsightProps {
  context: AIContext;
  position?: 'top' | 'inline' | 'sidebar';
  compact?: boolean;
}

export function AIInsight({ context, position = 'inline', compact = false }: AIInsightProps) {
  const [insight, setInsight] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [hasApiKey, setHasApiKey] = useState(false);
  const hasLoadedRef = useRef(false);

  // Chat state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant', content: string }>>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Reset state when navigating to a different model/content
  useEffect(() => {
    // Reset the loaded flag so we re-fetch for the new context
    hasLoadedRef.current = false;
    // Clear previous insight and chat state
    setInsight('');
    setError('');
    setChatOpen(false);
    setChatMessages([]);
    setChatInput('');
  }, [context.type, context.model?.id, context.content?.id]);

  // Check if API key exists and auto-load insight
  useEffect(() => {
    const stored = localStorage.getItem('builder_credentials');
    if (stored) {
      const credentials = JSON.parse(stored);
      const hasKey = !!credentials.openaiApiKey;
      setHasApiKey(hasKey);

      // Auto-load insight if we have an API key and haven't loaded yet
      if (hasKey && !hasLoadedRef.current) {
        hasLoadedRef.current = true;
        loadInsight();
      }
    }
  }, [context.type, context.model?.id, context.content?.id]);

  // Listen for settings updates
  useEffect(() => {
    const handleSettingsUpdate = () => {
      console.log('[AIInsight] Settings updated, checking for API key...');
      const stored = localStorage.getItem('builder_credentials');
      if (stored) {
        const credentials = JSON.parse(stored);
        const hasKey = !!credentials.openaiApiKey;
        setHasApiKey(hasKey);

        // Reload insight if API key was just added
        if (hasKey && !insight) {
          hasLoadedRef.current = false;
          loadInsight();
        }
      }
    };
    window.addEventListener('ai-settings-updated', handleSettingsUpdate);
    return () => window.removeEventListener('ai-settings-updated', handleSettingsUpdate);
  }, [insight]);

  const loadInsight = async () => {
    if (loading) return; // Don't load if already loading

    setLoading(true);
    setError('');
    setInsight(''); // Clear previous insight
    console.log('[AIInsight] Loading insight for context:', context.type);
    try {
      const insightText = await aiService.getInsight(context);
      console.log('[AIInsight] Received insight:', insightText ? 'yes' : 'no');
      if (insightText) {
        setInsight(insightText);
      } else {
        setError('No OpenAI API key configured');
      }
    } catch (error) {
      console.error('[AIInsight] Failed to load insight:', error);
      setError(error instanceof Error ? error.message : 'Failed to load insight');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChat = () => {
    setChatOpen(true);
    // Focus input after a brief delay to ensure it's rendered
    setTimeout(() => chatInputRef.current?.focus(), 100);
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || chatLoading) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setChatLoading(true);

    try {
      const response = await aiService.chat(userMessage, context);
      setChatMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to get response';
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: `Sorry, I encountered an error: ${errorMsg}`
      }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Auto-scroll chat container to bottom when messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages, chatLoading]);

  // Convert Markdown formatting to HTML elements
  const parseMarkdown = (text: string): React.ReactNode => {
    const parts: React.ReactNode[] = [];
    let remaining = text;
    let key = 0;

    while (remaining.length > 0) {
      // Match **bold**
      const boldMatch = remaining.match(/^\*\*(.+?)\*\*/);
      if (boldMatch) {
        parts.push(<strong key={key++}>{boldMatch[1]}</strong>);
        remaining = remaining.slice(boldMatch[0].length);
        continue;
      }

      // Match *italic*
      const italicMatch = remaining.match(/^\*(.+?)\*/);
      if (italicMatch) {
        parts.push(<em key={key++}>{italicMatch[1]}</em>);
        remaining = remaining.slice(italicMatch[0].length);
        continue;
      }

      // Match `code`
      const codeMatch = remaining.match(/^`(.+?)`/);
      if (codeMatch) {
        parts.push(
          <code key={key++} style={{
            backgroundColor: '#1a1a1a',
            padding: '2px 6px',
            borderRadius: '3px',
            fontFamily: 'monospace',
            fontSize: '0.9em',
          }}>
            {codeMatch[1]}
          </code>
        );
        remaining = remaining.slice(codeMatch[0].length);
        continue;
      }

      // No match, take one character
      parts.push(remaining[0]);
      remaining = remaining.slice(1);
    }

    return parts;
  };

  // Format insight text with proper HTML structure
  const formatInsight = (text: string) => {
    const lines = text.split('\n').filter(line => line.trim());

    if (lines.length === 0) return null;

    // First non-empty line is the summary
    const summary = lines[0];

    // Remaining lines - look for bullet points or improvements section
    const improvements: string[] = [];
    let inImprovements = false;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();

      // Check if this line starts a new section
      if (line.toLowerCase().includes('improvement') ||
          line.toLowerCase().includes('suggestion') ||
          line.toLowerCase().includes('consider')) {
        inImprovements = true;
        continue;
      }

      // Collect bullet points
      if (line.startsWith('•') || line.startsWith('-') || line.startsWith('*')) {
        improvements.push(line.replace(/^[•\-*]\s*/, ''));
      } else if (inImprovements && line.length > 0) {
        improvements.push(line);
      }
    }

    return (
      <>
        {/* Summary */}
        <div style={{
          fontSize: '15px',
          fontWeight: '500',
          color: '#fff',
          marginBottom: improvements.length > 0 ? '16px' : '0',
          lineHeight: '1.5',
        }}>
          {parseMarkdown(summary)}
        </div>

        {/* Improvements */}
        {improvements.length > 0 && (
          <>
            <div style={{
              fontSize: '12px',
              fontWeight: '600',
              color: '#00aaff',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '10px',
            }}>
              Suggestions for Improvement
            </div>
            <ul style={{
              margin: 0,
              paddingLeft: '20px',
              listStyleType: 'none',
            }}>
              {improvements.map((improvement, idx) => (
                <li key={idx} style={{
                  marginBottom: '8px',
                  position: 'relative',
                  paddingLeft: '8px',
                  lineHeight: '1.5',
                  color: '#ccc',
                }}>
                  <span style={{
                    position: 'absolute',
                    left: '-12px',
                    color: '#00aaff',
                  }}>•</span>
                  {parseMarkdown(improvement)}
                </li>
              ))}
            </ul>
          </>
        )}
      </>
    );
  };

  // Don't show if no API key configured
  if (!hasApiKey) return null;

  const getStyles = () => {
    const baseStyles = {
      backgroundColor: '#0f0f0f',
      border: '1px solid #333',
      borderLeft: '3px solid #00aaff',
      padding: compact ? '12px 16px' : '16px 20px',
      fontSize: '14px',
      lineHeight: '1.6',
      color: '#ccc',
      marginBottom: '24px',
    };

    switch (position) {
      case 'top':
        return {
          ...baseStyles,
          marginTop: '0',
        };
      case 'sidebar':
        return {
          ...baseStyles,
          position: 'sticky' as const,
          top: '20px',
          maxWidth: '300px',
        };
      default:
        return baseStyles;
    }
  };

  return (
    <div style={getStyles()}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <div style={{ marginTop: '2px', flexShrink: 0 }}>
          <Sparkles size={16} color="#00aaff" style={{ flexShrink: 0 }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', color: '#999' }}>
                Insight is being generated by OpenAI
              </span>
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  border: '2px solid #333',
                  borderTop: '2px solid #00aaff',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }}
              />
            </div>
          ) : error ? (
            <div style={{ fontSize: '13px', color: '#666', fontStyle: 'italic' }}>
              {error}
            </div>
          ) : insight ? (
            <>
              <div style={{
                fontSize: compact ? '13px' : '14px',
                color: '#aaa',
              }}>
                {formatInsight(insight)}
              </div>

              {/* Chat Toggle Button */}
              {!chatOpen && (
                <button
                  onClick={handleOpenChat}
                  style={{
                    marginTop: '16px',
                    padding: '0',
                    background: 'transparent',
                    border: 'none',
                    color: '#999',
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#999'}
                >
                  <span>Ask a question</span>
                  <ArrowRight size={14} />
                </button>
              )}

              {/* Inline Chat */}
              {chatOpen && (
                <div style={{
                  marginTop: '16px',
                  paddingTop: '16px',
                  borderTop: '1px solid #333',
                }}>
                  {/* Chat Messages */}
                  {(chatMessages.length > 0 || chatLoading) && (
                    <div
                      ref={chatContainerRef}
                      style={{
                        marginBottom: '12px',
                        maxHeight: '300px',
                        overflowY: 'auto',
                      }}
                    >
                      {chatMessages.map((msg, idx) => (
                        <div key={idx} style={{
                          display: 'flex',
                          justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                          marginBottom: '12px',
                        }}>
                          <div style={{
                            maxWidth: '75%',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                          }}>
                            <div style={{
                              fontSize: '10px',
                              color: '#666',
                              marginBottom: '4px',
                              paddingLeft: msg.role === 'user' ? '0' : '12px',
                              paddingRight: msg.role === 'user' ? '12px' : '0',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                            }}>
                              {msg.role === 'user' ? 'You' : 'AI'}
                            </div>
                            <div style={{
                              padding: '10px 14px',
                              fontSize: '14px',
                              lineHeight: '1.5',
                              borderRadius: '12px',
                              backgroundColor: msg.role === 'user' ? '#2a2a2a' : '#1a1a1a',
                              border: msg.role === 'user' ? '1px solid #3a3a3a' : '1px solid #2a2a2a',
                              color: msg.role === 'user' ? '#fff' : '#ccc',
                            }}>
                              {msg.role === 'assistant' ? parseMarkdown(msg.content) : msg.content}
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* AI Typing Indicator */}
                      {chatLoading && (
                        <div style={{
                          display: 'flex',
                          justifyContent: 'flex-start',
                          marginBottom: '12px',
                        }}>
                          <div style={{
                            maxWidth: '75%',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-start',
                          }}>
                            <div style={{
                              fontSize: '10px',
                              color: '#666',
                              marginBottom: '4px',
                              paddingLeft: '12px',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                            }}>
                              AI
                            </div>
                            <div style={{
                              padding: '10px 14px',
                              fontSize: '14px',
                              lineHeight: '1.5',
                              borderRadius: '12px',
                              backgroundColor: '#1a1a1a',
                              border: '1px solid #2a2a2a',
                              color: '#999',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}>
                              <span>Thinking</span>
                              <span className="typing-dots">
                                <span>.</span>
                                <span>.</span>
                                <span>.</span>
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Chat Input */}
                  <div style={{
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'center',
                  }}>
                    <input
                      ref={chatInputRef}
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Ask about this model..."
                      disabled={chatLoading}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        fontSize: '14px',
                        backgroundColor: '#1a1a1a',
                        border: '1px solid #333',
                        color: '#fff',
                        outline: 'none',
                        transition: 'border-color 0.2s',
                      }}
                      onFocus={(e) => e.currentTarget.style.borderColor = '#555'}
                      onBlur={(e) => e.currentTarget.style.borderColor = '#333'}
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!chatInput.trim() || chatLoading}
                      style={{
                        padding: '8px 16px',
                        fontSize: '14px',
                        backgroundColor: 'transparent',
                        border: '1px solid #333',
                        color: chatInput.trim() && !chatLoading ? '#fff' : '#666',
                        cursor: chatInput.trim() && !chatLoading ? 'pointer' : 'not-allowed',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        if (chatInput.trim() && !chatLoading) {
                          e.currentTarget.style.borderColor = '#fff';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#333';
                      }}
                    >
                      {chatLoading ? '...' : 'Send'}
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }

          .typing-dots span {
            animation: typing-dot 1.4s infinite;
            opacity: 0;
          }

          .typing-dots span:nth-child(1) {
            animation-delay: 0s;
          }

          .typing-dots span:nth-child(2) {
            animation-delay: 0.2s;
          }

          .typing-dots span:nth-child(3) {
            animation-delay: 0.4s;
          }

          @keyframes typing-dot {
            0%, 60%, 100% {
              opacity: 0;
            }
            30% {
              opacity: 1;
            }
          }
        `}
      </style>
    </div>
  );
}

interface AIFieldTooltipProps {
  fieldName: string;
  fieldType: string;
  fieldModel?: string;
}

export function AIFieldTooltip({ fieldName, fieldType, fieldModel }: AIFieldTooltipProps) {
  const [insight, setInsight] = useState<string>('');
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hoverTimeout, setHoverTimeout] = useState<number | null>(null);

  const handleMouseEnter = () => {
    // Load insight after hovering for 1.5 seconds
    const timeout = setTimeout(() => {
      loadInsight();
    }, 1500);
    setHoverTimeout(timeout);
  };

  const handleMouseLeave = () => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      setHoverTimeout(null);
    }
    // Keep insight visible briefly after mouse leaves
    setTimeout(() => {
      setVisible(false);
    }, 300);
  };

  const loadInsight = async () => {
    setLoading(true);
    try {
      const context: AIContext = {
        type: 'field',
        field: {
          name: fieldName,
          type: fieldType as any,
          model: fieldModel,
        } as any,
      };
      const insightText = await aiService.getInsight(context);
      if (insightText) {
        setInsight(insightText);
        setVisible(true);
      }
    } catch (error) {
      console.error('Failed to load field insight:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Info
        size={14}
        color="#666"
        style={{
          cursor: 'help',
          opacity: visible || loading ? 1 : 0.5,
          transition: 'opacity 0.2s',
        }}
      />
      {visible && insight && (
        <div
          style={{
            position: 'absolute',
            left: '24px',
            top: '-8px',
            backgroundColor: '#0a0a0a',
            border: '1px solid #00aaff',
            borderRadius: '4px',
            padding: '12px 16px',
            width: '280px',
            fontSize: '12px',
            lineHeight: '1.5',
            color: '#ccc',
            zIndex: 1000,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
          }}
        >
          <div style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
            <Sparkles size={12} color="#00aaff" />
            <div style={{ fontSize: '10px', fontWeight: '600', color: '#00aaff', textTransform: 'uppercase' }}>
              AI Insight
            </div>
          </div>
          {insight}
        </div>
      )}
      {loading && (
        <div
          style={{
            position: 'absolute',
            left: '24px',
            top: '0',
            fontSize: '11px',
            color: '#666',
          }}
        >
          ...
        </div>
      )}
    </div>
  );
}
