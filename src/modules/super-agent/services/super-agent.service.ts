import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

import { CacheService } from '../../core/services/cache.service';
import { McpService } from '../../core/services/mcp.service';
import { OpenAiService } from '../../core/services/openai.service';
import { RealEstateOpenAIService } from './real-estate-openai.service';
import { QueryResponseDto } from '../../../dto/query.dto';
import { SystemPromptUtil } from '../../../common/utils/system-prompt.util';
import { ResponseValidator } from '../../../common/validators/response-validator';

/**
 * Super Intelligent Agent - EXACT copy from Express logic
 */
@Injectable()
export class SuperAgentService {
  private readonly logger = new Logger(SuperAgentService.name);
  private baseSystemPrompt: string = '';
  private readonly MAX_QUERIES_PER_SESSION = 30;
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly RETRY_DELAY_BASE = 1000; // 1 second base delay

  constructor(
    private readonly cacheService: CacheService,
    private readonly mcpService: McpService,
    private readonly openAiService: OpenAiService,
    private readonly realEstateOpenAIService: RealEstateOpenAIService,
    private readonly systemPromptUtil: SystemPromptUtil,
  ) {
    this.initializeSystemPrompt();
  }

  private async initializeSystemPrompt(): Promise<void> {
    try {
      this.baseSystemPrompt = this.systemPromptUtil.getSystemPrompt();
      this.logger.log('System prompt initialized successfully');
    } catch (error) {
      this.logger.error('Failed to load system prompt', error);
      this.baseSystemPrompt = 'You are a helpful AI assistant for real estate queries.';
    }
  }

  /**
   * Get current query count for a session
   */
  private async getSessionQueryCount(sessionId: string): Promise<number> {
    const cacheKey = `session_query_count:${sessionId}`;
    const count = await this.cacheService.get(cacheKey);
    return count ? parseInt(count as string, 10) : 0;
  }

  /**
   * Increment query count for a session
   */
  private async incrementSessionQueryCount(sessionId: string): Promise<void> {
    const cacheKey = `session_query_count:${sessionId}`;
    const currentCount = await this.getSessionQueryCount(sessionId);
    const newCount = currentCount + 1;

    // Cache for 24 hours (86400 seconds)
    await this.cacheService.set(cacheKey, newCount.toString(), 86400);

    this.logger.log('Session query count incremented', {
      sessionId,
      count: newCount,
      limit: this.MAX_QUERIES_PER_SESSION
    });
  }

  /**
   * Sleep for specified milliseconds
   */
  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Retry OpenAI call with exponential backoff
   */
  private async retryOpenAICall<T>(
    operation: () => Promise<T>,
    context: string,
    attempt: number = 1
  ): Promise<T> {
    try {
      return await operation();
    } catch (error: any) {
      const isRateLimit = error?.status === 429 || error?.code === 'rate_limit_exceeded';
      const isRetryable = isRateLimit || error?.status >= 500;

      if (attempt >= this.MAX_RETRY_ATTEMPTS || !isRetryable) {
        this.logger.error(`${context} failed after ${attempt} attempts`, {
          error: error?.message,
          status: error?.status,
          code: error?.code
        });
        throw error;
      }

      const delay = this.RETRY_DELAY_BASE * Math.pow(2, attempt - 1);
      const jitter = Math.random() * 1000; // Add jitter to avoid thundering herd
      const totalDelay = delay + jitter;

      this.logger.warn(`${context} failed, retrying in ${Math.round(totalDelay)}ms`, {
        attempt,
        maxAttempts: this.MAX_RETRY_ATTEMPTS,
        error: error?.message,
        status: error?.status,
        retryAfter: error?.headers?.['retry-after']
      });

      // If OpenAI provides retry-after header, respect it
      if (error?.headers?.['retry-after']) {
        const retryAfter = parseInt(error.headers['retry-after']) * 1000;
        await this.sleep(Math.max(retryAfter, totalDelay));
      } else {
        await this.sleep(totalDelay);
      }

      return this.retryOpenAICall(operation, context, attempt + 1);
    }
  }

  /**
   * Process user query - EXACT copy from Express logic
   */
  async processQuery(query: string, sessionId?: string): Promise<QueryResponseDto> {
    let currentSessionId;

    try {
      currentSessionId = sessionId;
    } catch (error) {
      this.logger.error('Failed to get sessionId', error);
      throw error;
    }

    // Check session query limit
    const sessionQueryCount = await this.getSessionQueryCount(currentSessionId);
    if (sessionQueryCount >= this.MAX_QUERIES_PER_SESSION) {
      this.logger.warn('Session query limit exceeded', {
        sessionId: currentSessionId,
        queryCount: sessionQueryCount,
        limit: this.MAX_QUERIES_PER_SESSION
      });

      return {
        success: false,
        // response: `Bạn đã đạt giới hạn ${this.MAX_QUERIES_PER_SESSION} câu hỏi cho phiên này. Vui lòng bắt đầu phiên mới.`,
        response: `Bạn đã hết lượt hỏi với chatbot rồi, xin hãy để lần sau`,
        sessionId: currentSessionId,
        results: [],
        metadata: {
          duration: 0,
          aiService: 'SuperAgent',
          model: 'session-limit',
          toolsUsed: [],
          toolCount: 0,
          dataSource: 'cache',
          agentCapability: 'session-management'
        }
      };
    }

    const startTime = Date.now();

    try {
      this.logger.log('SuperIntelligentAgent processing query', {
        query: query.substring(0, 100),
        sessionId: currentSessionId
      });

      // Step 1: Check if OpenAI is available
      const aiService = this.selectAIService();
      if (!aiService.service) {
        this.logger.error('No AI service available');
        return {
          success: false,
          response: 'Dịch vụ AI tạm thời không khả dụng. Vui lòng thử lại sau.',
          sessionId: currentSessionId,
          results: [],
          query: { query, intent: 'error', confidence: 0 },
          metadata: {
            duration: Date.now() - startTime,
            aiService: 'none',
            model: 'none',
            toolsUsed: [],
            toolCount: 0,
            dataSource: 'none',
            agentCapability: 'UNAVAILABLE'
          }
        };
      }

      this.logger.log('Using AI service', {
        service: aiService.name,
        sessionId: currentSessionId
      });

      // Step 2: Get conversation history
      const rawHistory = await this.getConversationHistory(currentSessionId);
      const history = this.cleanConversationHistory(rawHistory);

      // Step 2.2: Nếu lịch sử bị hỏng, hãy xóa nó và bắt đầu lại
      if (history.length === 0 && rawHistory.length > 0) {
        this.logger.warn('Conversation history was corrupted, clearing and starting fresh', {
          sessionId: currentSessionId,
          originalLength: rawHistory.length
        });
        await this.clearConversationHistory(currentSessionId);
      }

      // Add user query to history
      history.push({
        role: 'user',
        content: query
      });

      // Step 3: Prepare messages
      const messages = [
        { role: 'system', content: this.getSystemPrompt(query) },
        ...history
      ];

      // Step 4: Process with OpenAI function calling
      let assistantMessage;
      let searchResults = [];
      let aiResponse = null;

      try {
        const tools = await this.getTools();
        this.logger.log('Calling OpenAI with tools', {
          model: 'gpt-4o',
          toolsCount: tools.length,
          messagesCount: messages.length
        });

        aiResponse = await this.retryOpenAICall(
          () => this.openAiService.createChatCompletion(messages, {
            temperature: 0.7,
            maxTokens: 1500,
            tools: tools,
            toolChoice: 'auto'
          }),
          'Initial OpenAI call'
        );

        assistantMessage = aiResponse.choices[0].message;

        this.logger.log('OpenAI response received', {
          hasToolCalls: !!assistantMessage.tool_calls,
          toolCallsLength: assistantMessage.tool_calls?.length || 0,
          content: assistantMessage.content?.substring(0, 200)
        });
      } catch (error) {
        this.logger.error('OpenAI call failed after retries', error);

        // Return graceful fallback response instead of throwing
        return {
          success: false,
          response: 'Xin lỗi, hệ thống đang quá tải. Vui lòng thử lại sau ít phút. Nếu bạn cần hỗ trợ gấp, vui lòng liên hệ trực tiếp với chúng tôi.',
          sessionId: currentSessionId,
          results: [],
          metadata: {
            duration: Date.now() - startTime,
            aiService: 'OpenAI',
            model: 'rate-limit-fallback',
            toolsUsed: [],
            toolCount: 0,
            dataSource: 'fallback',
            agentCapability: 'error-handling',
            originalError: error?.message || 'Unknown error'
          }
        };
      }

      // Step 5: Xử lý các cuộc gọi công cụ nếu có
      let finalResponse = assistantMessage.content || '';

      if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
        this.logger.log('About to process tool calls', {
          toolCallsCount: assistantMessage.tool_calls.length,
          toolCallsNames: assistantMessage.tool_calls.map(tc => tc.function?.name)
        });

        const toolResults = await this.processToolCalls(assistantMessage.tool_calls);

        // Add assistant message with tool_calls to conversation
        messages.push(assistantMessage);

        // Add tool response messages for each tool call
        for (const toolCall of assistantMessage.tool_calls) {
          const toolResult = toolResults.toolResponses?.[toolCall.id] || { error: 'No response' };
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(toolResult)
          });
        }

        // Get final response from OpenAI after tool execution
        try {
          const finalAIResponse = await this.retryOpenAICall(
            () => this.openAiService.createChatCompletion(messages, {
              temperature: 0.7,
              maxTokens: 1500
            }),
            'Final OpenAI call after tool execution'
          );

          finalResponse = finalAIResponse.choices[0].message.content || finalResponse;
        } catch (error) {
          this.logger.error('Final OpenAI call failed after retries, using tool results', error);
          // Continue with existing finalResponse from tool results
        }

        // Extract search results if available
        if (toolResults.searchResults) {
          searchResults = toolResults.searchResults;
        }

        // Add tool results to conversation
        history.push(assistantMessage);

        for (const toolCall of assistantMessage.tool_calls) {
          history.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(toolResults[toolCall.id] || {})
          });
        }

        // Get final response with tool results
        const finalMessages = [
          { role: 'system', content: this.getSystemPrompt(query) },
          ...history
        ];

        let finalCompletion;
        try {
          finalCompletion = await this.retryOpenAICall(
            () => this.openAiService.createChatCompletion(finalMessages, {
              temperature: 0.7,
              maxTokens: 1500
            }),
            'Final completion OpenAI call'
          );

          finalResponse = finalCompletion.choices[0].message.content;
          history.push(finalCompletion.choices[0].message);
        } catch (error) {
          this.logger.error('Final completion OpenAI call failed after retries', error);
          finalResponse = 'Xin lỗi, tôi không thể xử lý yêu cầu của bạn lúc này do hệ thống quá tải. Vui lòng thử lại sau.';
          // Add a fallback message to history
          history.push({ role: 'assistant', content: finalResponse });
        }
      } else {
        // Add assistant response to history
        history.push(assistantMessage);
      }

      // Update conversation history
      await this.updateConversationHistory(currentSessionId, history);

      // Increment session query count
      await this.incrementSessionQueryCount(currentSessionId);

      const duration = Date.now() - startTime;
      const toolsUsed = assistantMessage.tool_calls?.map(tc => tc.function.name) || [];

      // Validate response to prevent duplicate information
      const validation = ResponseValidator.validateResponse(finalResponse, searchResults);

      let validatedResponse = finalResponse;
      if (!validation.isValid) {
        this.logger.warn('Response validation failed, using clean response', {
          originalResponse: finalResponse,
          errors: validation.errors,
          warnings: validation.warnings
        });

        // Generate clean response if validation fails
        validatedResponse = ResponseValidator.generateCleanResponse(searchResults.length, query);
      } else if (validation.warnings.length > 0) {
        this.logger.warn('Response validation warnings', {
          warnings: validation.warnings
        });
      }

      return {
        success: true,
        query: { query, intent: 'search', confidence: 1 },
        results: searchResults,
        response: validatedResponse,
        sessionId: currentSessionId,
        metadata: {
          duration,
          aiService: aiService.name,
          model: 'gpt-4o',
          toolsUsed: toolsUsed,
          toolCount: toolsUsed.length,
          dataSource: 'REAL_DATABASE_VIA_MCP',
          agentCapability: 'INTELLIGENT_MULTI_TOOL_EXECUTION',
          responseValidation: {
            isValid: validation.isValid,
            warningCount: validation.warnings.length,
            errorCount: validation.errors.length
          }
        }
      };

    } catch (error) {
      this.logger.error('Query processing failed', error);

      return {
        success: false,
        response: 'Dịch vụ AI tạm thời không khả dụng. Vui lòng thử lại sau.',
        sessionId: currentSessionId,
        results: [],
        query: { query, intent: 'error', confidence: 0 },
        metadata: {
          duration: Date.now() - startTime,
          aiService: 'error',
          model: 'error',
          toolsUsed: [],
          toolCount: 0,
          dataSource: 'error',
          agentCapability: 'UNAVAILABLE',
          originalError: error.message
        }
      };
    }
  }

  /**
   * Process tool calls
   */
  async processToolCalls(toolCalls: any[]): Promise<any> {
    const results: any = {};
    const toolResponses: any = {}; // Store tool responses for OpenAI
    let searchResults: any[] = [];

    for (const toolCall of toolCalls) {
      const { function: func, id } = toolCall;

      try {
        const args = JSON.parse(func.arguments);

        // Dynamic MCP tool calling - no more hard-coded switch cases!
        this.logger.log('Executing MCP tool', {
          toolName: func.name,
          args: args,
          argsKeys: Object.keys(args)
        });

        const mcpResponse = await this.mcpService.callTool(func.name, args);

        this.logger.log('MCP tool response', {
          toolName: func.name,
          success: mcpResponse.success,
          hasData: !!mcpResponse.data,
          dataKeys: mcpResponse.data ? Object.keys(mcpResponse.data) : [],
          error: mcpResponse.error
        });

        if (mcpResponse.success) {
          results[id] = mcpResponse.data || {};
          toolResponses[id] = mcpResponse.data || {};

          // Extract search results - handle complex MCP response structure
          let properties = null;
          let actualData = mcpResponse.data;

          // Handle case where data is in result.content[0].text as JSON string
          if (actualData?.content && Array.isArray(actualData.content) && actualData.content[0]?.text) {
            try {
              const parsedData = JSON.parse(actualData.content[0].text);
              actualData = parsedData;
            } catch (parseError) {
              this.logger.warn('Failed to parse MCP content text as JSON', { error: parseError.message });
            }
          }

          // Now extract properties from the actual data
          if (actualData?.properties && Array.isArray(actualData.properties)) {
            properties = actualData.properties;
          } else if (actualData?.propertiesView && Array.isArray(actualData.propertiesView)) {
            properties = actualData.propertiesView;
          } else if (actualData?.propertyViews && Array.isArray(actualData.propertyViews)) {
            // Extract property from propertyViews structure
            properties = actualData.propertyViews.map(pv => pv.property || pv);
          }

          if (properties) {
            // Ensure each property has required fields (id, slug)
            const validProperties = properties.map(prop => ({
              ...prop,
              slug: prop.slug || `property-${prop.id}` // Generate slug if missing
            }));

            searchResults = [...searchResults, ...validProperties];
            this.logger.log('Found search results', {
              toolName: func.name,
              propertyCount: validProperties.length,
              searchResultsLength: searchResults.length,
              firstPropertyId: validProperties[0]?.id
            });
          }
        } else {
          this.logger.error('MCP tool failed', {
            toolName: func.name,
            error: mcpResponse.error,
            args: args
          });
          results[id] = {
            error: mcpResponse.error || `Failed to execute ${func.name}`,
            toolName: func.name
          };
          toolResponses[id] = {
            error: mcpResponse.error || `Failed to execute ${func.name}`,
            toolName: func.name
          };
        }
      } catch (error) {
        this.logger.error('Tool call processing failed', {
          toolCall: func.name,
          error: error.message
        });
        results[id] = { error: error.message };
        toolResponses[id] = { error: error.message };
      }
    }

    results.searchResults = searchResults;
    results.toolResponses = toolResponses;
    return results;
  }

  /**
   * Get conversation history
   */
  async getConversationHistory(sessionId: string): Promise<any[]> {
    try {
      return await this.cacheService.get(`conversation_history:${sessionId}`) || [];
    } catch (error) {
      this.logger.error('Failed to get conversation history', error);
      return [];
    }
  }

  /**
   * Update conversation history
   */
  async updateConversationHistory(sessionId: string, history: any[]): Promise<void> {
    try {
      await this.cacheService.set(`conversation_history:${sessionId}`, history, 3600); // 1 hour TTL
    } catch (error) {
      this.logger.error('Failed to update conversation history', error);
    }
  }

  /**
   * Clear conversation history
   */
  async clearConversationHistory(sessionId: string): Promise<void> {
    try {
      await this.cacheService.delete(`conversation_history:${sessionId}`);
    } catch (error) {
      this.logger.error('Failed to clear conversation history', error);
    }
  }

  /**
   * Select AI service - EXACT copy from Express
   */
  selectAIService(): { name: string; service: any } {
    // Only use OpenAI
    if (this.realEstateOpenAIService.isAvailable()) {
      return { name: 'OpenAI', service: this.realEstateOpenAIService };
    }

    return { name: null, service: null };
  }

  /**
   * Get system prompt - EXACT copy from Express
   */
  getSystemPrompt(query = ''): string {
    try {
      // Get enhanced prompt with conditional knowledge base
      let enhancedPrompt = this.realEstateOpenAIService.getEnhancedSystemPrompt(this.baseSystemPrompt, query);

      // For now, just return the enhanced prompt without dynamic tools injection
      // TODO: Make getTools() synchronous or cache tools
      this.logger.debug('System prompt generated', {
        query: query ? query.substring(0, 50) + '...' : 'no query',
        basePromptLength: this.baseSystemPrompt.length,
        enhancedPromptLength: enhancedPrompt.length,
        isEnhanced: enhancedPrompt.length > this.baseSystemPrompt.length
      });

      return enhancedPrompt;
    } catch (error) {
      this.logger.error('System prompt generation failed', error);
      // Fallback to base prompt if enhancement fails
      return this.baseSystemPrompt;
    }
  }

  /**
   * Get tools - EXACT copy from Express
   */
  async getTools(): Promise<any[]> {
    // First try to get cached tools
    let mcpTools = this.mcpService.getAvailableMCPTools();

    // If no cached tools, load them
    if (!mcpTools || mcpTools.length === 0) {
      this.logger.log('Loading MCP tools for the first time...');
      try {
        await this.mcpService.getAvailableTools(); // This will cache tools
        mcpTools = this.mcpService.getAvailableMCPTools(); // Get cached tools
      } catch (error) {
        this.logger.error('Failed to load MCP tools', error);
        return [];
      }
    }

    if (!mcpTools || mcpTools.length === 0) {
      this.logger.warn('No MCP tools available, using empty tools array');
      return [];
    }

    this.logger.log('Using cached MCP tools', { toolCount: mcpTools.length });

    // Convert MCP tools to OpenAI function calling format
    const openAITools = mcpTools.map((tool: any) => {
      // Ensure tool has function property with name
      if (!tool.function || !tool.function.name) {
        this.logger.warn('Invalid tool format, missing function.name', { tool });
        return null;
      }

      // Handle missing or invalid parameters intelligently
      let parameters = tool.function.parameters;

      if (!parameters || (typeof parameters === 'object' && Object.keys(parameters).length === 0)) {
        this.logger.warn('Tool has missing or empty parameters, using dynamic schema', {
          toolName: tool.function.name,
          originalParameters: parameters
        });

        // Create dynamic schema that allows any parameters but provides guidance
        parameters = {
          type: 'object',
          properties: {},
          required: [],
          additionalProperties: true,
          description: `Dynamic parameters for ${tool.function.name}. Pass any relevant parameters based on the tool description: ${tool.function.description || 'No description available'}`
        };
      }

      return {
        type: 'function',
        function: {
          name: tool.function.name,
          description: tool.function.description || '',
          parameters: parameters
        }
      };
    }).filter(Boolean); // Remove null entries

    // Enhanced logging for debugging
    const toolsWithDynamicSchema = openAITools.filter(tool =>
      tool.function.parameters?.additionalProperties === true
    );

    this.logger.log('Converted to OpenAI tools format', {
      toolCount: openAITools.length,
      toolsWithDynamicSchema: toolsWithDynamicSchema.length,
      dynamicSchemaTools: toolsWithDynamicSchema.map(t => t.function.name),
      firstTool: openAITools[0]
    });

    // Log specific tool schemas for debugging
    openAITools.forEach(tool => {
      const hasRealSchema = tool.function.parameters &&
        tool.function.parameters.properties &&
        Object.keys(tool.function.parameters.properties).length > 0;

      this.logger.log(`${tool.function.name} tool found`, {
        name: tool.function.name,
        description: tool.function.description,
        hasParameters: !!tool.function.parameters,
        hasRealSchema: hasRealSchema,
        parametersKeys: tool.function.parameters ? Object.keys(tool.function.parameters) : [],
        parametersType: typeof tool.function.parameters
      });
    });

    return openAITools;
  }

  /**
   * Clean conversation history - Enhanced to handle tool_calls properly
   */
  cleanConversationHistory(history: any[]): any[] {
    if (!history || !Array.isArray(history)) {
      return [];
    }

    // First pass: identify valid assistant-tool pairs
    const validMessages = [];
    const toolCallMap = new Map<string, boolean>(); // tool_call_id -> has_response

    // Build map of tool calls and their responses
    for (let i = 0; i < history.length; i++) {
      const message = history[i];

      if (message.role === 'assistant' && message.tool_calls && message.tool_calls.length > 0) {
        // Mark all tool calls as pending
        for (const toolCall of message.tool_calls) {
          toolCallMap.set(toolCall.id, false);
        }
      } else if (message.role === 'tool' && message.tool_call_id) {
        // Mark this tool call as having a response
        if (toolCallMap.has(message.tool_call_id)) {
          toolCallMap.set(message.tool_call_id, true);
        }
      }
    }

    // Second pass: filter messages based on validity
    let skipUntilNextUserOrAssistant = false;

    for (let i = 0; i < history.length; i++) {
      const message = history[i];

      // Reset skip flag on user messages
      if (message.role === 'user') {
        skipUntilNextUserOrAssistant = false;
        validMessages.push(message);
        continue;
      }

      // Skip if we're in skip mode
      if (skipUntilNextUserOrAssistant) {
        this.logger.warn('Skipping message due to invalid tool sequence', {
          messageRole: message.role,
          index: i
        });
        continue;
      }

      // Handle assistant messages with tool_calls
      if (message.role === 'assistant' && message.tool_calls && message.tool_calls.length > 0) {
        // Check if ALL tool calls have responses
        const allHaveResponses = message.tool_calls.every((tc: any) =>
          toolCallMap.get(tc.id) === true
        );

        if (!allHaveResponses) {
          this.logger.warn('Skipping assistant message with incomplete tool responses', {
            messageRole: message.role,
            toolCallsCount: message.tool_calls.length,
            unmatchedToolCalls: message.tool_calls
              .filter((tc: any) => toolCallMap.get(tc.id) !== true)
              .map((tc: any) => tc.id)
          });
          skipUntilNextUserOrAssistant = true;
          continue;
        }

        validMessages.push(message);
      } else if (message.role === 'tool') {
        // Only include tool messages that have valid tool_call_ids
        if (toolCallMap.has(message.tool_call_id) && toolCallMap.get(message.tool_call_id) === true) {
          validMessages.push(message);
        } else {
          this.logger.warn('Skipping orphaned tool message', {
            messageRole: message.role,
            toolCallId: message.tool_call_id,
            hasValidToolCall: toolCallMap.has(message.tool_call_id)
          });
        }
      } else if (message.role === 'assistant') {
        // Regular assistant message without tool_calls
        skipUntilNextUserOrAssistant = false;
        validMessages.push(message);
      }
    }

    this.logger.log('Conversation history cleaned', {
      originalLength: history.length,
      cleanedLength: validMessages.length,
      removedMessages: history.length - validMessages.length
    });

    return validMessages;
  }

  /**
   * Clear session cache
   */
  async clearSession(sessionId: string): Promise<void> {
    await this.clearConversationHistory(sessionId);
    this.logger.log('Session cleared', { sessionId });
  }

  /**
   * Get MCP tools information
   */
  getMcpToolsInfo(): any {
    return {
      status: this.mcpService.getStatus(),
      tools: this.mcpService.getAvailableMCPTools().map(tool => ({
        name: tool.function.name,
        description: tool.function.description,
        parameters: tool.function.parameters
      }))
    };
  }
}
