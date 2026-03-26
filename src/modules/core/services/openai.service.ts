import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { QueryComplexityAnalyzer } from '../../../knowledge/query-complexity-analyzer';
import { KnowledgeBaseLoader } from '../../../knowledge/knowledge-base-loader';

export interface OpenAiStatus {
  available: boolean;
  model: string;
  apiKeyConfigured: boolean;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: any[];
  tool_call_id?: string;
}

export interface ChatCompletionResponse {
  choices: Array<{
    message: ChatMessage;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

@Injectable()
export class OpenAiService {
  private readonly logger = new Logger(OpenAiService.name);
  private readonly client: OpenAI;
  private readonly model: string;
  private readonly isConfigured: boolean;
  private readonly complexityAnalyzer: QueryComplexityAnalyzer;

  constructor(
    private configService: ConfigService,
    private knowledgeBaseLoader: KnowledgeBaseLoader
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    this.model = this.configService.get<string>('OPENAI_MODEL', 'gpt-4o');
    this.isConfigured = !!apiKey;
    this.complexityAnalyzer = new QueryComplexityAnalyzer();

    if (this.isConfigured) {
      this.client = new OpenAI({
        apiKey,
      });
      this.logger.log('OpenAI service initialized successfully');
    } else {
      this.logger.warn('OpenAI API key not configured');
    }
  }

  /**
   * Create chat completion
   */
  async createChatCompletion(
    messages: ChatMessage[],
    options: {
      temperature?: number;
      maxTokens?: number;
      tools?: any[];
      toolChoice?: string;
    } = {},
  ): Promise<ChatCompletionResponse> {
    if (!this.isConfigured) {
      throw new Error('OpenAI service is not configured');
    }

    try {
      const {
        temperature = 0.7,
        maxTokens = 1500,
        tools,
        toolChoice = 'auto',
      } = options;

      this.logger.debug('Creating chat completion', {
        model: this.model,
        messagesCount: messages.length,
        hasTools: !!tools,
        toolsCount: tools?.length || 0,
      });

      const requestOptions: any = {
        model: this.model,
        messages,
        temperature,
        max_tokens: maxTokens,
      };

      if (tools && tools.length > 0) {
        requestOptions.tools = tools;
        requestOptions.tool_choice = toolChoice;
      }

      const response = await this.client.chat.completions.create(requestOptions);

      this.logger.debug('Chat completion created successfully', {
        usage: response.usage,
        hasToolCalls: !!response.choices[0]?.message?.tool_calls,
      });

      return response as ChatCompletionResponse;
    } catch (error) {
      this.logger.error('Failed to create chat completion:', error);
      throw error;
    }
  }

  /**
   * Process query with enhanced system prompt
   */
  async processQuery(
    messages: ChatMessage[],
    sessionId: string,
    tools?: any[],
  ): Promise<ChatCompletionResponse> {
    try {
      this.logger.debug('Processing query', {
        sessionId: sessionId.substring(0, 8) + '...',
        messagesCount: messages.length,
        hasTools: !!tools,
      });

      const response = await this.createChatCompletion(messages, {
        tools,
        temperature: 0.7,
        maxTokens: 1500,
      });

      return response;
    } catch (error) {
      this.logger.error('Query processing failed:', error);
      throw error;
    }
  }

  /**
   * Get enhanced system prompt with conditional knowledge base
   */
  getEnhancedSystemPrompt(basePrompt: string, query: string): string {
    try {
      this.logger.log('getEnhancedSystemPrompt called', {
        hasBasePrompt: !!basePrompt,
        basePromptLength: basePrompt.length,
        hasQuery: !!query,
        query: query ? query.substring(0, 100) + '...' : 'no query'
      });

      // If no query provided, use base prompt only
      if (!query) {
        this.logger.warn('No query provided, using base prompt only');
        return basePrompt;
      }

      // Analyze query complexity
      const complexityAnalysis = this.complexityAnalyzer.analyzeComplexity(query);

      this.logger.log('Query complexity analysis result', {
        query: query.substring(0, 50) + '...',
        complexity: complexityAnalysis.complexity,
        score: complexityAnalysis.score,
        needsKnowledgeBase: complexityAnalysis.needsKnowledgeBase,
        indicators: complexityAnalysis.indicators
      });

      // For simple queries, use base prompt only
      if (!complexityAnalysis.needsKnowledgeBase) {
        this.logger.log('Using base prompt for simple query', {
          query: query.substring(0, 50) + '...',
          complexity: complexityAnalysis.complexity,
          score: complexityAnalysis.score,
          basePromptLength: basePrompt.length
        });
        return basePrompt;
      }

      // For complex queries, use selective knowledge base
      const relevantSections = this.complexityAnalyzer.getRelevantKnowledgeSections(query, complexityAnalysis);
      const selectivePrompt = this.buildSelectivePrompt(basePrompt, relevantSections);

      this.logger.log('Using enhanced prompt for complex query', {
        query: query.substring(0, 50) + '...',
        complexity: complexityAnalysis.complexity,
        score: complexityAnalysis.score,
        sections: relevantSections,
        basePromptLength: basePrompt.length,
        enhancedPromptLength: selectivePrompt.length
      });

      return selectivePrompt;
    } catch (error) {
      this.logger.error('Failed to enhance system prompt:', error);
      return basePrompt;
    }
  }

  /**
   * Build selective prompt with relevant knowledge sections
   */
  private buildSelectivePrompt(basePrompt: string, sections: string[]): string {
    try {
      let enhancedPrompt = basePrompt;

      for (const section of sections) {
        const sectionContent = this.getKnowledgeSection(section);
        if (sectionContent) {
          enhancedPrompt += `\n\n${sectionContent}`;
        }
      }

      return enhancedPrompt;
    } catch (error) {
      this.logger.error('Failed to build selective prompt', error);
      return basePrompt;
    }
  }

  /**
   * Get specific knowledge section content from knowledge base files
   */
  private getKnowledgeSection(section: string): string {
    try {
      // Check if knowledge base is loaded
      if (!this.knowledgeBaseLoader.isKnowledgeLoaded()) {
        this.logger.warn('Knowledge base not loaded, using fallback');
        return ''; // Return empty string if knowledge not loaded
      }

      // Get dormitory knowledge for all sections
      const dormitoryKnowledge = this.knowledgeBaseLoader.getKnowledgeSection('dormitory');
      const websiteContext = this.knowledgeBaseLoader.getKnowledgeSection('website');

      // For now, return the full dormitory knowledge for all sections
      // In the future, we could parse and extract specific sections from the markdown
      switch (section) {
        case 'GENERAL_KNOWLEDGE':
          return dormitoryKnowledge + '\n\n' + websiteContext;
        default:
          return dormitoryKnowledge;
      }
    } catch (error) {
      this.logger.error('Failed to get knowledge section', error);
      return ''; // Fallback to empty string
    }
  }



  /**
   * Get service status
   */
  getStatus(): OpenAiStatus {
    return {
      available: this.isConfigured,
      model: this.model,
      apiKeyConfigured: this.isConfigured,
    };
  }

  /**
   * Get OpenAI client (for direct access if needed)
   */
  getClient(): OpenAI {
    if (!this.isConfigured) {
      throw new Error('OpenAI service is not configured');
    }
    return this.client;
  }
}
