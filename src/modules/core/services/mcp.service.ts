import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { Cron, CronExpression } from '@nestjs/schedule';

export interface McpResponse {
  success: boolean;
  data?: any;
  error?: string;
  duration?: number;
}

export interface McpTool {
  function: {
    name: string;
    description: string;
    parameters: any;
  };
}

@Injectable()
export class McpService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(McpService.name);
  private isConnected = false;
  private mcpTools: McpTool[] = []; // Cache tools
  private readonly timeout: number;
  private readonly mcpServerUrl: string;
  private mcpClient: Client;

  constructor(private configService: ConfigService) {
    this.timeout = this.configService.get<number>('MCP_TIMEOUT', 30000);
    this.mcpServerUrl = this.configService.get<string>('MCP_SERVER_URL');
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async onModuleInit() {
    await this.initializeMcpServer();
  }

  async onModuleDestroy() {
    await this.cleanup();
  }

  /**
   * Initialize MCP server
   */
  private async initializeMcpServer(): Promise<void> {
    try {
      this.logger.log('Initializing MCP server connection...');
      this.logger.log(`Connecting to MCP server at ${this.mcpServerUrl}`);
      
      // Initialize MCP client
      this.mcpClient = new Client({ name: "pho-agent", version: "1.0.0" });
      await this.mcpClient.connect(new StreamableHTTPClientTransport(new URL(this.mcpServerUrl)));
      
      // Get available tools
      const { tools } = await this.mcpClient.listTools();
      
      // Cache tools
      this.mcpTools = tools.map(tool => ({
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters
        }
      }));
      
      this.logger.log(`Successfully connected to MCP server and loaded ${this.mcpTools.length} tools`);
      this.isConnected = true;
    } catch (error) {
      this.logger.error('Failed to initialize MCP server connection:', error);
      this.isConnected = false;
    }
  }

  /**
   * Call MCP tool
   */
  async callTool(toolName: string, args: any): Promise<McpResponse> {
    const startTime = Date.now();

    try {
      if (!this.isConnected || !this.mcpClient) {
        throw new Error('MCP server is not connected');
      }

      this.logger.debug(`Calling MCP tool: ${toolName}`, { args });

      // Format tool call arguments correctly
      const toolCallParams = {
        name: toolName,
        arguments: args
      };

      this.logger.debug(`Sending tool call to MCP server:`, toolCallParams);

      // Call tool using MCP client
      const result = await this.mcpClient.callTool(toolCallParams);

      this.logger.log('MCP tool response received', {
        toolName,
        hasResult: !!result,
        resultKeys: result ? Object.keys(result) : []
      });

      // Debug: Log detailed response for search_properties
      if (toolName === 'search_properties') {
        this.logger.log('search_properties detailed response', {
          toolName,
          args,
          response: JSON.stringify(result, null, 2).substring(0, 1000)
        });
      }

      const response = {
        success: true,
        data: result,
        error: undefined
      };

      const duration = Date.now() - startTime;

      this.logger.debug(`MCP tool ${toolName} completed`, {
        success: response.success,
        duration
      });

      return {
        ...response,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`MCP tool ${toolName} failed:`, error);

      return {
        success: false,
        error: error.message,
        duration,
      };
    }
  }

  /**
   * Get available tools - Query real MCP server with retry for missing parameters
   */
  async getAvailableTools(): Promise<McpTool[]> {
    try {
      if (!this.isConnected || !this.mcpClient) {
        this.logger.warn('MCP server not connected, returning empty tools list');
        return [];
      }

      // Query MCP server for tools list
      const { tools } = await this.mcpClient.listTools();

      if (tools && Array.isArray(tools)) {
        const formattedTools = tools.map(tool => {
          // Validate tool parameters
          let parameters = tool.parameters;

          if (!parameters || (typeof parameters === 'object' && Object.keys(parameters).length === 0)) {
            this.logger.warn('Tool has missing or empty parameters', {
              toolName: tool.name,
              hasParameters: !!parameters,
              parametersType: typeof parameters,
              parametersKeys: parameters ? Object.keys(parameters) : []
            });

            // Keep original parameters even if empty - don't override
            // This allows the super-agent service to handle the fallback
          }

          return {
            name: tool.name,
            description: tool.description,
            inputSchema: parameters,
            function: {
              name: tool.name,
              description: tool.description,
              parameters: parameters
            }
          };
        });

        this.logger.log('Parsed MCP tools', {
          toolCount: formattedTools.length,
          toolNames: formattedTools.map(t => t.name)
        });

        // Cache tools
        this.mcpTools = formattedTools;

        // Debug: Log tools with missing parameters
        const toolsWithMissingParams = formattedTools.filter(t =>
          !t.function?.parameters ||
          (typeof t.function.parameters === 'object' && Object.keys(t.function.parameters).length === 0)
        );

        if (toolsWithMissingParams.length > 0) {
          this.logger.warn('Tools with missing/empty parameters detected', {
            count: toolsWithMissingParams.length,
            toolNames: toolsWithMissingParams.map(t => t.function?.name)
          });
        }

        return formattedTools;
      }

      this.logger.warn('No tools found in MCP response, using fallback');
      return [];
    } catch (error) {
      this.logger.error('Failed to get available tools:', error);
      return [];
    }
  }

  /**
   * Get available MCP tools (synchronous, cached)
   */
  getAvailableMCPTools(): McpTool[] {
    return this.mcpTools;
  }

  /**
   * Validate connection
   */
  async validateConnection(): Promise<boolean> {
    try {
      if (!this.isConnected) {
        await this.initializeMcpServer();
      }
      return this.isConnected;
    } catch (error) {
      this.logger.error('Connection validation failed:', error);
      return false;
    }
  }

  /**
   * Get connection status
   */
  getStatus(): { connected: boolean; serverUrl: string } {
    return {
      connected: this.isConnected,
      serverUrl: this.mcpServerUrl,
    };
  }

  /**
   * Cleanup resources
   */
  private async cleanup(): Promise<void> {
    this.logger.log('Cleaning up MCP server connection...');
    this.isConnected = false;
    this.mcpClient = null;
  }
}
