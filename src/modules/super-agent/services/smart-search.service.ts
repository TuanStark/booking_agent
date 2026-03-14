import { Injectable, Logger } from '@nestjs/common';
import { McpService } from '../../core/services/mcp.service';
import { IntelligentQueryAnalyzer, IntelligentQueryAnalysis } from '../../../knowledge/intelligent-query-analyzer';
import { KnowledgeBaseLoader } from '../../../knowledge/knowledge-base-loader';

export interface SmartSearchResult {
  success: boolean;
  results: any[];
  searchStrategy: 'exact' | 'flexible' | 'fallback' | 'related';
  suggestions?: {
    message: string;
    alternatives: any[];
    related: any[];
    tips: string[];
  };
  metadata: {
    originalQuery: string;
    searchAttempts: number;
    totalResults: number;
    searchPath: string[];
    knowledgeUsed?: string[];
  };
}

@Injectable()
export class SmartSearchService {
  private readonly logger = new Logger(SmartSearchService.name);

  constructor(
    private readonly mcpService: McpService,
    private readonly queryAnalyzer: IntelligentQueryAnalyzer,
    private readonly knowledgeBaseLoader: KnowledgeBaseLoader
  ) {}

  /**
   * Tìm kiếm thông minh với nhiều chiến lược
   */
  async smartSearch(query: string): Promise<SmartSearchResult> {
    const startTime = Date.now();
    
    this.logger.log('Starting smart search', {
      query: query.substring(0, 100)
    });

    // Phân tích query
    const analysis = this.queryAnalyzer.analyzeQuery(query);
    
    let results: any[] = [];
    let searchStrategy: 'exact' | 'flexible' | 'fallback' | 'related' = 'exact';
    let searchAttempts = 0;
    const searchPath: string[] = [];

    // Chiến lược 1: Tìm kiếm chính xác
    try {
      searchAttempts++;
      searchPath.push('exact_search');
      
      this.logger.log('Attempting exact search', {
        params: analysis.extractedParams.primary
      });

      results = await this.executeSearch('search_properties', analysis.extractedParams.primary);
      
      if (results.length > 0) {
        this.logger.log('Exact search successful', {
          resultsCount: results.length
        });
        
        return this.buildSuccessResult(query, results, 'exact', analysis, searchAttempts, searchPath);
      }
    } catch (error) {
      this.logger.warn('Exact search failed', { error: error.message });
    }

    // Chiến lược 2: Tìm kiếm linh hoạt
    try {
      searchAttempts++;
      searchPath.push('flexible_search');
      searchStrategy = 'flexible';
      
      this.logger.log('Attempting flexible search', {
        params: analysis.searchStrategy.flexible
      });

      results = await this.executeSearch('search_properties', analysis.searchStrategy.flexible);
      
      if (results.length > 0) {
        this.logger.log('Flexible search successful', {
          resultsCount: results.length
        });
        
        return this.buildSuccessResult(query, results, 'flexible', analysis, searchAttempts, searchPath);
      }
    } catch (error) {
      this.logger.warn('Flexible search failed', { error: error.message });
    }

    // Chiến lược 3: Tìm kiếm thay thế
    for (const altParams of analysis.extractedParams.alternatives) {
      try {
        searchAttempts++;
        searchPath.push(`alternative_search_${searchAttempts}`);
        
        this.logger.log('Attempting alternative search', {
          params: altParams,
          attempt: searchAttempts
        });

        results = await this.executeSearch('search_properties', altParams);
        
        if (results.length > 0) {
          this.logger.log('Alternative search successful', {
            resultsCount: results.length,
            params: altParams
          });
          
          return this.buildSuccessResult(query, results, 'flexible', analysis, searchAttempts, searchPath);
        }
      } catch (error) {
        this.logger.warn('Alternative search failed', { 
          error: error.message,
          params: altParams 
        });
      }
    }

    // Chiến lược 4: Tìm kiếm fallback (chỉ theo location)
    try {
      searchAttempts++;
      searchPath.push('fallback_search');
      searchStrategy = 'fallback';
      
      this.logger.log('Attempting fallback search', {
        params: analysis.searchStrategy.fallback
      });

      results = await this.executeSearch('search_properties', analysis.searchStrategy.fallback);
      
      if (results.length > 0) {
        this.logger.log('Fallback search successful', {
          resultsCount: results.length
        });
        
        return this.buildSuccessResult(query, results, 'fallback', analysis, searchAttempts, searchPath);
      }
    } catch (error) {
      this.logger.warn('Fallback search failed', { error: error.message });
    }

    // Chiến lược 5: Tìm kiếm liên quan
    const relatedResults: any[] = [];
    for (const relatedParams of analysis.extractedParams.related) {
      try {
        searchAttempts++;
        searchPath.push(`related_search_${searchAttempts}`);
        
        this.logger.log('Attempting related search', {
          params: relatedParams,
          attempt: searchAttempts
        });

        const relatedRes = await this.executeSearch('search_properties', relatedParams);
        relatedResults.push(...relatedRes.slice(0, 3)); // Lấy tối đa 3 kết quả từ mỗi tìm kiếm liên quan
        
        if (relatedResults.length >= 5) break; // Đủ kết quả liên quan
      } catch (error) {
        this.logger.warn('Related search failed', { 
          error: error.message,
          params: relatedParams 
        });
      }
    }

    if (relatedResults.length > 0) {
      searchStrategy = 'related';
      results = relatedResults;
      
      this.logger.log('Related search successful', {
        resultsCount: results.length
      });
      
      return this.buildSuccessResult(query, results, 'related', analysis, searchAttempts, searchPath);
    }

    // Không tìm thấy gì - thử sử dụng Knowledge Base
    this.logger.log('No results found, trying knowledge base enhancement', {
      searchAttempts,
      searchPath
    });

    const knowledgeEnhancedResult = await this.tryKnowledgeBaseEnhancement(query, analysis, searchAttempts, searchPath);
    if (knowledgeEnhancedResult) {
      return knowledgeEnhancedResult;
    }

    // Vẫn không tìm thấy gì - trả về gợi ý
    this.logger.log('No results found even with knowledge base, returning suggestions', {
      searchAttempts,
      searchPath
    });

    return this.buildNoResultsResponse(query, analysis, searchAttempts, searchPath);
  }

  /**
   * Thực hiện tìm kiếm qua MCP
   */
  private async executeSearch(toolName: string, params: any): Promise<any[]> {
    try {
      const mcpResponse = await this.mcpService.callTool(toolName, params);
      
      if (mcpResponse.success && mcpResponse.data) {
        // Parse MCP response
        let actualData = mcpResponse.data;
        
        // Handle case where data is in result.content[0].text as JSON string
        if (actualData?.content && Array.isArray(actualData.content) && actualData.content[0]?.text) {
          try {
            actualData = JSON.parse(actualData.content[0].text);
          } catch (parseError) {
            this.logger.warn('Failed to parse MCP content text as JSON', { error: parseError.message });
          }
        }

        // Extract properties from various structures
        let properties = [];
        if (actualData?.properties && Array.isArray(actualData.properties)) {
          properties = actualData.properties;
        } else if (actualData?.propertiesView && Array.isArray(actualData.propertiesView)) {
          properties = actualData.propertiesView;
        } else if (actualData?.propertyViews && Array.isArray(actualData.propertyViews)) {
          properties = actualData.propertyViews.map((pv: any) => pv.property || pv);
        }

        return properties.map((prop: any) => ({
          ...prop,
          slug: prop.slug || `property-${prop.id}`
        }));
      }
    } catch (error) {
      this.logger.error('MCP search execution failed', {
        toolName,
        params,
        error: error.message
      });
    }
    
    return [];
  }

  /**
   * Xây dựng response thành công
   */
  private buildSuccessResult(
    query: string,
    results: any[],
    strategy: 'exact' | 'flexible' | 'fallback' | 'related',
    analysis: IntelligentQueryAnalysis,
    searchAttempts: number,
    searchPath: string[]
  ): SmartSearchResult {
    const suggestions = this.buildSuggestions(strategy, analysis, results);
    
    return {
      success: true,
      results,
      searchStrategy: strategy,
      suggestions,
      metadata: {
        originalQuery: query,
        searchAttempts,
        totalResults: results.length,
        searchPath
      }
    };
  }

  /**
   * Xây dựng response khi không có kết quả
   */
  private buildNoResultsResponse(
    query: string,
    analysis: IntelligentQueryAnalysis,
    searchAttempts: number,
    searchPath: string[]
  ): SmartSearchResult {
    const suggestions = {
      message: 'Không tìm thấy bất động sản phù hợp với yêu cầu của bạn. Dưới đây là một số gợi ý:',
      alternatives: this.buildAlternativeSuggestions(analysis),
      related: this.buildRelatedSuggestions(analysis),
      tips: this.buildSearchTips(analysis)
    };

    return {
      success: false,
      results: [],
      searchStrategy: 'fallback',
      suggestions,
      metadata: {
        originalQuery: query,
        searchAttempts,
        totalResults: 0,
        searchPath
      }
    };
  }

  /**
   * Xây dựng gợi ý dựa trên chiến lược tìm kiếm
   */
  private buildSuggestions(
    strategy: 'exact' | 'flexible' | 'fallback' | 'related',
    analysis: IntelligentQueryAnalysis,
    results: any[]
  ): any {
    const messages = {
      exact: 'Tìm thấy kết quả chính xác theo yêu cầu của bạn.',
      flexible: 'Tìm thấy kết quả với tiêu chí linh hoạt hơn.',
      fallback: 'Tìm thấy các bất động sản trong khu vực bạn quan tâm.',
      related: 'Tìm thấy các bất động sản liên quan đến yêu cầu của bạn.'
    };

    return {
      message: messages[strategy],
      alternatives: strategy !== 'exact' ? this.buildAlternativeSuggestions(analysis) : [],
      related: this.buildRelatedSuggestions(analysis),
      tips: results.length < 5 ? this.buildSearchTips(analysis) : []
    };
  }

  /**
   * Xây dựng gợi ý thay thế
   */
  private buildAlternativeSuggestions(analysis: IntelligentQueryAnalysis): any[] {
    const alternatives = [];

    // Gợi ý khoảng giá khác
    analysis.suggestions.priceRanges.forEach(range => {
      alternatives.push({
        type: 'price_range',
        label: range.label,
        params: {
          ...analysis.extractedParams.primary,
          minPrice: range.min,
          maxPrice: range.max
        }
      });
    });

    // Gợi ý địa điểm khác
    analysis.suggestions.locationVariants.slice(0, 3).forEach(location => {
      alternatives.push({
        type: 'location',
        label: `Tìm kiếm tại ${location}`,
        params: {
          ...analysis.extractedParams.primary,
          location
        }
      });
    });

    return alternatives.slice(0, 5);
  }

  /**
   * Xây dựng gợi ý liên quan
   */
  private buildRelatedSuggestions(analysis: IntelligentQueryAnalysis): any[] {
    return analysis.extractedParams.related.slice(0, 3).map(params => ({
      type: 'related',
      label: `${params.propertyType || 'Bất động sản'} tại ${params.location || 'khu vực khác'}`,
      params
    }));
  }

  /**
   * Xây dựng tips tìm kiếm
   */
  private buildSearchTips(analysis: IntelligentQueryAnalysis): string[] {
    const tips = [];

    if (analysis.extractedParams.primary.maxPrice) {
      tips.push('Thử tăng ngân sách để có nhiều lựa chọn hơn');
    }

    if (analysis.extractedParams.primary.bedrooms) {
      tips.push('Xem xét giảm số phòng ngủ để có nhiều tùy chọn hơn');
    }

    if (analysis.extractedParams.primary.location) {
      tips.push('Mở rộng tìm kiếm sang các quận lân cận');
    }

    tips.push('Liên hệ với chúng tôi để được tư vấn cá nhân hóa');

    return tips;
  }

  /**
   * Thử sử dụng Knowledge Base để cải thiện tìm kiếm
   */
  private async tryKnowledgeBaseEnhancement(
    query: string,
    analysis: IntelligentQueryAnalysis,
    searchAttempts: number,
    searchPath: string[]
  ): Promise<SmartSearchResult | null> {
    try {
      this.logger.log('Attempting knowledge base enhancement', {
        query: query.substring(0, 100)
      });

      // Lấy thông tin từ knowledge base
      const knowledgeInfo = await this.knowledgeBaseLoader.getRelevantKnowledge(query);

      if (!knowledgeInfo || knowledgeInfo.length === 0) {
        this.logger.log('No relevant knowledge found');
        return null;
      }

      this.logger.log('Found relevant knowledge', {
        knowledgeCount: knowledgeInfo.length,
        knowledgeTypes: knowledgeInfo.map(k => k.type)
      });

      // Tạo enhanced parameters từ knowledge base
      const enhancedParams = this.createEnhancedParamsFromKnowledge(
        analysis.extractedParams.primary,
        knowledgeInfo
      );

      if (!enhancedParams) {
        this.logger.log('Could not create enhanced params from knowledge');
        return null;
      }

      // Thử tìm kiếm với enhanced parameters
      searchAttempts++;
      searchPath.push('knowledge_enhanced_search');

      this.logger.log('Attempting knowledge-enhanced search', {
        enhancedParams,
        attempt: searchAttempts
      });

      const results = await this.executeSearch('search_properties', enhancedParams);

      if (results.length > 0) {
        this.logger.log('Knowledge-enhanced search successful', {
          resultsCount: results.length
        });

        return {
          success: true,
          results,
          searchStrategy: 'flexible',
          suggestions: {
            message: 'Tìm thấy kết quả dựa trên thông tin địa lý và kiến thức bổ sung.',
            alternatives: this.buildAlternativeSuggestions(analysis),
            related: this.buildRelatedSuggestions(analysis),
            tips: [
              'Kết quả được tìm thấy nhờ thông tin địa lý chi tiết',
              'Thử mở rộng khu vực tìm kiếm để có thêm lựa chọn'
            ]
          },
          metadata: {
            originalQuery: query,
            searchAttempts,
            totalResults: results.length,
            searchPath,
            knowledgeUsed: knowledgeInfo.map(k => k.type)
          }
        };
      }

      this.logger.log('Knowledge-enhanced search found no results');
      return null;

    } catch (error) {
      this.logger.error('Knowledge base enhancement failed', {
        error: error.message,
        query: query.substring(0, 100)
      });
      return null;
    }
  }

  /**
   * Tạo enhanced parameters từ knowledge base
   */
  private createEnhancedParamsFromKnowledge(originalParams: any, knowledgeInfo: any[]): any | null {
    try {
      const enhancedParams = { ...originalParams };
      let hasEnhancement = false;

      for (const knowledge of knowledgeInfo) {
        switch (knowledge.type) {
          case 'location':
            // Mở rộng location với thông tin địa lý
            if (knowledge.data.nearbyAreas) {
              enhancedParams.nearbyLocations = knowledge.data.nearbyAreas;
              hasEnhancement = true;
            }
            if (knowledge.data.coordinates) {
              enhancedParams.coordinates = knowledge.data.coordinates;
              hasEnhancement = true;
            }
            break;

          case 'landmark':
            // Tìm kiếm theo landmark
            if (knowledge.data.location) {
              enhancedParams.location = knowledge.data.location;
              hasEnhancement = true;
            }
            if (knowledge.data.radius) {
              enhancedParams.radius = knowledge.data.radius;
              hasEnhancement = true;
            }
            break;

          case 'area_info':
            // Thông tin khu vực
            if (knowledge.data.propertyTypes) {
              enhancedParams.suggestedPropertyTypes = knowledge.data.propertyTypes;
              hasEnhancement = true;
            }
            if (knowledge.data.priceRange) {
              if (!enhancedParams.minPrice) enhancedParams.minPrice = knowledge.data.priceRange.min;
              if (!enhancedParams.maxPrice) enhancedParams.maxPrice = knowledge.data.priceRange.max;
              hasEnhancement = true;
            }
            break;
        }
      }

      return hasEnhancement ? enhancedParams : null;
    } catch (error) {
      this.logger.error('Failed to create enhanced params from knowledge', {
        error: error.message,
        knowledgeInfo
      });
      return null;
    }
  }
}
