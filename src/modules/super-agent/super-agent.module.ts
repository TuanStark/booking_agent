import { Module } from '@nestjs/common';
import { SuperAgentController } from './controllers/super-agent.controller';
import { SuperAgentService } from './services/super-agent.service';
import { DormitoryOpenAIService } from './services/dormitory-openai.service';
import { KnowledgeBaseLoader } from '../../knowledge/knowledge-base-loader';
import { QueryComplexityAnalyzer } from '../../knowledge/query-complexity-analyzer';
import { SystemPromptUtil } from '../../common/utils/system-prompt.util';

@Module({
  controllers: [SuperAgentController],
  providers: [
    SuperAgentService,
    DormitoryOpenAIService,
    KnowledgeBaseLoader,
    QueryComplexityAnalyzer,
    SystemPromptUtil
  ],
  exports: [
    SuperAgentService,
    DormitoryOpenAIService,
    KnowledgeBaseLoader,
    QueryComplexityAnalyzer,
    SystemPromptUtil
  ],
})
export class SuperAgentModule { }
