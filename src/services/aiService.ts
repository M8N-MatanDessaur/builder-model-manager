import type { BuilderModel, BuilderField, BuilderContent, BuilderCredentials } from '../types/builder';

// Use proxy in development, direct API in production (requires backend proxy)
const OPENAI_API_URL = import.meta.env.DEV
  ? '/api/openai/v1/chat/completions'
  : 'https://api.openai.com/v1/chat/completions';

function getOpenAIApiKey(): string | null {
  const stored = sessionStorage.getItem('builder_credentials');
  console.log('[aiService] Checking for OpenAI API key...');
  if (stored) {
    const credentials: BuilderCredentials = JSON.parse(stored);
    const hasKey = credentials.openaiApiKey && credentials.openaiApiKey.trim().length > 0;
    console.log('[aiService] Credentials found, has openaiApiKey:', hasKey);
    if (hasKey) {
      console.log('[aiService] OpenAI API key length:', credentials.openaiApiKey!.length);
    }
    return hasKey ? credentials.openaiApiKey! : null;
  }
  console.log('[aiService] No credentials found in sessionStorage');
  return null;
}

export interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIContext {
  type: 'model' | 'field' | 'content' | 'general';
  model?: BuilderModel;
  field?: BuilderField;
  content?: BuilderContent;
  allModels?: BuilderModel[];
}

class AIService {
  private conversationHistory: AIMessage[] = [];
  private insightCache: Map<string, { insight: string; timestamp: number }> = new Map();

  // Generate cache key based on context
  private getCacheKey(context: AIContext): string {
    switch (context.type) {
      case 'model':
        return `model:${context.model?.id || context.model?.name}`;
      case 'content':
        return `content:${context.content?.id}`;
      case 'field':
        return `field:${context.model?.id}:${context.field?.name}`;
      default:
        return 'general';
    }
  }

  // Check if cached insight is still valid
  private getCachedInsight(context: AIContext): string | null {
    const key = this.getCacheKey(context);
    const cached = this.insightCache.get(key);

    if (!cached) return null;

    // Cache is valid for 1 hour
    const ONE_HOUR = 60 * 60 * 1000;
    if (Date.now() - cached.timestamp > ONE_HOUR) {
      this.insightCache.delete(key);
      return null;
    }

    return cached.insight;
  }

  // Store insight in cache
  private cacheInsight(context: AIContext, insight: string): void {
    const key = this.getCacheKey(context);
    this.insightCache.set(key, {
      insight,
      timestamp: Date.now(),
    });
  }

  // Clear cache for a specific context (call when model/content is updated)
  clearInsightCache(context: AIContext): void {
    const key = this.getCacheKey(context);
    this.insightCache.delete(key);
  }

  async chat(userMessage: string, context: AIContext): Promise<string> {
    const apiKey = getOpenAIApiKey();
    if (!apiKey) {
      throw new Error('OpenAI API key not configured. Please add your OpenAI API key in settings.');
    }

    // Build system prompt based on context
    const systemPrompt = this.buildSystemPrompt(context);

    // Add user message to history
    this.conversationHistory.push({
      role: 'user',
      content: userMessage,
    });

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // In development, use custom header that proxy will convert
      if (import.meta.env.DEV) {
        headers['x-openai-api-key'] = apiKey;
      } else {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      // OpenAI format: system message goes first in messages array
      const messages = [
        { role: 'system', content: systemPrompt },
        ...this.conversationHistory,
      ];

      const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          max_tokens: 1024,
          messages,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to get AI response');
      }

      const data = await response.json();
      const assistantMessage = data.choices[0].message.content;

      // Add assistant response to history
      this.conversationHistory.push({
        role: 'assistant',
        content: assistantMessage,
      });

      return assistantMessage;
    } catch (error) {
      console.error('AI Service Error:', error);
      throw error;
    }
  }

  async getInsight(context: AIContext): Promise<string> {
    const apiKey = getOpenAIApiKey();
    if (!apiKey) {
      return ''; // Silently skip insights if no API key
    }

    // Check cache first
    const cached = this.getCachedInsight(context);
    if (cached) {
      console.log('[aiService] Returning cached insight');
      return cached;
    }

    const prompt = this.buildInsightPrompt(context);

    try {
      const systemPrompt = this.buildSystemPrompt(context);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // In development, use custom header that proxy will convert
      if (import.meta.env.DEV) {
        headers['x-openai-api-key'] = apiKey;
      } else {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ];

      const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          max_tokens: 512,
          temperature: 0.3, // Lower temperature for more consistent responses
          messages,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI insight');
      }

      const data = await response.json();
      const insight = data.choices[0].message.content;

      // Cache the insight
      this.cacheInsight(context, insight);

      return insight;
    } catch (error) {
      console.error('AI Insight Error:', error);
      return '';
    }
  }

  private buildSystemPrompt(context: AIContext): string {
    let prompt = `You are a technical assistant for a Builder.io CMS. Answer questions with extreme brevity and precision.

Response rules:
- Maximum 2-3 sentences per answer
- No fluff, no introductions, no conclusions
- Direct technical answers only
- Use field names, types, and specific details
- Skip phrases like "I'd be happy to help" or "Let me explain"
- Just answer the question

`;

    switch (context.type) {
      case 'model':
        if (context.model) {
          prompt += `\nCurrent Context: The user is viewing the "${context.model.name}" model (type: ${context.model.kind}).
Fields in this model:
${JSON.stringify(context.model.fields, null, 2)}

`;
          if (context.allModels) {
            const relationships = this.findRelationships(context.model);
            if (relationships.length > 0) {
              prompt += `\nRelationships:
${relationships.map(r => `- References ${r.to} via field "${r.field}"`).join('\n')}
`;
            }
          }
        }
        break;

      case 'field':
        if (context.field && context.model) {
          prompt += `\nCurrent Context: The user is viewing the field "${context.field.name}" (type: ${context.field.type}) in the "${context.model.name}" model.
Field details:
${JSON.stringify(context.field, null, 2)}
`;
        }
        break;

      case 'content':
        if (context.content && context.model) {
          prompt += `\nCurrent Context: The user is viewing content entry "${context.content.name}" of model "${context.model.name}".
Content data:
${JSON.stringify(context.content.data, null, 2)}
`;
        }
        break;
    }

    return prompt;
  }

  private buildInsightPrompt(context: AIContext): string {
    switch (context.type) {
      case 'model':
        if (context.model) {
          const fieldNames = context.model.fields.map(f => f.name).sort();

          const hasSlug = fieldNames.some(n => n.toLowerCase().includes('slug'));
          const hasDate = fieldNames.some(n => n.toLowerCase().includes('date') || n.toLowerCase().includes('published'));
          const hasSEO = fieldNames.some(n =>
            n.toLowerCase().includes('meta') ||
            n.toLowerCase().includes('seo') ||
            n.toLowerCase().includes('title') ||
            n.toLowerCase().includes('description')
          );

          return `Analyze this "${context.model.name}" model (${context.model.kind} type, ${context.model.fields.length} fields).

RESPONSE FORMAT (follow exactly):
1. First line: One clear sentence describing what this model is used for based on its name and field structure.

2. Then add a "Suggestions for Improvement" section with exactly 2-3 bullet points (start each with "•"):
   - Evaluate if slug field exists: ${hasSlug ? 'Present' : 'Missing - suggest adding a slug field for URLs'}
   - Evaluate if date/published field exists: ${hasDate ? 'Present' : 'Missing - suggest adding publishedDate or similar'}
   - Evaluate SEO fields: ${hasSEO ? 'Some present - suggest completing the set (title, description, og:image)' : 'Missing - suggest adding SEO meta fields'}

Be consistent in your analysis. Same model structure = same suggestions.`;
        }
        break;

      case 'field':
        if (context.field) {
          const isRequired = context.field.required ? 'required' : 'optional';
          const hasHelper = context.field.helperText ? 'has helper text' : 'no helper text';

          return `Analyze the "${context.field.name}" field (type: ${context.field.type}, ${isRequired}, ${hasHelper}).

RESPONSE FORMAT (follow exactly):
1. First line: One sentence explaining what this field type is typically used for.

2. Then 1-2 bullet points (start with "•") suggesting improvements:
   - If no helper text, suggest adding it for content editors
   - If complex type (list, object, reference), suggest validation or structure improvements

Be consistent in your recommendations.`;
        }
        break;

      case 'content':
        if (context.content && context.model && context.content.data) {
          const content = context.content;
          const dataKeys = Object.keys(content.data).sort();
          const modelFieldNames = context.model.fields.map(f => f.name).sort();
          const missingFields = modelFieldNames.filter(f => !dataKeys.includes(f));
          const emptyFields = dataKeys.filter(k => {
            const val = content.data[k];
            return val === null || val === undefined || val === '' || (Array.isArray(val) && val.length === 0);
          });

          return `Analyze this "${context.content.name}" content entry (model: ${context.model.name}).

DATA PRESENT: ${dataKeys.length} fields populated
MISSING FIELDS: ${missingFields.length > 0 ? missingFields.join(', ') : 'none'}
EMPTY FIELDS: ${emptyFields.length > 0 ? emptyFields.slice(0, 3).join(', ') : 'none'}

RESPONSE FORMAT (follow exactly):
1. First line: One sentence summarizing what content this entry contains.

2. Then 2-3 bullet points (start with "•") about specific improvements:
   - List missing required fields if any
   - List empty fields that should be populated
   - SEO completeness check

Be specific and consistent. Same data state = same suggestions.`;
        }
        break;
    }

    return 'Provide a helpful insight about the current context.';
  }

  private findRelationships(model: BuilderModel): Array<{ field: string; to: string }> {
    const relationships: Array<{ field: string; to: string }> = [];

    const extractRefs = (fields: BuilderField[], path = ''): void => {
      fields.forEach(field => {
        const fieldPath = path ? `${path}.${field.name}` : field.name;
        const modelName = field.model || field.defaultValue?.model;

        if (modelName && typeof modelName === 'string') {
          relationships.push({ field: fieldPath, to: modelName });
        }

        if (field.subFields) {
          extractRefs(field.subFields, fieldPath);
        }
      });
    };

    extractRefs(model.fields);
    return relationships;
  }

  clearHistory(): void {
    this.conversationHistory = [];
  }
}

export const aiService = new AIService();
