import { Injectable, Logger } from '@nestjs/common';
import { PROMPT_TEMPLATE } from '../../config/prompt-template';
import { DORMITORY_PROMPT } from '../../config/dormitory-prompt';
import { SAVE_INFO_USER_PROMPT } from '../../config/save-info-user-promt';
import { McpService } from '../../modules/core/services/mcp.service';

@Injectable()
export class SystemPromptUtil {
  private readonly logger = new Logger(SystemPromptUtil.name);

  constructor(private readonly mcpService: McpService) { }

  getSystemPrompt(): string {
    try {
      // Use imported TypeScript constant instead of reading file
      const promptTemplate = PROMPT_TEMPLATE;
      this.logger.log('Loaded prompt template from TypeScript import');

      // Use cached tools like Express
      const availableTools = this.mcpService.getAvailableMCPTools();
      const toolCount = availableTools ? availableTools.length : 0;

      const toolsList = availableTools
        ? availableTools
          .map((tool, index) => `${index + 1}. ${tool.function?.name || 'Unknown'} - ${tool.function?.description || 'No description'}`)
          .join('\n')
        : 'Đang tải tools từ MCP server...';

      // Ghép nối prompt chính với prompt BĐS Nhà Phố
      const fullPrompt = promptTemplate
        .replace('{{toolCount}}', toolCount.toString())
        .replace('{{toolsList}}', toolsList) + DORMITORY_PROMPT + SAVE_INFO_USER_PROMPT;

      this.logger.log('System prompt assembled with Dormitory information', {
        mainPromptLength: promptTemplate.length,
        bdsPromptLength: DORMITORY_PROMPT.length,
        saveInfoPromptLength: SAVE_INFO_USER_PROMPT.length,
        totalLength: fullPrompt.length,
        toolCount
      });

      return fullPrompt;
    } catch (error) {
      this.logger.error('Failed to load system prompt', { error: error.message });
      return null;
    }
  }
}
