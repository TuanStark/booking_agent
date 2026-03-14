# 🏠 Real Estate Chatbot Agent (NestJS + TypeScript)

## 🚀 Overview

Advanced AI-powered real estate chatbot built with **NestJS** and **TypeScript**, providing intelligent property search, market analysis, and investment recommendations for Đà Nẵng real estate market.

## ✨ Features

### 🤖 **AI-Powered Intelligence**
- **GPT-4o Integration**: Advanced natural language understanding
- **Smart Query Processing**: Intent recognition and context awareness
- **Multi-tool Execution**: Seamless integration with property databases

### 🏢 **Real Estate Expertise**
- **Property Search**: Advanced filtering and semantic search
- **Market Analysis**: Investment insights and trend analysis
- **Location Intelligence**: Area-specific recommendations

### 🛡️ **Enterprise-Grade Architecture**
- **Type Safety**: Full TypeScript support with compile-time validation
- **Modular Design**: Clean, maintainable, and testable architecture
- **Auto Documentation**: Swagger UI with interactive API docs
- **Rate Limiting**: Built-in protection against abuse
- **Caching**: Intelligent session and data caching

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client App    │───▶│  NestJS API     │───▶│   OpenAI GPT    │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │  MCP Server     │───▶│   Database      │
                       │                 │    │   (Hasura)      │
                       └─────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- OpenAI API key

### Installation

```bash
# Clone repository
git clone <repository-url>
cd AI-Agent

# Install dependencies
npm install

# Setup environment
cp .env.nestjs.example .env.nestjs
# Edit .env.nestjs with your configuration

# Start development server
npm run start:dev
```

### Environment Configuration

```env
# .env.nestjs
NODE_ENV=development
PORT=3000
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o
MCP_SERVER_PATH=./mcp-servers/hasura-advanced
```

## 📚 API Documentation

### Interactive Documentation
Visit `http://localhost:3000/api/docs` for interactive Swagger UI.

### Core Endpoints

#### 🤖 Query Processing
```http
POST /api/v1/super-agent/query
Content-Type: application/json

{
  "query": "Tìm căn hộ 2 phòng ngủ tại Hải Châu giá dưới 5 tỷ",
  "sessionId": "550e8400-e29b-41d4-a716-446655440000"
}
```

#### 📊 Service Status
```http
GET /api/v1/super-agent/status
```

#### 🧹 Session Management
```http
POST /api/v1/super-agent/session/{sessionId}/cleanup
POST /api/v1/super-agent/sessions/cleanup
```

#### ❤️ Health Check
```http
GET /api/v1/super-agent/health
```

## 🧪 Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov

# Test specific endpoint
curl -X POST http://localhost:3000/api/v1/super-agent/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Tìm nhà ở Đà Nẵng", "sessionId": "test-session-123"}'
```

## 🏗️ Development

### Project Structure
```
nestjs-src/
├── modules/
│   ├── core/                 # Core services (Cache, MCP, OpenAI)
│   ├── super-agent/          # Main chatbot logic
│   └── health/               # Health check endpoints
├── dto/                      # Data Transfer Objects
├── main.ts                   # Application entry point
└── app.module.ts            # Root module
```

### Key Components

#### **Core Services**
- `CacheService`: Session and data caching
- `McpService`: MCP server communication
- `OpenAiService`: GPT integration

#### **SuperAgent Service**
- Query processing and AI orchestration
- Tool execution and response generation
- Session management and cleanup

#### **Controllers**
- Type-safe request/response handling
- Automatic validation and documentation
- Error handling and logging

### Development Commands

```bash
# Development with hot reload
npm run start:dev

# Build for production
npm run build

# Production mode
npm run start:prod

# Linting
npm run lint

# Format code
npm run format
```

## 🔧 Configuration

### TypeScript Configuration
- Strict type checking enabled
- Path mapping for clean imports
- Decorator support for NestJS

### Validation
- Request validation with `class-validator`
- Automatic error responses
- Type-safe DTOs

### Logging
- Structured logging with Winston
- Multiple log levels and transports
- Request/response logging

## 📈 Performance

### Optimizations
- **Intelligent Caching**: Session-based caching with automatic cleanup
- **Connection Pooling**: Efficient database connections
- **Rate Limiting**: Protection against abuse
- **Compression**: Response compression for better performance

### Monitoring
- Health check endpoints
- Performance metrics
- Error tracking and logging

## 🛡️ Security

### Built-in Protection
- **Helmet**: Security headers
- **Rate Limiting**: Request throttling
- **Input Validation**: Automatic request validation
- **CORS**: Configurable cross-origin requests

### Best Practices
- Environment-based configuration
- Secure error handling
- Input sanitization

## 🚀 Deployment

### Production Build
```bash
npm run build
npm run start:prod
```

### Docker Support
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3000
CMD ["npm", "run", "start:prod"]
```

### Environment Variables
```env
NODE_ENV=production
PORT=3000
OPENAI_API_KEY=your_production_key
LOG_LEVEL=warn
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

- 📖 [NestJS Documentation](https://docs.nestjs.com/)
- 🐛 [Issue Tracker](https://github.com/your-repo/issues)
- 💬 [Discussions](https://github.com/your-repo/discussions)

---

**Built with ❤️ using NestJS + TypeScript**
