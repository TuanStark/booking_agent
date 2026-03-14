# 👨‍💻 Developer Guide - AI Agent Real Estate Assistant (NestJS)

## 🎯 **OVERVIEW FOR DEVELOPERS**

Đây là hướng dẫn cho developers về hệ thống AI Agent enterprise-grade được xây dựng trên NestJS framework. Hệ thống tập trung vào reliability, scalability và maintainability với architecture hiện đại.

## 🏗️ **KIẾN TRÚC HIỆN TẠI (NESTJS)**

```
📱 Client Request
    ↓
🌐 NestJS Controller (Guards, Pipes, Interceptors)
    ↓
🎮 SuperAgentController (Validation, Error Handling)
    ↓
🧠 SuperAgentService (Core Business Logic)
    ↓
📝 Session Management (30 queries limit, Redis cache)
    ↓
🧹 Conversation History Cleaning (Remove invalid tool_calls)
    ↓
🔍 Query Complexity Analysis (Conditional Knowledge Base)
    ↓
🔄 Retry Logic Wrapper (Exponential backoff, 3 attempts)
    ↓
🤖 OpenAI Service (GPT-4o with function calling)
    ↓
🛠️ MCP Service (Tool execution with error handling)
    ↓
🏠 Real Estate Database (Live data via MCP tools)
    ↓
💬 Enhanced Response Generation (Professional, contextual)
```

## 🔄 **KEY IMPROVEMENTS**

- ✅ **NestJS Framework**: Enterprise-grade architecture với dependency injection
- ✅ **Retry Logic**: Exponential backoff cho rate limit handling
- ✅ **Conversation Cleaning**: Tự động clean invalid tool_calls/responses
- ✅ **Session Management**: 30 queries per session với Redis caching
- ✅ **Enhanced Error Handling**: User-friendly Vietnamese error messages
- ✅ **TypeScript**: Type safety và better developer experience
- ✅ **Comprehensive Logging**: Winston với structured logging

## 🚀 **QUICK START**

### **1. Environment Setup**
```bash
# Clone repository
git clone <repo-url>
cd AI-Agent

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with your configuration:
# - OPENAI_API_KEY=your_openai_key
# - MCP_SERVER_URL=https://pho-mcp-server.crbgroup.live/mcp
# - NODE_ENV=development

# Start development server with watch mode
npm run dev
```

### **2. Test the System**
```bash
# Check system health
curl http://localhost:3000/api/v1/health

# Check super agent status
curl http://localhost:3000/api/v1/super-agent/status

# Test simple query
curl -X POST http://localhost:3000/api/v1/super-agent/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Tìm căn hộ tại Hải Châu", "sessionId": "550e8400-e29b-41d4-a716-446655440000"}'

# Test complex query
curl -X POST http://localhost:3000/api/v1/super-agent/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Tư vấn đầu tư bất động sản cho người mới", "sessionId": "550e8400-e29b-41d4-a716-446655440000"}'
```

## 🧠 **CORE COMPONENTS DEEP DIVE**

### **SuperAgentService (`src/modules/super-agent/services/super-agent.service.ts`)**

**Responsibility**: Orchestrate toàn bộ workflow từ session management đến response generation với enterprise-grade reliability.

**Key Methods:**

#### **`processQuery(query, sessionId)`**
```typescript
// Main entry point - xử lý query từ user với comprehensive error handling
async processQuery(query: string, sessionId?: string): Promise<QueryResponseDto> {
  // 1. Session management và rate limiting
  const currentSessionId = sessionId || uuidv4();
  const queryCount = await this.getSessionQueryCount(currentSessionId);

  if (queryCount >= this.MAX_QUERIES_PER_SESSION) {
    return this.createErrorResponse('Session query limit exceeded');
  }

  // 2. Get và clean conversation history
  const conversationHistory = await this.getConversationHistory(currentSessionId);
  const cleanedHistory = this.cleanConversationHistory(conversationHistory);

  // 3. Enhanced AI processing với retry logic
  return await this.executeWithRetry(async () => {
    return await this.processWithOpenAI(query, currentSessionId, cleanedHistory);
  }, this.MAX_RETRY_ATTEMPTS);
}
```

#### **`cleanConversationHistory(messages)`**
```typescript
// Two-pass algorithm để clean invalid tool_calls/responses
private cleanConversationHistory(messages: ChatMessage[]): ChatMessage[] {
  // Pass 1: Build tool_call map
  const toolCallMap = new Map<string, boolean>();

  messages.forEach(message => {
    if (message.role === 'assistant' && message.tool_calls) {
      message.tool_calls.forEach(toolCall => {
        toolCallMap.set(toolCall.id, true);
      });
    }
  });

  // Pass 2: Filter messages
  return messages.filter(message => {
    if (message.role === 'tool' && !toolCallMap.has(message.tool_call_id)) {
      return false; // Skip orphaned tool messages
    }
    return true;
  });
}
```

#### **`processToolCalls(toolCalls)`**
```javascript
// Execute multiple MCP tools and aggregate results
async processToolCalls(toolCalls) {
  const results = {};
  let searchResults = [];
  
  for (const toolCall of toolCalls) {
    const { id, function: func } = toolCall;
    const args = JSON.parse(func.arguments);
    
    try {
      // Route to appropriate MCP tool
      switch (func.name) {
        case 'search_properties':
          const response = await mcpService.queryProperties(args);
          results[id] = response.data || { properties: [] };
          break;
        // ... handle other 7 tools
      }
    } catch (error) {
      // Graceful error handling per tool
      results[id] = { error: `Failed to execute ${func.name}` };
    }
  }
  
  return { results, searchResults };
}
```

### **AI Services Integration**

#### **OpenAI Service (`src/services/openaiService.js`)**

**Function Calling Workflow:**
```javascript
// OpenAI automatically selects and calls tools
const response = await openaiService.client.chat.completions.create({
  model: 'gpt-4o',
  messages: [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: query }
  ],
  tools: this.getTools(),        // 8 MCP tools definition
  tool_choice: 'auto'            // Let AI decide which tools to use
});

// OpenAI returns tool_calls array
const toolCalls = response.choices[0].message.tool_calls;
```

#### **Gemini Service (`src/services/geminiService.js`)**

**Manual Routing Workflow:**
```javascript
// Step 1: Analyze query
const analysis = await geminiService.analyzeQuery(query, history);

// Step 2: Route to functions using prompt engineering
const functionRouting = await geminiService.routeToFunctions(query, analysis);

// Step 3: Execute selected functions manually
for (const func of functionRouting.selectedFunctions) {
  const result = await this.executeSingleMCPFunction(func.name, func.arguments);
}
```

#### **Demo Mode (Keyword-based Intelligence)**
```javascript
// When no AI service available, use keyword analysis
selectToolsBasedOnQuery(query) {
  const lowerQuery = query.toLowerCase();
  const tools = [];
  
  // Smart keyword mapping
  if (lowerQuery.includes('tìm') || lowerQuery.includes('căn hộ')) {
    tools.push('smart_property_search');
  }
  
  if (lowerQuery.includes('giá') || lowerQuery.includes('tỷ')) {
    tools.push('search_properties_by_price_range');
  }
  
  if (lowerQuery.includes('thống kê')) {
    tools.push('get_property_statistics');
  }
  
  return tools;
}
```

### **MCP Service (`src/services/mcpService.js`)**

**Tool Execution:**
```javascript
async callTool(toolName, args) {
  try {
    // Execute tool via MCP client
    const result = await this.client.callTool({
      name: toolName,
      arguments: args
    });
    
    // Parse and return structured data
    return {
      success: true,
      data: JSON.parse(result.content[0].text)
    };
  } catch (error) {
    // Handle tool execution errors
    return {
      success: false,
      error: error.message,
      data: null
    };
  }
}
```

## 🛠️ **ADDING NEW FEATURES**

### **Adding a New MCP Tool**

**Step 1: Define Tool Schema**
```javascript
// In getTools() method of SuperIntelligentAgent
{
  type: 'function',
  function: {
    name: 'get_property_valuation',
    description: 'Get property valuation and price estimation',
    parameters: {
      type: 'object',
      properties: {
        property_id: {
          type: 'string',
          description: 'Property ID to valuate'
        },
        valuation_type: {
          type: 'string',
          enum: ['market', 'investment', 'insurance'],
          description: 'Type of valuation'
        }
      },
      required: ['property_id']
    }
  }
}
```

**Step 2: Add Execution Logic**
```javascript
// In processToolCalls() method
case 'get_property_valuation':
  const valuationResponse = await mcpService.callTool('get_property_valuation', {
    property_id: args.property_id,
    valuation_type: args.valuation_type || 'market'
  });
  results[id] = valuationResponse.data || {};
  break;
```

**Step 3: Add to Demo Mode**
```javascript
// In selectToolsBasedOnQuery() method
if (lowerQuery.includes('định giá') || lowerQuery.includes('valuation')) {
  tools.push('get_property_valuation');
}
```

**Step 4: Add to Gemini Manual Routing**
```javascript
// In geminiService.js buildFunctionRoutingPrompt()
// Add tool description to available functions list
```

### **Adding a New AI Service**

**Step 1: Create Service Class**
```javascript
// src/services/claudeService.js
class ClaudeService {
  constructor() {
    this.client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });
    this.isAvailable = false;
  }
  
  async analyzeQuery(query, history) {
    // Implement query analysis
  }
  
  async routeToFunctions(query, analysis) {
    // Implement function routing
  }
  
  async generateResponse(query, analysis, history, mcpResults) {
    // Implement response generation
  }
  
  isServiceAvailable() {
    return this.isAvailable && !!this.client;
  }
  
  getStatus() {
    return {
      available: this.isAvailable,
      model: 'claude-3-sonnet',
      hasApiKey: !!process.env.CLAUDE_API_KEY
    };
  }
}
```

**Step 2: Update AI Service Selection**
```javascript
// In SuperIntelligentAgent.selectAIService()
selectAIService() {
  if (openaiService.isAvailable()) {
    return { name: 'OpenAI', service: openaiService };
  }
  
  if (claudeService.isServiceAvailable()) {
    return { name: 'Claude', service: claudeService };
  }
  
  if (geminiService.isServiceAvailable()) {
    return { name: 'Gemini', service: geminiService };
  }
  
  return { name: null, service: null };
}
```

**Step 3: Update Processing Logic**
```javascript
// In processQuery() method
if (aiService.name === 'OpenAI') {
  // OpenAI function calling
} else if (aiService.name === 'Claude') {
  // Claude processing
} else if (aiService.name === 'Gemini') {
  // Gemini processing
} else {
  // Demo mode
}
```

### **Adding Custom Response Enhancement**

```javascript
// Custom response formatter
enhanceResponseWithCustomInfo(response, toolsUsed, searchResults, customData) {
  let enhancement = "\n\n🎯 **CUSTOM ANALYSIS:**\n";
  
  if (customData.marketTrends) {
    enhancement += `📈 **Market Trends**: ${customData.marketTrends}\n`;
  }
  
  if (customData.investmentScore) {
    enhancement += `💰 **Investment Score**: ${customData.investmentScore}/10\n`;
  }
  
  if (customData.recommendations) {
    enhancement += `💡 **Recommendations**: ${customData.recommendations.join(', ')}\n`;
  }
  
  return response + enhancement;
}
```

## 🧪 **TESTING STRATEGIES**

### **Unit Testing**

**Test AI Service Selection:**
```javascript
// test/services/superIntelligentAgent.test.js
describe('AI Service Selection', () => {
  test('should select OpenAI when available', () => {
    jest.spyOn(openaiService, 'isAvailable').mockReturnValue(true);
    jest.spyOn(geminiService, 'isServiceAvailable').mockReturnValue(true);
    
    const agent = new SuperIntelligentAgent();
    const selected = agent.selectAIService();
    
    expect(selected.name).toBe('OpenAI');
  });
  
  test('should fallback to Gemini when OpenAI unavailable', () => {
    jest.spyOn(openaiService, 'isAvailable').mockReturnValue(false);
    jest.spyOn(geminiService, 'isServiceAvailable').mockReturnValue(true);
    
    const agent = new SuperIntelligentAgent();
    const selected = agent.selectAIService();
    
    expect(selected.name).toBe('Gemini');
  });
});
```

**Test Tool Selection:**
```javascript
describe('Tool Selection', () => {
  test('should select correct tools for property search', () => {
    const agent = new SuperIntelligentAgent();
    const tools = agent.selectToolsBasedOnQuery('Tìm căn hộ giá rẻ tại Hà Nội');
    
    expect(tools).toContain('smart_property_search');
    expect(tools).toContain('search_properties_by_price_range');
  });
  
  test('should select statistics tool for market analysis', () => {
    const agent = new SuperIntelligentAgent();
    const tools = agent.selectToolsBasedOnQuery('Phân tích thị trường BDS Đà Nẵng');
    
    expect(tools).toContain('get_property_statistics');
  });
});
```

### **Integration Testing**

**Test End-to-End Flow:**
```javascript
// test/integration/agent.test.js
describe('Agent Integration', () => {
  test('should process query end-to-end', async () => {
    const agent = new SuperIntelligentAgent();
    
    const result = await agent.processQuery('Tìm căn hộ tại Hà Nội');
    
    expect(result.success).toBe(true);
    expect(result.response).toBeDefined();
    expect(result.metadata.toolsUsed).toBeInstanceOf(Array);
    expect(result.metadata.dataSource).toBe('REAL_DATABASE_VIA_MCP');
  });
});
```

**Test MCP Integration:**
```javascript
describe('MCP Integration', () => {
  test('should execute MCP tools successfully', async () => {
    const result = await mcpService.callTool('search_properties', {
      address: 'Hà Nội',
      type: 'for_sale'
    });
    
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });
});
```

### **Load Testing**

```javascript
// test/load/performance.test.js
describe('Performance Testing', () => {
  test('should handle concurrent requests', async () => {
    const agent = new SuperIntelligentAgent();
    const promises = [];
    
    // Create 50 concurrent requests
    for (let i = 0; i < 50; i++) {
      promises.push(agent.processQuery(`Test query ${i}`));
    }
    
    const results = await Promise.allSettled(promises);
    const successCount = results.filter(r => 
      r.status === 'fulfilled' && r.value.success
    ).length;
    
    expect(successCount).toBeGreaterThan(45); // 90% success rate
  });
});
```

## 🔧 **DEBUGGING GUIDE**

### **Enable Debug Logging**
```javascript
// Set in .env
LOG_LEVEL=debug

// Or programmatically
logger.level = 'debug';
```

### **Common Debug Scenarios**

**1. AI Service Issues:**
```javascript
// Check AI service status
console.log('OpenAI Status:', openaiService.getStatus());
console.log('Gemini Status:', geminiService.getStatus());

// Test AI service directly
const analysis = await openaiService.analyzeQuery('test', []);
console.log('Analysis result:', analysis);
```

**2. MCP Tool Issues:**
```javascript
// Test MCP connection
console.log('MCP Connected:', mcpService.isConnected());

// Test individual tool
const result = await mcpService.callTool('search_properties', {
  address: 'test'
});
console.log('Tool result:', result);
```

**3. Tool Selection Issues:**
```javascript
// Debug tool selection logic
const agent = new SuperIntelligentAgent();
const tools = agent.selectToolsBasedOnQuery('your query here');
console.log('Selected tools:', tools);

// Debug OpenAI function calling
const response = await openaiService.client.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'test query' }],
  tools: agent.getTools(),
  tool_choice: 'auto'
});
console.log('OpenAI tool calls:', response.choices[0].message.tool_calls);
```

### **Performance Monitoring**

```javascript
// Add performance tracking
const startTime = Date.now();

// ... operation

const duration = Date.now() - startTime;
logger.info('Operation completed', {
  operation: 'processQuery',
  duration,
  query: query.substring(0, 50)
});
```

### **Memory Monitoring**

```javascript
// Monitor memory usage
setInterval(() => {
  const usage = process.memoryUsage();
  logger.debug('Memory usage', {
    rss: Math.round(usage.rss / 1024 / 1024) + 'MB',
    heapUsed: Math.round(usage.heapUsed / 1024 / 1024) + 'MB',
    heapTotal: Math.round(usage.heapTotal / 1024 / 1024) + 'MB'
  });
}, 30000); // Every 30 seconds
```

## 📊 **MONITORING & ANALYTICS**

### **Custom Metrics Collection**

```javascript
// src/utils/metrics.js
class MetricsCollector {
  constructor() {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      averageResponseTime: 0,
      toolUsageStats: {},
      aiServiceUsage: {}
    };
  }
  
  recordRequest(result, duration, aiService, toolsUsed) {
    this.metrics.totalRequests++;
    
    if (result.success) {
      this.metrics.successfulRequests++;
    }
    
    // Update average response time
    this.metrics.averageResponseTime = 
      (this.metrics.averageResponseTime * (this.metrics.totalRequests - 1) + duration) 
      / this.metrics.totalRequests;
    
    // Track AI service usage
    this.metrics.aiServiceUsage[aiService] = 
      (this.metrics.aiServiceUsage[aiService] || 0) + 1;
    
    // Track tool usage
    toolsUsed.forEach(tool => {
      this.metrics.toolUsageStats[tool] = 
        (this.metrics.toolUsageStats[tool] || 0) + 1;
    });
  }
  
  getMetrics() {
    return {
      ...this.metrics,
      successRate: this.metrics.successfulRequests / this.metrics.totalRequests,
      timestamp: new Date().toISOString()
    };
  }
}
```

### **Health Check Implementation**

```javascript
// Enhanced health check
app.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      openai: openaiService.isAvailable(),
      gemini: geminiService.isServiceAvailable(),
      mcp: mcpService.isConnected()
    },
    system: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      nodeVersion: process.version
    },
    metrics: metricsCollector.getMetrics()
  };
  
  const isHealthy = Object.values(health.services).some(Boolean);
  
  res.status(isHealthy ? 200 : 503).json(health);
});
```

## 🚀 **DEPLOYMENT BEST PRACTICES**

### **Environment Configuration**

```bash
# Production .env
NODE_ENV=production
PORT=3000

# AI Services
OPENAI_API_KEY=your_production_key
GEMINI_API_KEY=your_production_key

# Logging
LOG_LEVEL=info
LOG_FILE=/var/log/ai-agent/app.log

# Performance
MAX_CONCURRENT_REQUESTS=10
CACHE_TTL=600
REQUEST_TIMEOUT=30000

# Security
API_KEY_REQUIRED=true
RATE_LIMIT_WINDOW=900000  # 15 minutes
RATE_LIMIT_MAX=100
```

### **Docker Configuration**

```dockerfile
# Multi-stage build for production
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS runtime

WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

USER nodejs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["npm", "start"]
```

### **Process Management**

```javascript
// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  
  // Close server
  server.close(() => {
    logger.info('HTTP server closed');
  });
  
  // Close MCP connection
  await mcpService.disconnect();
  
  // Close AI service connections
  await openaiService.disconnect();
  await geminiService.disconnect();
  
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', { reason, promise });
  process.exit(1);
});
```

Với guide này, developers sẽ có đầy đủ kiến thức để hiểu, maintain và extend hệ thống AI Agent một cách hiệu quả và professional.
