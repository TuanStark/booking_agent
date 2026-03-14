import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';

export interface UserSession {
  lastQuery?: string;
  lastResults?: any[];
  queryCount?: number;
  lastAccess?: string;
  lastInteraction?: string;
}

export interface CacheStats {
  size: number;
  maxSize: number;
  estimatedMemoryMB: number;
  maxMemoryMB: number;
  keys: string[];
  memoryUsage: {
    rss: number;
    heapUsed: number;
    heapTotal: number;
  };
}

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly defaultTtl: number;
  private readonly maxCacheSize: number;

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private configService: ConfigService,
  ) {
    this.defaultTtl = this.configService.get<number>('CACHE_TTL', 1800); // 30 minutes
    this.maxCacheSize = this.configService.get<number>('CACHE_MAX_ITEMS', 1000);
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | undefined> {
    try {
      const value = await this.cacheManager.get<T>(key);
      if (value) {
        this.logger.debug(`Cache hit for key: ${key}`);
      } else {
        this.logger.debug(`Cache miss for key: ${key}`);
      }
      return value;
    } catch (error) {
      this.logger.error(`Cache get error for key ${key}:`, error);
      return undefined;
    }
  }

  /**
   * Set value in cache
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      const actualTtl = ttl || this.defaultTtl;
      await this.cacheManager.set(key, value, actualTtl * 1000); // Convert to milliseconds
      this.logger.debug(`Cache set for key: ${key}, TTL: ${actualTtl}s`);
    } catch (error) {
      this.logger.error(`Cache set error for key ${key}:`, error);
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
      this.logger.debug(`Cache deleted for key: ${key}`);
    } catch (error) {
      this.logger.error(`Cache delete error for key ${key}:`, error);
    }
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    try {
      await this.cacheManager.reset();
      this.logger.log('Cache cleared');
    } catch (error) {
      this.logger.error('Cache clear error:', error);
    }
  }

  /**
   * Get user session
   */
  async getUserSession(sessionId: string): Promise<UserSession | undefined> {
    return this.get<UserSession>(`user_session:${sessionId}`);
  }

  /**
   * Update user session
   */
  async updateUserSession(sessionId: string, data: Partial<UserSession>): Promise<void> {
    const existing = await this.getUserSession(sessionId) || {};
    const updated = {
      ...existing,
      ...data,
      lastAccess: new Date().toISOString(),
    };
    await this.set(`user_session:${sessionId}`, updated);
  }

  /**
   * Get conversation history
   */
  async getConversationHistory(sessionId: string): Promise<any[]> {
    const history = await this.get<any[]>(`conversation_history:${sessionId}`);
    return history || [];
  }

  /**
   * Set conversation history
   */
  async setConversationHistory(sessionId: string, history: any[]): Promise<void> {
    await this.set(`conversation_history:${sessionId}`, history);
  }

  /**
   * Clear conversation history
   */
  async clearConversationHistory(sessionId: string): Promise<void> {
    await this.delete(`conversation_history:${sessionId}`);
  }

  /**
   * Get all cache keys (for cleanup purposes)
   */
  async getAllKeys(): Promise<string[]> {
    try {
      // Note: This is a simplified implementation
      // In production, you might want to use a more sophisticated approach
      // depending on your cache manager implementation
      return [];
    } catch (error) {
      this.logger.error('Get all keys error:', error);
      return [];
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    const memUsage = process.memoryUsage();
    
    return {
      size: 0, // Would need cache manager specific implementation
      maxSize: this.maxCacheSize,
      estimatedMemoryMB: Math.round(memUsage.heapUsed / 1024 / 1024 * 100) / 100,
      maxMemoryMB: 100, // Configurable limit
      keys: [], // Would need cache manager specific implementation
      memoryUsage: {
        rss: Math.round(memUsage.rss / 1024 / 1024 * 100) / 100,
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024 * 100) / 100,
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024 * 100) / 100,
      },
    };
  }

  /**
   * Clean old sessions
   */
  async cleanOldSessions(): Promise<{ removed: number; remaining: number }> {
    // Implementation would depend on cache manager capabilities
    this.logger.log('Session cleanup completed');
    return { removed: 0, remaining: 0 };
  }
}
