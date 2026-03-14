import { Injectable, Logger } from '@nestjs/common';

export interface ComplexityAnalysis {
  complexity: string;
  score: number;
  needsKnowledgeBase: boolean;
  indicators: string[];
  reasons?: string[];
}

@Injectable()
export class QueryComplexityAnalyzer {
  private readonly logger = new Logger(QueryComplexityAnalyzer.name);
  // Complex indicators that need knowledge base
  private readonly complexIndicators = [
    // Investment & consultation
    'đầu tư', 'lợi nhuận', 'roi', 'tỷ suất', 'xu hướng', 'thị trường', 'giá tăng', 'giá giảm',
    'nên mua', 'nên thuê', 'tư vấn', 'phân tích', 'so sánh', 'lựa chọn nào tốt',

    // Lifestyle & personal needs
    'mới ra trường', 'sinh viên', 'gia đình trẻ', 'có con nhỏ', 'người già', 'về hưu',
    'làm việc tại', 'gần chỗ làm', 'gần trường học', 'an toàn', 'yên tĩnh',

    // Business & professional
    'kinh doanh', 'mở shop', 'văn phòng công ty', 'nhân viên', 'khách hàng',
    'mặt tiền', 'vị trí đẹp', 'foot traffic', 'giao thông thuận tiện',

    // Technical & detailed requirements
    'pháp lý', 'sổ đỏ', 'sổ hồng', 'quy hoạch', 'hạ tầng', 'tiện ích',
    'view đẹp', 'hướng nhà', 'feng shui', 'thiết kế', 'nội thất',

    // Market analysis
    'giá cả thế nào', 'có đắt không', 'có rẻ không', 'giá hợp lý',
    'khu vực nào tốt', 'nên chọn đâu', 'ưu nhược điểm'
  ];

  // Multi-criteria indicators
  private readonly multiCriteriaIndicators = [
    'và', 'hoặc', 'nhưng', 'tuy nhiên', 'ngoài ra', 'bên cạnh đó',
    'đồng thời', 'cùng với', 'kết hợp', 'vừa', 'vừa'
  ];

  /**
   * Analyze query complexity - Logic from Express version
   */
  analyzeComplexity(query: string): ComplexityAnalysis {
    try {
      const normalizedQuery = query.toLowerCase().trim();

      const analysis = {
        query: query,
        complexity: 'SIMPLE',
        score: 0,
        needsKnowledgeBase: false,
        indicators: [] as string[],
        reasons: [] as string[]
      };

      // Check for complex indicators
      const foundComplexIndicators = this.complexIndicators.filter(indicator =>
        normalizedQuery.includes(indicator)
      );

      // Check for multi-criteria indicators
      const foundMultiCriteria = this.multiCriteriaIndicators.filter(indicator =>
        normalizedQuery.includes(indicator)
      );

      // Calculate complexity score
      let complexityScore = 0;

      // Complex indicators weight more
      complexityScore += foundComplexIndicators.length * 2;

      // Multi-criteria indicators
      complexityScore += foundMultiCriteria.length;

      // Query length factor (longer queries tend to be more complex)
      if (normalizedQuery.length > 100) {
        complexityScore += 1;
        analysis.reasons.push('Long query');
      }

      // Question words indicating consultation need
      const questionWords = ['nên', 'tốt nhất', 'phù hợp', 'lựa chọn', 'khuyên'];
      const foundQuestions = questionWords.filter(word => normalizedQuery.includes(word));
      if (foundQuestions.length > 0) {
        complexityScore += foundQuestions.length;
        analysis.reasons.push('Consultation needed');
      }

      // Determine complexity level
      analysis.score = complexityScore;
      analysis.indicators = [...foundComplexIndicators, ...foundMultiCriteria];

      if (complexityScore >= 4) {
        analysis.complexity = 'VERY_COMPLEX';
        analysis.needsKnowledgeBase = true;
        analysis.reasons.push('Very complex query requiring extensive knowledge');
      } else if (complexityScore >= 2) {
        analysis.complexity = 'COMPLEX';
        analysis.needsKnowledgeBase = true;
        analysis.reasons.push('Complex query requiring knowledge base');
      } else if (complexityScore >= 1) {
        analysis.complexity = 'MODERATE';
        analysis.needsKnowledgeBase = false;
        analysis.reasons.push('Moderate complexity, base knowledge sufficient');
      } else {
        analysis.complexity = 'SIMPLE';
        analysis.needsKnowledgeBase = false;
        analysis.reasons.push('Simple query, no additional knowledge needed');
      }

      this.logger.debug('Query complexity analyzed', {
        query: query.substring(0, 50) + '...',
        complexity: analysis.complexity,
        score: analysis.score,
        needsKnowledgeBase: analysis.needsKnowledgeBase,
        indicators: analysis.indicators,
        reasons: analysis.reasons
      });

      return analysis;
    } catch (error) {
      this.logger.error('Failed to analyze query complexity', error);
      return {
        complexity: 'SIMPLE',
        score: 0,
        needsKnowledgeBase: false,
        indicators: []
      };
    }
  }

  /**
   * Get relevant knowledge sections based on query analysis
   */
  getRelevantKnowledgeSections(query: string, analysis: ComplexityAnalysis): string[] {
    const sections = [];
    const queryLower = query.toLowerCase();

    // Market analysis section
    if (queryLower.includes('thị trường') || queryLower.includes('xu hướng') || 
        queryLower.includes('market') || queryLower.includes('trend')) {
      sections.push('MARKET_ANALYSIS');
    }

    // Investment section
    if (queryLower.includes('đầu tư') || queryLower.includes('investment') ||
        queryLower.includes('lợi nhuận') || queryLower.includes('profit')) {
      sections.push('INVESTMENT_GUIDE');
    }

    // Legal section
    if (queryLower.includes('pháp lý') || queryLower.includes('legal') ||
        queryLower.includes('thủ tục') || queryLower.includes('giấy tờ')) {
      sections.push('LEGAL_PROCEDURES');
    }

    // Property types section
    if (queryLower.includes('căn hộ') || queryLower.includes('nhà') ||
        queryLower.includes('đất') || queryLower.includes('apartment')) {
      sections.push('PROPERTY_TYPES');
    }

    // Location analysis
    if (queryLower.includes('vị trí') || queryLower.includes('location') ||
        queryLower.includes('khu vực') || queryLower.includes('area')) {
      sections.push('LOCATION_ANALYSIS');
    }

    // If no specific sections identified, use general knowledge
    if (sections.length === 0 && analysis.needsKnowledgeBase) {
      sections.push('GENERAL_KNOWLEDGE');
    }

    return sections;
  }
}
