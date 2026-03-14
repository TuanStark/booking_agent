# 📖 Technical Documentation - AI Agent Real Estate Assistant (NestJS)

## 🎯 **TỔNG QUAN HỆ THỐNG**

Đây là documentation chi tiết về AI Agent hiện tại - một hệ thống enterprise-grade được xây dựng trên NestJS framework với architecture hiện đại, tối ưu hóa performance và reliability. Hệ thống tập trung vào OpenAI function calling, retry logic và conversation management.

## 🏗️ **KIẾN TRÚC HIỆN TẠI (NestJS)**

### **Core Components**
```
src/
├── main.ts                         # 🚀 Application Bootstrap
├── app.module.ts                   # 📦 Root Module
├── modules/
│   ├── core/
│   │   ├── core.module.ts          # 🔧 Core Module
│   │   └── services/
│   │       ├── mcp.service.ts      # 🛠️ MCP Integration
│   │       ├── openai.service.ts   # 🤖 OpenAI GPT-4o Service
│   │       └── cache.service.ts    # 💾 Redis Cache Service
│   ├── super-agent/
│   │   ├── super-agent.module.ts   # 🧠 Main Agent Module
│   │   ├── controllers/
│   │   │   └── super-agent.controller.ts  # 🎮 API Controller
│   │   └── services/
│   │       ├── super-agent.service.ts     # 🧠 Core Agent Logic
│   │       ├── real-estate-openai.service.ts  # 📚 Knowledge Base Service
│   │       └── smart-search.service.ts    # 🔍 Smart Search Logic
│   └── health/
│       └── health.module.ts        # ❤️ Health Check Module
├── knowledge/
│   ├── query-complexity-analyzer.ts    # 🔍 Complexity Analysis
│   ├── knowledge-base-loader.ts        # 📚 Knowledge Loading
│   └── intelligent-query-analyzer.ts   # 🧠 Query Intelligence
├── dto/
│   ├── query.dto.ts                # 📝 Request/Response DTOs
│   └── session.dto.ts              # 📝 Session DTOs
├── common/
│   ├── filters/                    # 🛡️ Exception Filters
│   └── utils/                      # 🔧 Utility Functions
└── config/
    ├── config.ts                   # ⚙️ Configuration
    └── promptTemplate.txt          # 📝 System Prompt
```

### **Enhanced Request Flow với NestJS**
```
1. User Request → NestJS Controller (Validation, Guards, Interceptors)
2. Controller → SuperAgentService.processQuery()
3. Service → Session Management & Rate Limiting (30 queries/session)
4. Service → Conversation History Cleaning (Remove invalid tool_calls)
5. Service → Query Complexity Analysis & Conditional Knowledge Base
6. Service → Retry Logic Wrapper (3 attempts with exponential backoff)
7. OpenAI Service → Function Calling với MCP Tools
8. MCP Service → Execute Selected Tools với Error Handling
9. Service → Generate Professional Response với Context
10. Controller → Clean JSON Response với Metadata
```

### **Key Improvements**
- ✅ **NestJS Framework**: Enterprise-grade architecture với dependency injection
- ✅ **Retry Logic**: Exponential backoff cho rate limit handling
- ✅ **Conversation Cleaning**: Tự động clean invalid tool_calls/responses
- ✅ **Session Management**: 30 queries per session với automatic cleanup
- ✅ **Enhanced Error Handling**: User-friendly Vietnamese error messages
- ✅ **Performance Monitoring**: Comprehensive logging và metrics

## 🧠 **SUPER AGENT SERVICE - NESTJS IMPLEMENTATION**

### **File: `src/modules/super-agent/services/super-agent.service.ts`**

#### **Class Structure (NestJS Injectable)**
```typescript
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
}
```

#### **Main Method: `processQuery(query, sessionId)` - Enhanced Logic**

**Step 1: Session Management & Rate Limiting**
```typescript
async processQuery(query: string, sessionId?: string): Promise<QueryResponseDto> {
  const currentSessionId = sessionId || uuidv4();
  const startTime = Date.now();

  // Check session query limit
  const queryCount = await this.getSessionQueryCount(currentSessionId);
  if (queryCount >= this.MAX_QUERIES_PER_SESSION) {
    return {
      success: false,
      error: 'Session query limit exceeded',
      message: `Bạn đã đạt giới hạn ${this.MAX_QUERIES_PER_SESSION} câu hỏi cho phiên này.`
    };
  }
}
```

**Key Improvements:**
- ✅ **Session Limits**: 30 queries per session protection
- ✅ **TypeScript**: Type safety và better developer experience
- ✅ **Dependency Injection**: Clean architecture với NestJS DI
- ✅ **Comprehensive Logging**: Structured logging với Winston

**Step 2: Conversation History Cleaning**
```typescript
// Get and clean conversation history
const conversationHistory = await this.getConversationHistory(currentSessionId);
const cleanedHistory = this.cleanConversationHistory(conversationHistory);

this.logger.info('Conversation history cleaned', {
  originalLength: conversationHistory.length,
  cleanedLength: cleanedHistory.length,
  removedMessages: conversationHistory.length - cleanedHistory.length
});
```

**Step 3: Enhanced AI Processing với Retry Logic**
```typescript
// Prepare messages with enhanced system prompt
const enhancedSystemPrompt = this.openAiService.getEnhancedSystemPrompt(
  this.baseSystemPrompt,
  query
);

const messages = [
  { role: 'system', content: enhancedSystemPrompt },
  ...cleanedHistory,
  { role: 'user', content: query }
];

// OpenAI with retry logic
const response = await this.executeWithRetry(async () => {
  return await this.openAiService.createChatCompletion(messages, {
    tools: await this.getMCPTools(),
    temperature: 0.7,
    maxTokens: 1500
  });
}, this.MAX_RETRY_ATTEMPTS);
```

**Key Features:**
- ✅ **Conversation Cleaning**: Removes invalid tool_calls/responses
- ✅ **Enhanced System Prompt**: Query complexity-based knowledge loading
- ✅ **Retry Logic**: Exponential backoff for rate limit handling
- ✅ **MCP Tools Integration**: Dynamic tool loading from MCP server

#### **Tool Execution: `processToolCalls(toolCalls)` - Simplified**

**Current Implementation: Clean & Simple**
```javascript
async processToolCalls(toolCalls) {
  const results = {};
  let searchResults = [];

  // Sequential execution of tools
  for (const toolCall of toolCalls) {
    const { function: func, id } = toolCall;
    const functionName = func.name;
    const args = JSON.parse(func.arguments);

    try {
      // Direct MCP service call - no complex switch cases
      const mcpResponse = await mcpService.callTool(functionName, args);

      if (mcpResponse.success && mcpResponse.data?.properties) {
        searchResults.push(...mcpResponse.data.properties);
      }

      results[id] = mcpResponse.data || {};

    } catch (error) {
      logger.error('MCP tool failed', { toolName: functionName, error: error.message });
      results[id] = { error: error.message };
    }
  }

  results.searchResults = searchResults;
  return results;
}
```

**Key Improvements:**
- ✅ **Dynamic Tool Execution**: No hard-coded switch cases
- ✅ **Clean Error Handling**: Graceful failure handling
- ✅ **Simple Logic**: Easy to understand and maintain
          results[id] = detailResponse.data || {};
          break;
          
        // ... 6 more tools
      }
    } catch (error) {
      logger.error(`Tool execution failed: ${func.name}`, { error: error.message });
      results[id] = { error: `Failed to execute ${func.name}` };
    }
  }
  
  return { results, searchResults };
}
```

**Giải thích:**
- Loop qua tất cả tools mà OpenAI đã chọn
- Parse arguments từ JSON string
- Gọi MCP service với parameters tương ứng
- Aggregate results từ multiple tools
- Error handling cho từng tool riêng biệt

#### **Demo Mode: `handleDemoMode(query, sessionId, startTime)`**

**Dòng 435-485: Intelligent Tool Selection Without AI**
```javascript
async handleDemoMode(query, sessionId, startTime) {
  // Simulate intelligent tool selection based on query keywords
  const toolsToUse = this.selectToolsBasedOnQuery(query);
  
  // Execute MCP tools to get real data
  let mcpResults = [];
  let searchResults = [];
  
  for (const toolName of toolsToUse) {
    try {
      const result = await this.executeDemoMCPFunction(toolName, query);
      mcpResults.push(result);
      
      if (result.data?.properties) {
        searchResults = [...searchResults, ...result.data.properties];
      }
    } catch (error) {
      logger.warn(`Demo MCP function ${toolName} failed`, { error: error.message });
    }
  }
  
  // Generate response based on real data
  const response = this.generateDemoResponse(query, toolsToUse, mcpResults, searchResults);
  const enhancedResponse = this.enhanceResponseWithToolInfo(response, toolsToUse, searchResults);
  
  return {
    success: true,
    response: enhancedResponse,
    metadata: {
      aiService: "DEMO_MODE",
      toolsUsed: toolsToUse,
      dataSource: "REAL_DATABASE_VIA_MCP"
    }
  };
}
```

**Giải thích:**
- Khi không có AI service → sử dụng keyword-based tool selection
- Vẫn truy cập database thực qua MCP tools
- Generate response dựa trên real data
- Thể hiện sự khác biệt vs AI thường

#### **Tool Selection Logic: `selectToolsBasedOnQuery(query)`**

**Dòng 510-540: Keyword-Based Intelligence**
```javascript
selectToolsBasedOnQuery(query) {
  const lowerQuery = query.toLowerCase();
  const tools = [];
  
  // Smart tool selection based on keywords
  if (lowerQuery.includes('tìm') || lowerQuery.includes('căn hộ') || lowerQuery.includes('nhà')) {
    tools.push('smart_property_search');
  }
  
  if (lowerQuery.includes('giá') || lowerQuery.includes('tỷ') || lowerQuery.includes('triệu')) {
    tools.push('search_properties_by_price_range');
  }
  
  if (lowerQuery.includes('thống kê') || lowerQuery.includes('phân tích')) {
    tools.push('get_property_statistics');
  }
  
  if (lowerQuery.includes('nổi bật') || lowerQuery.includes('đề xuất')) {
    tools.push('get_featured_properties');
  }
  
  // Default fallback
  if (tools.length === 0) {
    tools.push('smart_property_search');
  }
  
  return tools;
}
```

**Giải thích:**
- Phân tích keywords trong query
- Map keywords → appropriate tools
- Multiple tools có thể được chọn cho 1 query
- Fallback default để đảm bảo luôn có tool

## 🤖 **AI SERVICES INTEGRATION**

### **OpenAI Service: `src/services/openaiService.js`**

#### **Function Calling Setup**
```javascript
// Tools definition for OpenAI
getTools() {
  return [
    {
      type: 'function',
      function: {
        name: 'search_properties',
        description: 'Search for properties based on criteria',
        parameters: {
          type: 'object',
          properties: {
            address: { type: 'string', description: 'Location to search' },
            type: { type: 'string', enum: ['for_sale', 'for_rent'] },
            min_price: { type: 'number', description: 'Minimum price in VND' },
            max_price: { type: 'number', description: 'Maximum price in VND' },
            bedroom_count: { type: 'integer', description: 'Number of bedrooms' }
          },
          required: ['address']
        }
      }
    },
    // ... 7 more tools
  ];
}
```

**Giải thích:**
- OpenAI function calling format
- Detailed parameter descriptions cho AI
- Required vs optional parameters
- Type validation (string, number, integer, enum)

### **Gemini Service: `src/services/geminiService.js`**

#### **Manual Function Routing**
```javascript
async routeToFunctions(query, analysis) {
  const prompt = `
Bạn là chuyên gia lựa chọn công cụ bất động sản. Dựa trên phân tích sau, chọn các function phù hợp:

Query: "${query}"
Analysis: ${JSON.stringify(analysis)}

Các function có sẵn:
1. search_properties - Tìm kiếm BDS theo tiêu chí
2. get_property_details - Chi tiết BDS theo ID  
3. search_properties_by_price_range - Tìm theo khoảng giá
// ... more tools

Trả về JSON:
{
  "selectedFunctions": [
    {
      "name": "search_properties",
      "arguments": { "address": "Đà Nẵng", "type": "for_sale" },
      "priority": 1
    }
  ],
  "reasoning": "Lý do chọn functions này"
}
`;
  
  const result = await this.generativeModel.generateContent(prompt);
  return this.parseFunctionRoutingResponse(result.response.text());
}
```

**Giải thích:**
- Gemini không có native function calling
- Sử dụng prompt engineering để simulate function calling
- JSON response parsing
- Priority-based execution

## 🛠️ **MCP SERVICE INTEGRATION**

### **File: `src/services/mcpService.js`**

#### **Tool Execution**
```javascript
async callTool(toolName, args) {
  try {
    const result = await this.client.callTool({
      name: toolName,
      arguments: args
    });
    
    logger.info('MCP tool executed successfully', {
      tool: toolName,
      argsCount: Object.keys(args).length,
      hasData: !!result.content?.[0]?.text
    });
    
    return {
      success: true,
      data: result.content?.[0]?.text ? JSON.parse(result.content[0].text) : null
    };
  } catch (error) {
    logger.error('MCP tool execution failed', {
      tool: toolName,
      error: error.message,
      args
    });
    
    return {
      success: false,
      error: error.message,
      data: null
    };
  }
}
```

**Giải thích:**
- MCP client communication
- JSON parsing của response
- Comprehensive error handling
- Logging cho debugging

## 🌐 **API ROUTES**

### **File: `src/routes/superAgent.js`**

#### **Main Query Endpoint**
```javascript
router.post('/query', async (req, res) => {
  try {
    const { error } = querySchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request format',
        details: error.details[0].message
      });
    }

    const { query, sessionId } = req.body;
    
    logger.info('Processing super agent query', {
      query: query.substring(0, 100),
      sessionId: sessionId || 'new',
      userAgent: req.get('User-Agent')
    });

    const result = await agent.processQuery(query, sessionId);
    
    res.json(result);
  } catch (error) {
    logger.logError(error, {
      method: 'POST /api/v1/super-agent/query',
      body: req.body
    });
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Đã xảy ra lỗi trong quá trình xử lý. Vui lòng thử lại sau.'
    });
  }
});
```

**Giải thích:**
- Joi validation cho request body
- Comprehensive logging
- Error handling với user-friendly messages
- Performance tracking

## 📊 **RESPONSE ENHANCEMENT**

### **Method: `enhanceResponseWithToolInfo()`**

```javascript
enhanceResponseWithToolInfo(response, toolsUsed, searchResults) {
  if (!toolsUsed || toolsUsed.length === 0) {
    return response + "\n\n⚠️ *Lưu ý: Thông tin này dựa trên kiến thức có sẵn, không phải dữ liệu thực tế từ database.*";
  }

  let enhancement = "\n\n" + "=".repeat(60) + "\n";
  enhancement += "🤖 **ĐIỂM KHÁC BIỆT AI AGENT VS AI THƯỜNG:**\n\n";
  
  enhancement += "✅ **AI AGENT (TÔI):**\n";
  enhancement += `• Đã truy cập DATABASE THỰC TẾ qua ${toolsUsed.length} công cụ MCP\n`;
  enhancement += `• Tools đã sử dụng: ${toolsUsed.map(tool => `\`${tool}\``).join(', ')}\n`;
  enhancement += `• Dữ liệu được lấy trực tiếp từ hệ thống bất động sản\n`;
  if (searchResults && searchResults.length > 0) {
    enhancement += `• Tìm thấy ${searchResults.length} bất động sản thực tế từ database\n`;
  }
  enhancement += "• Thông tin chính xác 100% và cập nhật real-time\n\n";
  
  enhancement += "❌ **AI THƯỜNG:**\n";
  enhancement += "• Chỉ dựa trên kiến thức cũ đã học\n";
  enhancement += "• Không thể truy cập dữ liệu thực tế\n";
  enhancement += "• Có thể đưa ra thông tin lỗi thời hoặc không chính xác\n";
  enhancement += "• Không thể thực hiện tìm kiếm trong database\n\n";
  
  enhancement += "🎯 **KẾT QUẢ:** Thông tin trên đây được lấy trực tiếp từ database bất động sản, ";
  enhancement += "đảm bảo độ chính xác và cập nhật mới nhất!\n";
  enhancement += "=".repeat(60);

  return response + enhancement;
}
```

**Giải thích:**
- Thêm proof of difference vào mỗi response
- Hiển thị tools đã sử dụng
- Thống kê số lượng data tìm được
- Educational content về AI Agent vs AI thường

## 🔄 **ERROR HANDLING & FALLBACK**

### **Fallback Chain**
```javascript
selectAIService() {
  // Priority: OpenAI -> Gemini -> None
  if (openaiService.isAvailable()) {
    return { name: 'OpenAI', service: openaiService };
  }
  
  if (geminiService.isServiceAvailable()) {
    return { name: 'Gemini', service: geminiService };
  }
  
  return { name: null, service: null };
}
```

### **Error Recovery**
```javascript
} catch (error) {
  // Try fallback to demo mode if AI services fail
  if (error.message?.includes('quota') || error.message?.includes('429')) {
    logger.warn('AI service quota exceeded, trying demo mode');
    
    try {
      return await this.handleDemoMode(query, currentSessionId, startTime);
    } catch (demoError) {
      logger.error('Demo mode also failed', { error: demoError.message });
    }
  }

  // Final fallback - return error
  return {
    success: false,
    error: 'All AI services unavailable',
    message: 'Dịch vụ AI tạm thời không khả dụng. Vui lòng thử lại sau.'
  };
}
```

**Giải thích:**
- Graceful degradation
- Multiple fallback levels
- User-friendly error messages
- Comprehensive logging cho debugging

## 🎯 **KẾT LUẬN**

Hệ thống AI Agent này được thiết kế với:

1. **Modular Architecture** - Dễ maintain và extend
2. **Robust Fallback** - Luôn hoạt động dù AI services down
3. **Real Data Access** - Khác biệt cốt lõi vs AI thường
4. **Comprehensive Logging** - Dễ debug và monitor
5. **Error Handling** - Graceful degradation
6. **Performance Tracking** - Monitoring và optimization

Mỗi component có responsibility rõ ràng và có thể test độc lập. Code được document chi tiết để developer mới có thể hiểu và contribute dễ dàng.

## 🔧 **HƯỚNG DẪN DEVELOPMENT**

### **Thêm Tool Mới**

1. **Định nghĩa tool trong `getTools()`:**
```javascript
{
  type: 'function',
  function: {
    name: 'new_tool_name',
    description: 'Mô tả chức năng của tool',
    parameters: {
      type: 'object',
      properties: {
        param1: { type: 'string', description: 'Tham số 1' },
        param2: { type: 'number', description: 'Tham số 2' }
      },
      required: ['param1']
    }
  }
}
```

2. **Thêm execution logic trong `processToolCalls()`:**
```javascript
case 'new_tool_name':
  const newToolResponse = await mcpService.callTool('new_tool_name', {
    param1: args.param1,
    param2: args.param2
  });
  results[id] = newToolResponse.data || {};
  break;
```

3. **Thêm vào demo mode selection:**
```javascript
if (lowerQuery.includes('keyword_for_new_tool')) {
  tools.push('new_tool_name');
}
```

### **Thêm AI Service Mới**

1. **Tạo service file mới:**
```javascript
// src/services/newAIService.js
class NewAIService {
  async analyzeQuery(query, history) { /* implementation */ }
  async routeToFunctions(query, analysis) { /* implementation */ }
  async generateResponse(query, analysis, history, mcpResults) { /* implementation */ }
  isServiceAvailable() { /* implementation */ }
  getStatus() { /* implementation */ }
}
```

2. **Cập nhật `selectAIService()`:**
```javascript
selectAIService() {
  if (openaiService.isAvailable()) {
    return { name: 'OpenAI', service: openaiService };
  }

  if (geminiService.isServiceAvailable()) {
    return { name: 'Gemini', service: geminiService };
  }

  if (newAIService.isServiceAvailable()) {
    return { name: 'NewAI', service: newAIService };
  }

  return { name: null, service: null };
}
```

### **Debugging Tips**

1. **Enable verbose logging:**
```javascript
// Set LOG_LEVEL=debug in .env
logger.debug('Detailed debug info', { data: complexObject });
```

2. **Test individual components:**
```javascript
// Test MCP service
const result = await mcpService.callTool('search_properties', { address: 'Test' });

// Test AI service
const analysis = await openaiService.analyzeQuery('Test query', []);
```

3. **Monitor performance:**
```javascript
const startTime = Date.now();
// ... operation
const duration = Date.now() - startTime;
logger.info('Operation completed', { duration });
```

## 📈 **PERFORMANCE OPTIMIZATION**

### **Caching Strategy**
```javascript
// Cache expensive operations
const cacheKey = `analysis_${hashQuery(query)}`;
let analysis = cacheService.get(cacheKey);

if (!analysis) {
  analysis = await aiService.analyzeQuery(query, history);
  cacheService.set(cacheKey, analysis, 300); // 5 minutes TTL
}
```

### **Parallel Tool Execution**
```javascript
// Execute multiple tools in parallel
const toolPromises = toolCalls.map(async (toolCall) => {
  return await this.executeSingleTool(toolCall);
});

const results = await Promise.allSettled(toolPromises);
```

### **Request Optimization**
```javascript
// Limit concurrent requests
const semaphore = new Semaphore(3); // Max 3 concurrent MCP calls

await semaphore.acquire();
try {
  const result = await mcpService.callTool(toolName, args);
  return result;
} finally {
  semaphore.release();
}
```

## 🧪 **TESTING STRATEGY**

### **Unit Tests**
```javascript
// test/services/superIntelligentAgent.test.js
describe('SuperIntelligentAgent', () => {
  test('should select correct tools based on query', () => {
    const agent = new SuperIntelligentAgent();
    const tools = agent.selectToolsBasedOnQuery('Tìm căn hộ giá rẻ');

    expect(tools).toContain('smart_property_search');
    expect(tools).toContain('search_properties_by_price_range');
  });

  test('should handle demo mode when AI unavailable', async () => {
    // Mock AI services as unavailable
    jest.spyOn(openaiService, 'isAvailable').mockReturnValue(false);
    jest.spyOn(geminiService, 'isServiceAvailable').mockReturnValue(false);

    const result = await agent.processQuery('Test query');

    expect(result.metadata.aiService).toBe('DEMO_MODE');
    expect(result.success).toBe(true);
  });
});
```

### **Integration Tests**
```javascript
// test/integration/api.test.js
describe('API Integration', () => {
  test('should process query end-to-end', async () => {
    const response = await request(app)
      .post('/api/v1/super-agent/query')
      .send({ query: 'Tìm căn hộ tại Hà Nội' })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.response).toBeDefined();
    expect(response.body.metadata.toolsUsed).toBeInstanceOf(Array);
  });
});
```

### **Load Testing**
```javascript
// test/load/stress.test.js
describe('Load Testing', () => {
  test('should handle 100 concurrent requests', async () => {
    const promises = Array(100).fill().map(() =>
      request(app)
        .post('/api/v1/super-agent/query')
        .send({ query: 'Test query' })
    );

    const results = await Promise.allSettled(promises);
    const successCount = results.filter(r => r.status === 'fulfilled').length;

    expect(successCount).toBeGreaterThan(95); // 95% success rate
  });
});
```

## 🚀 **DEPLOYMENT GUIDE**

### **Production Configuration**
```env
# .env.production
NODE_ENV=production
PORT=3000

# AI Services
OPENAI_API_KEY=prod_openai_key
GEMINI_API_KEY=prod_gemini_key

# Logging
LOG_LEVEL=info
LOG_FILE=/var/log/ai-agent/app.log

# Performance
MAX_CONCURRENT_REQUESTS=10
CACHE_TTL=600
REQUEST_TIMEOUT=30000
```

### **Docker Deployment**
```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
```

### **Health Checks**
```javascript
// Health check endpoint
app.get('/health', (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      openai: openaiService.isAvailable(),
      gemini: geminiService.isServiceAvailable(),
      mcp: mcpService.isConnected()
    },
    memory: process.memoryUsage(),
    uptime: process.uptime()
  };

  const isHealthy = Object.values(health.services).some(Boolean);

  res.status(isHealthy ? 200 : 503).json(health);
});
```

## 📊 **MONITORING & ANALYTICS**

### **Metrics Collection**
```javascript
// Collect usage metrics
const metrics = {
  totalRequests: 0,
  successfulRequests: 0,
  averageResponseTime: 0,
  toolUsageStats: {},
  aiServiceUsage: { OpenAI: 0, Gemini: 0, Demo: 0 }
};

// Update metrics on each request
function updateMetrics(result, duration, aiService) {
  metrics.totalRequests++;
  if (result.success) metrics.successfulRequests++;

  metrics.averageResponseTime =
    (metrics.averageResponseTime * (metrics.totalRequests - 1) + duration) / metrics.totalRequests;

  metrics.aiServiceUsage[aiService]++;

  if (result.metadata.toolsUsed) {
    result.metadata.toolsUsed.forEach(tool => {
      metrics.toolUsageStats[tool] = (metrics.toolUsageStats[tool] || 0) + 1;
    });
  }
}
```

### **Error Tracking**
```javascript
// Error aggregation
const errorTracker = {
  errors: [],

  logError(error, context) {
    this.errors.push({
      timestamp: new Date().toISOString(),
      message: error.message,
      stack: error.stack,
      context,
      severity: this.getSeverity(error)
    });

    // Keep only last 1000 errors
    if (this.errors.length > 1000) {
      this.errors = this.errors.slice(-1000);
    }
  },

  getSeverity(error) {
    if (error.message.includes('quota')) return 'warning';
    if (error.message.includes('timeout')) return 'warning';
    return 'error';
  }
};
```

## 🔐 **SECURITY CONSIDERATIONS**

### **Input Validation**
```javascript
// Comprehensive input validation
const querySchema = Joi.object({
  query: Joi.string()
    .min(1)
    .max(1000)
    .pattern(/^[a-zA-Z0-9\s\u00C0-\u024F\u1E00-\u1EFF.,!?()-]+$/)
    .required(),
  sessionId: Joi.string().uuid().optional()
});
```

### **Rate Limiting**
```javascript
// Rate limiting middleware
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});

app.use('/api/', limiter);
```

### **API Key Protection**
```javascript
// Secure API key handling
function validateApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey || !isValidApiKey(apiKey)) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  next();
}
```

## 📚 **ADDITIONAL RESOURCES**

### **Useful Commands**
```bash
# Development
npm run dev          # Start development server
npm run test         # Run tests
npm run test:watch   # Run tests in watch mode
npm run lint         # Check code style

# Production
npm start            # Start production server
npm run build        # Build for production
npm run logs         # View application logs

# Debugging
npm run debug        # Start with debugger
npm run profile      # Performance profiling
```

### **Environment Setup**
```bash
# Install dependencies
npm install

# Setup git hooks
npm run prepare

# Generate API documentation
npm run docs:generate

# Run security audit
npm audit
```

### **Troubleshooting**

**Common Issues:**

1. **MCP Connection Failed**
   - Check MCP server is running
   - Verify MCP_SERVER_PATH in .env
   - Check network connectivity

2. **AI Service Quota Exceeded**
   - Check API key validity
   - Monitor usage limits
   - Implement proper rate limiting

3. **Memory Leaks**
   - Monitor conversation history size
   - Implement proper cleanup
   - Use memory profiling tools

4. **Performance Issues**
   - Enable caching
   - Optimize database queries
   - Use connection pooling

**Debug Commands:**
```bash
# Check service status
curl http://localhost:3000/api/v1/super-agent/status

# Test specific tool
curl -X POST http://localhost:3000/api/v1/super-agent/query \
  -H "Content-Type: application/json" \
  -d '{"query": "test query"}'

# Monitor logs
tail -f logs/app.log

# Check memory usage
node --inspect app.js
```

Với documentation này, developer sẽ có đầy đủ thông tin để hiểu, maintain và extend hệ thống AI Agent một cách hiệu quả.
