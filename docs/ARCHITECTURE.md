# 🏗️ Architecture Overview - AI Agent Real Estate Assistant (NestJS)

## 🎯 **SYSTEM OVERVIEW**

```mermaid
graph TB
    User[👤 User] --> API[🌐 NestJS API]
    API --> Controller[🎮 SuperAgentController]
    Controller --> Agent[🧠 SuperAgentService]

    Agent --> SessionMgmt[📝 Session Management]
    Agent --> RateLimit[⚡ Rate Limiting & Query Limits]
    Agent --> RetryLogic[🔄 Retry Logic with Exponential Backoff]

    RetryLogic --> OpenAI[🔵 OpenAI GPT-4o + Enhanced Knowledge Base]
    OpenAI --> ComplexityAnalysis[🧠 Query Complexity Analysis]
    ComplexityAnalysis --> ConditionalKB[📚 Conditional Knowledge Base]
    ConditionalKB --> FunctionCall[📞 Function Calling]

    FunctionCall --> MCP[🛠️ MCP Service]

    MCP --> Tools{🔧 MCP Tools}

    Tools --> DB[(🏠 Real Estate Database)]

    DB --> Results[📊 Real Data]
    Results --> Response[💬 Enhanced Response]
    Response --> User

    Agent --> Cache[💾 Redis Cache]
    Agent --> Logger[📝 Winston Logger]
```

## 🔄 **REQUEST FLOW DIAGRAM**

```mermaid
sequenceDiagram
    participant U as 👤 User
    participant C as 🎮 Controller
    participant A as 🧠 SuperAgentService
    participant S as 📝 Session Manager
    participant R as 🔄 Retry Logic
    participant AI as 🤖 OpenAI Service
    participant M as 🛠️ MCP Service
    participant DB as 🏠 Database
    participant Cache as 💾 Cache

    U->>C: POST /api/v1/super-agent/query
    C->>C: Validate request (Joi schema)
    C->>A: processQuery(query, sessionId)

    A->>S: Check session limits (30 queries max)
    S-->>A: Session validation result

    A->>Cache: Get conversation history
    Cache-->>A: Previous messages

    A->>A: Clean conversation history
    Note over A: Remove invalid tool_calls/responses

    A->>AI: Get enhanced system prompt
    Note over AI: Query complexity analysis + conditional KB

    A->>R: Retry wrapper for OpenAI call
    R->>AI: createChatCompletion with tools
    AI-->>R: Response with tool_calls
    R-->>A: AI response (with retry on rate limit)

    loop For each tool_call
        A->>M: callTool(toolName, args)
        M->>DB: Execute MCP tool
        DB-->>M: Real data
        M-->>A: Tool result
    end

    A->>R: Final OpenAI call for response
    R->>AI: Generate final response
    AI-->>R: Professional response
    R-->>A: Final response

    A->>S: Update session history
    A->>Cache: Cache conversation

    A-->>C: Response with metadata
    C-->>U: JSON response with real data
```

## 🧩 **COMPONENT ARCHITECTURE (NestJS)**

### **NestJS Module Structure**
```
┌─────────────────────────────────────────────────────────────┐
│                      📦 AppModule                           │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐ │
│  │ CoreModule  │ │SuperAgentMod│ │ HealthModule            │ │
│  │             │ │ule          │ │                         │ │
│  └─────────────┘ └─────────────┘ └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### **Core Module Services**
```
┌─────────────────────────────────────────────────────────────┐
│                      🔧 CoreModule                          │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐ │
│  │ McpService  │ │OpenAiService│ │ CacheService            │ │
│  │             │ │             │ │                         │ │
│  └─────────────┘ └─────────────┘ └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### **SuperAgent Module**
```
┌─────────────────────────────────────────────────────────────┐
│                  🧠 SuperAgentModule                        │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐ │
│  │ Controller  │ │ Service     │ │ RealEstateOpenAIService │ │
│  │             │ │             │ │                         │ │
│  └─────────────┘ └─────────────┘ └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### **Knowledge System**
```
┌─────────────────────────────────────────────────────────────┐
│                    📚 Knowledge System                      │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐ │
│  │ Complexity  │ │ Knowledge   │ │ Intelligent Query       │ │
│  │ Analyzer    │ │ Base Loader │ │ Analyzer                │ │
│  └─────────────┘ └─────────────┘ └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### **MCP Tools Layer**
```
┌─────────────┐ ┌─────────────┐
│ 🔍 Search   │ │ 🔍 Semantic │
│ Properties  │ │ Search      │
└─────────────┘ └─────────────┘
```

## 🔀 **ENHANCED ERROR HANDLING & RETRY LOGIC**

```mermaid
flowchart TD
    Start([🚀 Start Request]) --> SessionCheck{📝 Session Valid?}

    SessionCheck -->|❌ No| SessionLimit[❌ Session Limit Exceeded]
    SessionCheck -->|✅ Yes| HistoryClean[🧹 Clean Conversation History]

    HistoryClean --> ComplexityAnalysis[🧠 Query Complexity Analysis]
    ComplexityAnalysis --> KnowledgeBase[📚 Load Conditional Knowledge Base]

    KnowledgeBase --> RetryWrapper[🔄 Retry Wrapper]
    RetryWrapper --> OpenAICall[🔵 OpenAI API Call]

    OpenAICall -->|Rate Limit 429| Backoff[⏱️ Exponential Backoff]
    Backoff --> RetryCheck{🔄 Retry < 3?}
    RetryCheck -->|✅ Yes| OpenAICall
    RetryCheck -->|❌ No| FallbackError[❌ All Retries Failed]

    OpenAICall -->|Success| ToolCalls{🛠️ Has Tool Calls?}

    ToolCalls -->|✅ Yes| ExecuteTools[🔧 Execute MCP Tools]
    ToolCalls -->|❌ No| DirectResponse[💬 Direct AI Response]

    ExecuteTools --> ToolResults[📊 Aggregate Tool Results]
    ToolResults --> FinalResponse[🎯 Generate Final Response]

    DirectResponse --> UpdateSession[📝 Update Session]
    FinalResponse --> UpdateSession

    UpdateSession --> Success([✅ Return Success])

    SessionLimit --> Error([❌ Return Error])
    FallbackError --> Error
```

## 🛠️ **TOOL SELECTION STRATEGIES**

### **OpenAI Function Calling (Primary)**
```mermaid
graph LR
    Query[📝 User Query] --> OpenAI[🔵 OpenAI Analysis]
    OpenAI --> Auto{🤖 Intelligent Tool Selection}

    Auto --> Tool1[🏠 search_rental_properties]
    Auto --> Tool2[⭐ get_featured_properties]
    Auto --> Tool3[💰 search_properties_by_price_range]
    Auto --> Tool4[🔍 search_properties]
    Auto --> ToolN[... 8 more tools]

    Tool1 --> Execute[⚡ Sequential Execution]
    Tool2 --> Execute
    Tool3 --> Execute
    Tool4 --> Execute
    ToolN --> Execute

    Execute --> Results[📊 Aggregate Results]
    Results --> Response[💬 AI Generated Response]
```

### **Gemini Fallback Service**
```mermaid
graph LR
    Query[📝 User Query] --> Gemini[🔮 Gemini Analysis]
    Gemini --> Legacy[📋 Legacy Function Routing]
    Legacy --> Tools[🛠️ Selected Tools]
    Tools --> Execute[⚡ Execute Tools]
    Execute --> Response[💬 Generate Response]
```

### **Graceful Degradation**
```mermaid
graph LR
    ToolsFail[❌ Tools Timeout/Fail] --> AI[🤖 AI Intelligence]
    AI --> Knowledge[🧠 Use AI Knowledge]
    Knowledge --> Suggestions[💡 Generate Suggestions]
    Suggestions --> Professional[💬 Professional Response]

    Professional --> Explain[📝 Explain Situation]
    Professional --> Alternatives[🔄 Suggest Alternatives]
    Professional --> Helpful[🤝 Remain Helpful]
```

## 📊 **DATA FLOW ARCHITECTURE (NestJS)**

```mermaid
graph TB
    subgraph "🌐 NestJS API Layer"
        Controller[SuperAgentController]
        Guards[Guards & Interceptors]
        Pipes[Validation Pipes]
        Filters[Exception Filters]
    end

    subgraph "🧠 Business Logic Layer"
        SuperAgent[SuperAgentService]
        RealEstateAI[RealEstateOpenAIService]
        SmartSearch[SmartSearchService]
    end

    subgraph "🔧 Core Services Layer"
        OpenAI[OpenAiService]
        MCP[McpService]
        Cache[CacheService]
    end

    subgraph "📚 Knowledge Layer"
        ComplexityAnalyzer[QueryComplexityAnalyzer]
        KnowledgeLoader[KnowledgeBaseLoader]
        IntelligentAnalyzer[IntelligentQueryAnalyzer]
    end

    subgraph "🛠️ Infrastructure Layer"
        Logger[Winston Logger]
        Config[ConfigService]
        Throttler[ThrottlerModule]
    end

    subgraph "🏠 Data Layer"
        Database[(Real Estate DB)]
        MCPTools[MCP Tools]
        RedisCache[(Redis Cache)]
    end

    Controller --> Guards
    Guards --> Pipes
    Pipes --> SuperAgent

    SuperAgent --> RealEstateAI
    SuperAgent --> SmartSearch
    SuperAgent --> Cache

    RealEstateAI --> OpenAI
    RealEstateAI --> ComplexityAnalyzer
    RealEstateAI --> KnowledgeLoader

    OpenAI --> MCP
    MCP --> MCPTools
    MCPTools --> Database

    Cache --> RedisCache

    SuperAgent --> Logger
    SuperAgent --> Config

    Filters --> Controller
    Throttler --> Guards
```

## 🔄 **ERROR HANDLING & FALLBACK FLOW**

```mermaid
flowchart TD
    Request[📥 Incoming Request] --> Validate{✅ Valid Request?}
    
    Validate -->|❌ No| ValidationError[❌ Validation Error]
    Validate -->|✅ Yes| SelectAI[🤖 Select AI Service]
    
    SelectAI --> TryOpenAI{🔵 Try OpenAI}
    TryOpenAI -->|✅ Success| ProcessOpenAI[🔄 Process with OpenAI]
    TryOpenAI -->|❌ Quota/Error| TryGemini{🔮 Try Gemini}

    TryGemini -->|✅ Success| ProcessGemini[🔄 Process with Gemini]
    TryGemini -->|❌ Error| FinalError[❌ All Services Failed]

    ProcessOpenAI --> ExecuteTools[🛠️ Execute MCP Tools]
    ProcessGemini --> ExecuteTools
    
    ExecuteTools --> ToolError{🔧 Tool Errors?}
    ToolError -->|Some Failed| PartialSuccess[⚠️ Partial Success]
    ToolError -->|All Failed| GracefulResponse[🤖 AI Graceful Response]
    ToolError -->|All Success| FullSuccess[✅ Full Success]

    PartialSuccess --> Response[💬 Generate Response]
    FullSuccess --> Response
    GracefulResponse --> Response

    ValidationError --> ErrorResponse[❌ Error Response]
    FinalError --> ErrorResponse

    Response --> SuccessResponse[✅ Success Response]
    
    ErrorResponse --> Client[👤 Client]
    SuccessResponse --> Client
```

## 🏗️ **DEPLOYMENT ARCHITECTURE**

```mermaid
graph TB
    subgraph "🌐 Load Balancer"
        LB[Nginx/HAProxy]
    end
    
    subgraph "🚀 Application Servers"
        App1[Node.js Instance 1]
        App2[Node.js Instance 2]
        App3[Node.js Instance N]
    end
    
    subgraph "🤖 External AI Services"
        OpenAIAPI[OpenAI API]
        GeminiAPI[Google Gemini API]
    end
    
    subgraph "🛠️ MCP Infrastructure"
        MCPServer[MCP Server]
        MCPTools[MCP Tools]
    end
    
    subgraph "🏠 Data Layer"
        RealEstateDB[(Real Estate Database)]
        Cache[(Redis Cache)]
    end
    
    subgraph "📊 Monitoring"
        Logs[Log Aggregation]
        Metrics[Metrics Collection]
        Health[Health Checks]
    end
    
    LB --> App1
    LB --> App2
    LB --> App3
    
    App1 --> OpenAIAPI
    App1 --> GeminiAPI
    App1 --> MCPServer
    App1 --> Cache
    
    App2 --> OpenAIAPI
    App2 --> GeminiAPI
    App2 --> MCPServer
    App2 --> Cache
    
    App3 --> OpenAIAPI
    App3 --> GeminiAPI
    App3 --> MCPServer
    App3 --> Cache
    
    MCPServer --> MCPTools
    MCPTools --> RealEstateDB
    
    App1 --> Logs
    App2 --> Logs
    App3 --> Logs
    
    App1 --> Metrics
    App2 --> Metrics
    App3 --> Metrics
    
    Health --> App1
    Health --> App2
    Health --> App3
```

## 🔐 **SECURITY ARCHITECTURE**

```mermaid
graph TB
    subgraph "🛡️ Security Layers"
        WAF[Web Application Firewall]
        RateLimit[Rate Limiting]
        Auth[API Authentication]
        Validation[Input Validation]
    end
    
    subgraph "🔒 Data Protection"
        Encryption[Data Encryption]
        APIKeys[API Key Management]
        Secrets[Secret Management]
    end
    
    subgraph "📊 Monitoring & Audit"
        AccessLogs[Access Logging]
        SecurityEvents[Security Event Monitoring]
        Alerts[Security Alerts]
    end
    
    Internet[🌐 Internet] --> WAF
    WAF --> RateLimit
    RateLimit --> Auth
    Auth --> Validation
    Validation --> Application[🚀 Application]
    
    Application --> Encryption
    Application --> APIKeys
    Application --> Secrets
    
    Application --> AccessLogs
    Application --> SecurityEvents
    SecurityEvents --> Alerts
```

## 📈 **SCALABILITY CONSIDERATIONS**

### **Horizontal Scaling**
- Multiple Node.js instances behind load balancer
- Stateless application design
- Session data in external store (Redis)

### **Vertical Scaling**
- CPU optimization for AI processing
- Memory management for conversation history
- I/O optimization for MCP calls

### **Caching Strategy**
- Query result caching
- AI analysis caching
- MCP response caching

### **Performance Optimization**
- Parallel tool execution
- Connection pooling
- Request batching

## 🎯 **DESIGN PRINCIPLES**

1. **🧠 AI-First**: OpenAI intelligence drives tool selection and response generation
2. **🔄 Graceful Degradation**: Always provide helpful responses, even when tools fail
3. **🎯 Simplicity**: Clean, maintainable code without over-engineering
4. **⚡ Performance**: Optimized tool execution and response generation
5. **📊 Observability**: Comprehensive logging and monitoring
6. **🛡️ Security**: Secure API key management and input validation
7. **📈 Scalability**: Stateless design for horizontal scaling
8. **🤝 User-Centric**: Professional, helpful responses focused on user needs

## 🚀 **KEY IMPROVEMENTS IN CURRENT ARCHITECTURE (NestJS)**

### **Enterprise-Grade Framework**
- **NestJS Architecture**: Modular, scalable, and maintainable
- **Dependency Injection**: Clean separation of concerns and testability
- **Decorators & Guards**: Built-in security and validation
- **TypeScript**: Type safety and better developer experience

### **Enhanced Reliability**
- **Retry Logic with Exponential Backoff**: Handles rate limits gracefully
- **Conversation History Cleaning**: Prevents OpenAI format errors
- **Session Management**: 30 queries per session with automatic cleanup
- **Comprehensive Error Handling**: User-friendly Vietnamese error messages

### **Performance Optimizations**
- **Query Complexity Analysis**: Conditional knowledge base loading
- **Token Optimization**: 77% savings for simple queries
- **Caching Strategy**: Redis-based session and response caching
- **Rate Limiting**: Built-in throttling protection

### **Advanced AI Integration**
- **Enhanced Knowledge Base**: Selective loading based on query complexity
- **Intelligent Tool Selection**: OpenAI function calling with MCP tools
- **Conversation Context**: Maintains context across multiple queries
- **Professional Responses**: Clean, helpful responses without marketing spam

### **Developer Experience**
- **Comprehensive Logging**: Winston with structured logging
- **Health Checks**: Detailed system status monitoring
- **API Documentation**: Swagger/OpenAPI integration
- **Testing Support**: Built-in testing utilities and mocking

### **Security & Compliance**
- **Input Validation**: Joi schema validation
- **Rate Limiting**: Protection against abuse
- **Error Sanitization**: No sensitive data in error responses
- **Session Security**: UUID-based session management

This architecture ensures the AI Agent is enterprise-ready, highly reliable, and maintainable while providing excellent user experience and developer productivity.
