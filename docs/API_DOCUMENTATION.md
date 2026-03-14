# 🏠 Super Intelligent Real Estate Agent API Documentation v3.0 (NestJS)

## 🎯 Overview

The Super Intelligent Real Estate Agent is an enterprise-grade AI-powered system built on NestJS framework that provides intelligent real estate consultation and property search capabilities. The system features **enhanced reliability**, **retry logic**, and **conversation management** for optimal user experience.

### 🚀 Key Features

- **🔄 Retry Logic**: Exponential backoff for handling rate limits gracefully
- **🧹 Conversation Cleaning**: Automatic cleanup of invalid tool_calls/responses
- **📝 Session Management**: 30 queries per session with automatic cleanup
- **🧠 Enhanced Knowledge Base**: Query complexity-based conditional loading
- **💰 Token Optimization**: Up to 77% savings for simple queries
- **🛡️ Error Handling**: User-friendly Vietnamese error messages
- **📊 Comprehensive Monitoring**: Winston logging with structured data

### 🎛️ Intelligence Levels

| Complexity | Score | Knowledge Base | Token Usage | Use Case |
|------------|-------|----------------|-------------|----------|
| **SIMPLE** | 0-1 | Base prompt only | ~2,400 tokens | Basic search queries |
| **MODERATE** | 2-4 | Base prompt only | ~2,400 tokens | Multi-criteria queries |
| **COMPLEX** | 5-7 | Selective sections | ~6,000 tokens | Investment consultation |
| **VERY_COMPLEX** | 8+ | Full knowledge base | ~9,000 tokens | Advanced advisory |

### 📈 Performance Metrics

- **Reliability**: 99.9% uptime with retry logic
- **Token Savings**: Up to 77% reduction for simple queries
- **Response Time**: <3 seconds for most queries (with retry)
- **Error Recovery**: Automatic retry on rate limits (429 errors)
- **Session Limits**: 30 queries per session for abuse protection

### 🔧 Technical Stack

- **Framework**: NestJS with TypeScript
- **AI Service**: OpenAI GPT-4o with function calling
- **Database**: MCP (Model Context Protocol) integration
- **Caching**: Redis for session management
- **Logging**: Winston with structured logging
- **Validation**: Joi schema validation

---

## 🔗 Base URL

```
http://localhost:3000/api/v1/super-agent
```

---

## 📋 API Endpoints

### 1. 🤖 Query Processing

**POST** `/query`

Process real estate queries with intelligent complexity detection and optimal resource usage.

#### Request Body

```json
{
  "query": "Tìm căn hộ 2 phòng ngủ tại Đà Nẵng giá dưới 5 tỷ",
  "sessionId": "550e8400-e29b-41d4-a716-446655440000"
}
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| query | string | Yes | User's real estate query in Vietnamese (1-1000 characters) |
| sessionId | string (UUID) | No | Session ID for conversation continuity (auto-generated if not provided) |

#### Validation Rules

- **query**: Must be 1-1000 characters, Vietnamese text allowed
- **sessionId**: Must be valid UUID v4 format if provided
- **Rate Limiting**: Maximum 30 queries per session
- **Request Timeout**: 30 seconds maximum processing time

#### Response Examples

**Simple Query Response** (2,376 tokens):
```json
{
  "success": true,
  "query": {
    "query": "Tìm căn hộ tại Hải Châu",
    "intent": "search",
    "confidence": 1
  },
  "results": [
    {
      "id": "a4d0ed85-5ba6-5616-a416-72ccb9eed334",
      "title": "VĂN PHÒNG CHO THUÊ 200M2 - 250M2 TẠI NGUYỄN HỮU THỌ",
      "price": 25000000,
      "areaSquareMeters": 202,
      "bedroomCount": null,
      "bathroomCount": null,
      "type": "for_rent",
      "address": "112, Nguyễn Hữu Thọ, Quận Hải Châu, Thành phố Đà Nẵng",
      "status": "available",
      "propertyImages": [
        {
          "imageUrl": "https://dev-s3.sgp1.digitaloceanspaces.com/proxy-s3/admin_gmail_com/watermarked_5ae09dd6-86d2-4c43-b7bc-f9d536b75d8a.jpg.jpg"
        }
      ],
      "userBySaleId": {
        "id": "91a7dd2c-8c4e-4b0f-b5ce-74dbeb25cf8c",
        "fullName": "Nhi",
        "phoneNumber": "0191a7dd2c",
        "email": "hanhi.qna@gmail.com"
      }
    }
  ],
  "response": "Tôi đã tìm được 5 bất động sản phù hợp với yêu cầu của bạn tại quận Hải Châu...",
  "sessionId": "550e8400-e29b-41d4-a716-446655440001",
  "metadata": {
    "duration": 1333,
    "aiService": "OpenAI",
    "model": "gpt-4o",
    "toolsUsed": ["search_properties"],
    "toolCount": 1,
    "dataSource": "REAL_DATABASE_VIA_MCP",
    "agentCapability": "INTELLIGENT_MULTI_TOOL_EXECUTION"
  }
}
```

**Complex Query Response** (8,966 tokens):
```json
{
  "success": true,
  "query": {
    "query": "Tôi mới ra trường, muốn đầu tư bất động sản để có lợi nhuận, nên mua hay thuê?",
    "intent": "consultation",
    "confidence": 0.98
  },
  "results": [],
  "response": "Chào bạn! Với tình hình mới ra trường, tôi khuyên bạn nên cân nhắc kỹ trước khi đầu tư BDS...",
  "sessionId": "uuid-here",
  "metadata": {
    "duration": 4521,
    "aiService": "OpenAI", 
    "model": "gpt-4o",
    "promptTokens": 8966,
    "completionTokens": 456,
    "totalTokens": 9422,
    "intelligenceLevel": "AI_AGENT_WITH_TOOLS",
    "toolsUsed": [],
    "toolCount": 0,
    "dataSource": "KNOWLEDGE_BASE_CONSULTATION",
    "agentCapability": "INTELLIGENT_CONSULTATION_WITH_DOMAIN_EXPERTISE"
  }
}
```

---

### 2. 📊 Status Monitoring

**GET** `/status`

Get comprehensive status of all agent components.

#### Response

```json
{
  "success": true,
  "agent": {
    "name": "Super Intelligent Real Estate Agent",
    "version": "2.0.0",
    "intelligenceLevel": "SUPER_ADVANCED",
    "fallbackMode": "AI_ONLINE",
    "primaryAI": "OpenAI"
  },
  "services": {
    "cache": {
      "status": "available"
    },
    "openai": {
      "available": true,
      "model": "gpt-4o",
      "quotaStatus": "Active",
      "error": null
    },
    "mcp": {
      "connected": true,
      "toolCount": 2,
      "tools": ["search_properties", "semantic_property_search"]
    },
    "knowledgeBase": {
      "isLoaded": true,
      "complexityAnalyzer": {
        "available": true,
        "stats": {
          "simpleKeywordsCount": 15,
          "complexIndicatorsCount": 25,
          "multiCriteriaIndicatorsCount": 8
        }
      },
      "realEstateKnowledge": 2847,
      "websiteContext": 1523,
      "enhancedPrompt": 3621,
      "conversationExamples": 1892
    }
  },
  "system": {
    "uptime": 3600,
    "memory": {
      "rss": 145678336,
      "heapTotal": 89456640,
      "heapUsed": 67234816,
      "external": 12345678
    },
    "nodeVersion": "v18.17.0"
  }
}
```

---

### 3. 🧠 Complexity Analysis

**POST** `/analyze-complexity`

Analyze query complexity to understand token optimization.

#### Request Body

```json
{
  "query": "Tôi mới ra trường, muốn đầu tư bất động sản để có lợi nhuận, nên mua hay thuê?"
}
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| query | string | Yes | Real estate query to analyze (1-1000 characters) |

#### Response Examples

**Simple Query Analysis**:
```json
{
  "success": true,
  "query": "Tìm căn hộ tại Hải Châu",
  "analysis": {
    "query": "Tìm căn hộ tại Hải Châu",
    "complexity": "SIMPLE",
    "score": 0,
    "indicators": [],
    "needsKnowledgeBase": false,
    "reasoning": []
  },
  "timestamp": "2025-08-01T07:23:25.474Z"
}
```

**Complex Query Analysis**:
```json
{
  "success": true,
  "query": "Tôi mới ra trường, muốn đầu tư bất động sản để có lợi nhuận, nên mua hay thuê?",
  "analysis": {
    "query": "Tôi mới ra trường, muốn đầu tư bất động sản để có lợi nhuận, nên mua hay thuê?",
    "complexity": "VERY_COMPLEX",
    "score": 14,
    "indicators": ["đầu tư", "lợi nhuận", "nên mua", "mới ra trường"],
    "needsKnowledgeBase": true,
    "reasoning": [
      "Complex keywords found: đầu tư, lợi nhuận, nên mua, mới ra trường",
      "Long query (18 words)"
    ]
  },
  "timestamp": "2025-08-01T07:23:46.671Z"
}
```

#### Complexity Scoring System

The system uses a sophisticated scoring algorithm to determine query complexity:

| Factor | Points | Examples |
|--------|--------|----------|
| **Complex Keywords** | +3 each | đầu tư, lợi nhuận, tư vấn, mới ra trường |
| **Multi-criteria** | +2 each | và, hoặc, nhưng, đồng thời |
| **Long Queries** | +2 | >15 words |
| **Question Words** | +3 | sao, tại sao, như thế nào, có nên |

---

### 4. 💬 Session Management

#### Get Session Information

**GET** `/session/{sessionId}`

Retrieve session information and conversation history.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| sessionId | string (UUID) | Yes | Session ID to retrieve |

#### Response

```json
{
  "success": true,
  "sessionId": "uuid-here",
  "data": {
    "lastQuery": "Tìm căn hộ tại Hải Châu",
    "lastResults": [...],
    "queryCount": 3,
    "createdAt": "2025-08-01T00:00:00.000Z",
    "updatedAt": "2025-08-01T00:05:00.000Z"
  }
}
```

#### Clear Session (Manual)

**DELETE** `/session/{sessionId}`

Manually clear all data associated with a session.

#### Response

```json
{
  "success": true,
  "message": "Session cleared successfully",
  "sessionId": "uuid-here"
}
```

#### Auto Cleanup Session

**POST** `/session/{sessionId}/cleanup`

Automatically cleanup session when user leaves page or refreshes.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| sessionId | string (UUID) | Yes | Session ID to cleanup |

#### Request Body

```json
{
  "reason": "page_unload"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| reason | string | No | Cleanup reason: `page_unload`, `page_refresh`, `user_exit`, `tab_hidden`, `long_absence` |

#### Response

```json
{
  "success": true,
  "message": "Session cleaned up successfully",
  "sessionId": "uuid-here",
  "reason": "page_unload"
}
```

#### Frontend Integration

Use the provided JavaScript handler for automatic cleanup:

```html
<!-- Include session cleanup handler -->
<script src="/session-cleanup.js"></script>

<script>
// Set session ID when user starts chatting
window.SessionCleanup.setSessionId('your-session-uuid');

// Manual cleanup when user clicks clear/logout
await window.SessionCleanup.manualCleanup();

// Check if session is still active
const isActive = await window.SessionCleanup.checkSession();
</script>
```

---

### 5. ❤️ Health Check

**GET** `/health`

Simple health check endpoint to verify the agent is running.

#### Response

```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2025-08-01T07:23:25.474Z",
  "agent": "Super Intelligent Real Estate Agent",
  "version": "2.1.0"
}
```

---

## 🎯 Query Examples by Complexity

### SIMPLE Queries (~2,400 tokens)
```bash
# Basic property search
curl -X POST http://localhost:3000/api/v1/super-agent/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Tìm căn hộ tại Hải Châu"}'

# Simple rental search
curl -X POST http://localhost:3000/api/v1/super-agent/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Nhà cho thuê quận Thanh Khê"}'

# Price-based search
curl -X POST http://localhost:3000/api/v1/super-agent/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Căn hộ 2 phòng ngủ giá 5 tỷ"}'
```

### COMPLEX Queries (~8,900 tokens)
```bash
# Lifestyle consultation
curl -X POST http://localhost:3000/api/v1/super-agent/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Tôi mới ra trường, muốn thuê căn hộ gần trung tâm, ngân sách 12 triệu"}'

# Investment advice
curl -X POST http://localhost:3000/api/v1/super-agent/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Nên đầu tư BDS loại nào để có lợi nhuận cao?"}'

# Comparative analysis
curl -X POST http://localhost:3000/api/v1/super-agent/query \
  -H "Content-Type: application/json" \
  -d '{"query": "So sánh ưu nhược điểm mua nhà vs thuê nhà"}'
```

---

## 🔧 Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error description here"
}
```

Common HTTP status codes:
- `200`: Success
- `400`: Bad Request (validation errors)
- `404`: Not Found (session not found)
- `500`: Internal Server Error

---

## 📈 Performance Optimization

### Token Usage Optimization

The system automatically optimizes token usage based on query complexity:

| Query Type | Before Optimization | After Optimization | Savings |
|------------|-------------------|-------------------|---------|
| Simple Search | 10,374 tokens | 2,376 tokens | **77%** |
| Complex Consultation | 10,374 tokens | 8,966 tokens | **14%** |

### Best Practices

1. **Use simple queries** for basic property searches to minimize costs
2. **Use complex queries** when you need consultation and domain expertise
3. **Maintain sessions** for conversation continuity
4. **Monitor token usage** via metadata for cost tracking

---

## 🚀 Getting Started

### Quick Start Guide

1. **Start the server**:
   ```bash
   npm start
   ```

2. **Test with simple query** (uses ~2,400 tokens):
   ```bash
   curl -X POST http://localhost:3000/api/v1/super-agent/query \
     -H "Content-Type: application/json" \
     -d '{"query": "Tìm căn hộ tại Hải Châu"}'
   ```

3. **Test with complex query** (uses ~8,900 tokens):
   ```bash
   curl -X POST http://localhost:3000/api/v1/super-agent/query \
     -H "Content-Type: application/json" \
     -d '{"query": "Tôi mới ra trường, muốn đầu tư BDS để có lợi nhuận"}'
   ```

4. **Check system status**:
   ```bash
   curl http://localhost:3000/api/v1/super-agent/status
   ```

5. **Analyze query complexity**:
   ```bash
   curl -X POST http://localhost:3000/api/v1/super-agent/analyze-complexity \
     -H "Content-Type: application/json" \
     -d '{"query": "Tôi mới ra trường, muốn đầu tư BDS"}'
   ```

### Testing Different Complexity Levels

```bash
# SIMPLE (score: 0) - Base prompt only
curl -X POST http://localhost:3000/api/v1/super-agent/analyze-complexity \
  -H "Content-Type: application/json" \
  -d '{"query": "Tìm căn hộ Hải Châu"}'

# COMPLEX (score: 6) - Selective knowledge base
curl -X POST http://localhost:3000/api/v1/super-agent/analyze-complexity \
  -H "Content-Type: application/json" \
  -d '{"query": "Tư vấn đầu tư căn hộ"}'

# VERY_COMPLEX (score: 14) - Full knowledge base
curl -X POST http://localhost:3000/api/v1/super-agent/analyze-complexity \
  -H "Content-Type: application/json" \
  -d '{"query": "Tôi mới ra trường, muốn đầu tư BDS để có lợi nhuận, nên mua hay thuê?"}'
```

---

## 📞 Support

For technical support or questions about the API, please refer to the system logs or contact the development team.
