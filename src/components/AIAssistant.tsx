import { useState, useEffect, useRef } from 'react';
import { Sparkles, X, Send, Loader } from 'lucide-react';
import { aiService, type AIContext, type AIMessage } from '../services/aiService';

interface AIAssistantProps {
  context: AIContext;
  isOpen: boolean;
  onClose: () => void;
}

export function AIAssistant({ context, isOpen, onClose }: AIAssistantProps) {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [insight, setInsight] = useState<string>('');
  const [loadingInsight, setLoadingInsight] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load initial insight when context changes
  useEffect(() => {
    if (isOpen && context.type !== 'general') {
      loadInsight();
    }
  }, [isOpen, context]);

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadInsight = async () => {
    setLoadingInsight(true);
    try {
      const insightText = await aiService.getInsight(context);
      setInsight(insightText);
    } catch (error) {
      console.error('Failed to load insight:', error);
      setInsight('');
    } finally {
      setLoadingInsight(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const response = await aiService.chat(userMessage, context);
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to get response';
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Sorry, I encountered an error: ${errorMsg}`
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getContextTitle = (): string => {
    switch (context.type) {
      case 'model':
        return context.model ? `Model: ${context.model.name}` : 'Model Assistant';
      case 'field':
        return context.field ? `Field: ${context.field.name}` : 'Field Assistant';
      case 'content':
        return context.content ? `Content: ${context.content.name}` : 'Content Assistant';
      default:
        return 'AI Assistant';
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        width: '420px',
        height: '100vh',
        backgroundColor: '#0a0a0a',
        borderLeft: '1px solid #333',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 1000,
        animation: 'slideInRight 0.3s ease-out',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '20px',
          borderBottom: '1px solid #333',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#0f0f0f',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Sparkles size={20} color="#00aaff" />
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>AI Assistant</h3>
            <p style={{ margin: 0, fontSize: '12px', color: '#999', marginTop: '2px' }}>
              {getContextTitle()}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            padding: '4px',
            cursor: 'pointer',
            color: '#999',
          }}
          title="Close Assistant"
        >
          <X size={20} />
        </button>
      </div>

      {/* Insight Panel */}
      {insight && (
        <div
          style={{
            padding: '16px',
            backgroundColor: '#0f0f0f',
            borderBottom: '1px solid #333',
            fontSize: '14px',
            lineHeight: '1.6',
            color: '#ccc',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Sparkles size={14} color="#00aaff" />
            <strong style={{ fontSize: '12px', color: '#00aaff', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Insight
            </strong>
          </div>
          {loadingInsight ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#666' }}>
              <Loader size={14} className="spinning" />
              <span style={{ fontSize: '13px' }}>Analyzing...</span>
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: '13px', color: '#aaa' }}>{insight}</p>
          )}
        </div>
      )}

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#666', marginTop: '40px' }}>
            <Sparkles size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
            <p style={{ fontSize: '14px', lineHeight: '1.6' }}>
              Ask me anything about this {context.type === 'model' ? 'model' : context.type === 'field' ? 'field' : 'content'}.
              <br />
              I can help explain structure, relationships, and best practices.
            </p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              <div
                style={{
                  maxWidth: '85%',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  backgroundColor: msg.role === 'user' ? '#00aaff' : '#1a1a1a',
                  color: msg.role === 'user' ? '#000' : '#fff',
                  fontSize: '14px',
                  lineHeight: '1.5',
                  border: msg.role === 'assistant' ? '1px solid #333' : 'none',
                }}
              >
                {msg.content}
              </div>
            </div>
          ))
        )}
        {loading && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#666',
              fontSize: '14px',
            }}
          >
            <Loader size={16} className="spinning" />
            <span>Thinking...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div
        style={{
          padding: '16px',
          borderTop: '1px solid #333',
          backgroundColor: '#0f0f0f',
        }}
      >
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask a question..."
            disabled={loading}
            style={{
              flex: 1,
              padding: '10px 12px',
              fontSize: '14px',
              backgroundColor: '#1a1a1a',
              border: '1px solid #333',
              color: '#fff',
              borderRadius: '4px',
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            style={{
              padding: '10px 16px',
              backgroundColor: input.trim() && !loading ? '#00aaff' : '#333',
              border: 'none',
              color: input.trim() && !loading ? '#000' : '#666',
              cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: '600',
              fontSize: '14px',
            }}
            title="Send message"
          >
            <Send size={16} />
          </button>
        </div>
        <p style={{ fontSize: '11px', color: '#666', margin: '8px 0 0 0', textAlign: 'center' }}>
          AI can make mistakes. Verify important information.
        </p>
      </div>

      <style>
        {`
          @keyframes slideInRight {
            from {
              transform: translateX(100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }

          .spinning {
            animation: spin 1s linear infinite;
          }

          @keyframes spin {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }
        `}
      </style>
    </div>
  );
}
