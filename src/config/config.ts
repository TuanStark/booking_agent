export interface AppConfig {
  // Server Configuration
  port: number;
  nodeEnv: string;
  
  // API Configuration
  apiVersion: string;
  apiBaseUrl: string;
  
  // Rate Limiting
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
  
  // Logging
  logLevel: string;
  logFile: string;
  mcpLogLevel: string;
  
  // CORS
  corsOrigin: string;
  
  // MCP Configuration
  mcp: {
    serverUrl: string;
    apiKey: string;
    timeout: number;
  };
  
  // AI Agent Configuration
  agent: {
    name: string;
    version: string;
    maxQueryResults: number;
    defaultPageSize: number;
  };
  
  // Real Estate Configuration
  realEstate: {
    propertyCacheTtl: number;
    searchSimilarityThreshold: number;
    maxSearchRadiusKm: number;
  };
  
  // NLP Configuration
  nlp: {
    confidenceThreshold: number;
    intentClassificationModel: string;
  };

  // OpenAI Configuration
  openai: {
    apiKey: string;
    model: string;
    temperature: number;
    maxTokens: number;
    enabled: boolean;
  };
}

const config: AppConfig = {
  // Server Configuration
  port: parseInt(process.env.PORT || '3000'),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // API Configuration
  apiVersion: process.env.API_VERSION || 'v1',
  apiBaseUrl: process.env.API_BASE_URL || '/api/v1',
  
  // Rate Limiting
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  
  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
  logFile: process.env.LOG_FILE || 'logs/app.log',
  mcpLogLevel: process.env.MCP_LOG_LEVEL || 'info',
  
  // CORS
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  
  // MCP Configuration
  mcp: {
    serverUrl: process.env.MCP_SERVER_URL || 'http://localhost:8080',
    apiKey: process.env.MCP_API_KEY || 'f01c5ef6-2237-492f-a1c8-b6a922b13cdb',
    timeout: parseInt(process.env.MCP_TIMEOUT || '30000')
  },
  
  // AI Agent Configuration
  agent: {
    name: process.env.AGENT_NAME || 'RealEstateBot',
    version: process.env.AGENT_VERSION || '2.0.0',
    maxQueryResults: parseInt(process.env.MAX_QUERY_RESULTS || '50'),
    defaultPageSize: parseInt(process.env.DEFAULT_PAGE_SIZE || '20')
  },
  
  // Real Estate Configuration
  realEstate: {
    propertyCacheTtl: parseInt(process.env.PROPERTY_CACHE_TTL || '3600'), // 1 hour
    searchSimilarityThreshold: parseFloat(process.env.SEARCH_SIMILARITY_THRESHOLD || '0.7'),
    maxSearchRadiusKm: parseInt(process.env.MAX_SEARCH_RADIUS_KM || '50')
  },
  
  // NLP Configuration
  nlp: {
    confidenceThreshold: parseFloat(process.env.NLP_CONFIDENCE_THRESHOLD || '0.6'),
    intentClassificationModel: process.env.INTENT_CLASSIFICATION_MODEL || 'compromise'
  },

  // OpenAI Configuration
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'gpt-4o',
    temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7'),
    maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '2048'),
    enabled: process.env.OPENAI_ENABLE === 'true'
  }
};

export default config;
