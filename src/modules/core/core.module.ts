import { Module, Global } from '@nestjs/common';
import { CacheService } from './services/cache.service';
import { McpService } from './services/mcp.service';
import { OpenAiService } from './services/openai.service';
import { SystemPromptUtil } from '../../common/utils/system-prompt.util';
import { KnowledgeBaseLoader } from '../../knowledge/knowledge-base-loader';
import { QueryComplexityAnalyzer } from '../../knowledge/query-complexity-analyzer';

@Global()
@Module({
  providers: [
    CacheService,
    McpService,
    OpenAiService,
    SystemPromptUtil,
    KnowledgeBaseLoader,
    QueryComplexityAnalyzer,
  ],
  exports: [
    CacheService,
    McpService,
    OpenAiService,
    SystemPromptUtil,
    KnowledgeBaseLoader,
    QueryComplexityAnalyzer,
  ],
})
export class CoreModule {}
