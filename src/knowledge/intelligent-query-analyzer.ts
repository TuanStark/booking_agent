import { Injectable, Logger } from '@nestjs/common';

export interface IntelligentQueryAnalysis {
  originalQuery: string;
  extractedParams: {
    primary: any;
    alternatives: any[];
    related: any[];
  };
  searchStrategy: {
    exact: any;
    flexible: any;
    fallback: any;
  };
  suggestions: {
    locationVariants: string[];
    priceRanges: Array<{ min?: number; max?: number; label: string }>;
    propertyTypes: string[];
    areaRanges: Array<{ min?: number; max?: number; label: string }>;
  };
}

@Injectable()
export class IntelligentQueryAnalyzer {
  private readonly logger = new Logger(IntelligentQueryAnalyzer.name);

  // Từ điển địa điểm và biến thể
  private readonly locationMappings = {
    'hải châu': ['hải châu', 'hai chau', 'trung tâm', 'downtown', 'quận hải châu'],
    'thanh khê': ['thanh khê', 'thanh khe', 'quận thanh khê', 'khu công nghệ'],
    'sơn trà': ['sơn trà', 'son tra', 'quận sơn trà', 'bán đảo sơn trà', 'linh ung'],
    'ngũ hành sơn': ['ngũ hành sơn', 'ngu hanh son', 'quận ngũ hành sơn', 'marble mountains'],
    'cẩm lệ': ['cẩm lệ', 'cam le', 'quận cẩm lệ', 'khu công nghiệp'],
    'liên chiểu': ['liên chiểu', 'lien chieu', 'quận liên chiểu'],
    'hòa vang': ['hòa vang', 'hoa vang', 'huyện hòa vang']
  };

  // Từ điển loại bất động sản
  private readonly propertyTypeMappings = {
    'căn hộ': ['căn hộ', 'can ho', 'apartment', 'chung cư', 'condo'],
    'nhà riêng': ['nhà riêng', 'nha rieng', 'nhà phố', 'nha pho', 'townhouse', 'house'],
    'biệt thự': ['biệt thự', 'biet thu', 'villa', 'nhà vườn'],
    'đất nền': ['đất nền', 'dat nen', 'đất', 'dat', 'land', 'lô đất'],
    'shophouse': ['shophouse', 'shop house', 'nhà mặt tiền', 'mặt tiền'],
    'văn phòng': ['văn phòng', 'van phong', 'office', 'officetel']
  };

  // Từ điển giá cả
  private readonly priceKeywords = {
    'rẻ': { max: 2000000000, label: 'Giá rẻ (dưới 2 tỷ)' },
    'bình dân': { max: 3000000000, label: 'Bình dân (dưới 3 tỷ)' },
    'trung bình': { min: 2000000000, max: 5000000000, label: 'Trung bình (2-5 tỷ)' },
    'cao cấp': { min: 5000000000, max: 10000000000, label: 'Cao cấp (5-10 tỷ)' },
    'sang trọng': { min: 10000000000, label: 'Sang trọng (trên 10 tỷ)' }
  };

  /**
   * Phân tích thông minh query của người dùng
   */
  analyzeQuery(query: string): IntelligentQueryAnalysis {
    const normalizedQuery = this.normalizeQuery(query);
    
    this.logger.log('Analyzing intelligent query', {
      originalQuery: query,
      normalizedQuery: normalizedQuery.substring(0, 100)
    });

    // Trích xuất thông tin cơ bản
    const location = this.extractLocation(normalizedQuery);
    const propertyType = this.extractPropertyType(normalizedQuery);
    const priceInfo = this.extractPriceInfo(normalizedQuery);
    const areaInfo = this.extractAreaInfo(normalizedQuery);
    const bedrooms = this.extractBedrooms(normalizedQuery);

    // Tạo parameters chính
    const primaryParams = this.buildPrimaryParams({
      location: location.primary,
      propertyType: propertyType.primary,
      priceInfo,
      areaInfo,
      bedrooms
    });

    // Tạo parameters thay thế
    const alternativeParams = this.buildAlternativeParams({
      location,
      propertyType,
      priceInfo,
      areaInfo,
      bedrooms
    });

    // Tạo parameters liên quan
    const relatedParams = this.buildRelatedParams({
      location,
      propertyType,
      priceInfo,
      areaInfo
    });

    // Tạo chiến lược tìm kiếm
    const searchStrategy = this.buildSearchStrategy(primaryParams, alternativeParams, relatedParams);

    // Tạo gợi ý
    const suggestions = this.buildSuggestions(location, propertyType, priceInfo, areaInfo);

    return {
      originalQuery: query,
      extractedParams: {
        primary: primaryParams,
        alternatives: alternativeParams,
        related: relatedParams
      },
      searchStrategy,
      suggestions
    };
  }

  /**
   * Chuẩn hóa query
   */
  private normalizeQuery(query: string): string {
    return query
      .toLowerCase()
      .replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, 'a')
      .replace(/[èéẹẻẽêềếệểễ]/g, 'e')
      .replace(/[ìíịỉĩ]/g, 'i')
      .replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, 'o')
      .replace(/[ùúụủũưừứựửữ]/g, 'u')
      .replace(/[ỳýỵỷỹ]/g, 'y')
      .replace(/đ/g, 'd')
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Trích xuất thông tin địa điểm
   */
  private extractLocation(query: string): { primary: string | null; alternatives: string[] } {
    let primary: string | null = null;
    const alternatives: string[] = [];

    for (const [mainLocation, variants] of Object.entries(this.locationMappings)) {
      for (const variant of variants) {
        if (query.includes(variant)) {
          if (!primary) {
            primary = mainLocation;
          }
          alternatives.push(...variants.filter(v => v !== variant));
          break;
        }
      }
    }

    return { primary, alternatives: [...new Set(alternatives)] };
  }

  /**
   * Trích xuất loại bất động sản
   */
  private extractPropertyType(query: string): { primary: string | null; alternatives: string[] } {
    let primary: string | null = null;
    const alternatives: string[] = [];

    for (const [mainType, variants] of Object.entries(this.propertyTypeMappings)) {
      for (const variant of variants) {
        if (query.includes(variant)) {
          if (!primary) {
            primary = mainType;
          }
          alternatives.push(...variants.filter(v => v !== variant));
          break;
        }
      }
    }

    return { primary, alternatives: [...new Set(alternatives)] };
  }

  /**
   * Trích xuất thông tin giá
   */
  private extractPriceInfo(query: string): { min?: number; max?: number; keywords: string[] } {
    const priceInfo: { min?: number; max?: number; keywords: string[] } = { keywords: [] };

    // Tìm số tiền cụ thể
    const priceMatches = query.match(/(\d+(?:\.\d+)?)\s*(tỷ|ty|triệu|tr)/g);
    if (priceMatches) {
      const prices = priceMatches.map(match => {
        const [, amount, unit] = match.match(/(\d+(?:\.\d+)?)\s*(tỷ|ty|triệu|tr)/) || [];
        const value = parseFloat(amount);
        return unit.includes('tỷ') || unit.includes('ty') ? value * 1000000000 : value * 1000000;
      });

      if (query.includes('dưới') || query.includes('tối đa')) {
        priceInfo.max = Math.max(...prices);
      } else if (query.includes('trên') || query.includes('tối thiểu')) {
        priceInfo.min = Math.min(...prices);
      } else if (prices.length === 2) {
        priceInfo.min = Math.min(...prices);
        priceInfo.max = Math.max(...prices);
      } else {
        priceInfo.max = prices[0] * 1.2; // Thêm 20% tolerance
        priceInfo.min = prices[0] * 0.8; // Trừ 20% tolerance
      }
    }

    // Tìm từ khóa giá
    for (const [keyword, range] of Object.entries(this.priceKeywords)) {
      if (query.includes(keyword)) {
        priceInfo.keywords.push(keyword);
        if (!priceInfo.min && 'min' in range && range.min) priceInfo.min = range.min;
        if (!priceInfo.max && 'max' in range && range.max) priceInfo.max = range.max;
      }
    }

    return priceInfo;
  }

  /**
   * Trích xuất thông tin diện tích
   */
  private extractAreaInfo(query: string): { min?: number; max?: number } {
    const areaMatches = query.match(/(\d+)\s*m2|(\d+)\s*mét vuông|(\d+)\s*m²/g);
    if (areaMatches) {
      const areas = areaMatches.map(match => {
        const numbers = match.match(/\d+/);
        return numbers ? parseInt(numbers[0]) : 0;
      });

      if (query.includes('dưới') || query.includes('tối đa')) {
        return { max: Math.max(...areas) };
      } else if (query.includes('trên') || query.includes('tối thiểu')) {
        return { min: Math.min(...areas) };
      } else {
        return {
          min: Math.min(...areas) * 0.9,
          max: Math.max(...areas) * 1.1
        };
      }
    }

    return {};
  }

  /**
   * Trích xuất số phòng ngủ
   */
  private extractBedrooms(query: string): number | null {
    const bedroomMatches = query.match(/(\d+)\s*(phòng ngủ|pn|bedroom)/);
    return bedroomMatches ? parseInt(bedroomMatches[1]) : null;
  }

  /**
   * Xây dựng parameters chính
   */
  private buildPrimaryParams(extracted: any): any {
    const params: any = {};

    if (extracted.location) params.location = extracted.location;
    if (extracted.propertyType) params.propertyType = extracted.propertyType;
    if (extracted.priceInfo.min) params.minPrice = extracted.priceInfo.min;
    if (extracted.priceInfo.max) params.maxPrice = extracted.priceInfo.max;
    if (extracted.areaInfo.min) params.minArea = extracted.areaInfo.min;
    if (extracted.areaInfo.max) params.maxArea = extracted.areaInfo.max;
    if (extracted.bedrooms) params.bedrooms = extracted.bedrooms;

    return params;
  }

  /**
   * Xây dựng parameters thay thế
   */
  private buildAlternativeParams(extracted: any): any[] {
    const alternatives: any[] = [];

    // Thay thế địa điểm
    if (extracted.location.alternatives.length > 0) {
      extracted.location.alternatives.forEach((altLocation: string) => {
        alternatives.push({
          ...this.buildPrimaryParams(extracted),
          location: altLocation
        });
      });
    }

    // Thay thế loại BDS
    if (extracted.propertyType.alternatives.length > 0) {
      extracted.propertyType.alternatives.forEach((altType: string) => {
        alternatives.push({
          ...this.buildPrimaryParams(extracted),
          propertyType: altType
        });
      });
    }

    // Mở rộng khoảng giá
    if (extracted.priceInfo.min || extracted.priceInfo.max) {
      alternatives.push({
        ...this.buildPrimaryParams(extracted),
        minPrice: extracted.priceInfo.min ? extracted.priceInfo.min * 0.7 : undefined,
        maxPrice: extracted.priceInfo.max ? extracted.priceInfo.max * 1.3 : undefined
      });
    }

    return alternatives;
  }

  /**
   * Xây dựng parameters liên quan
   */
  private buildRelatedParams(extracted: any): any[] {
    const related: any[] = [];

    // Gợi ý khu vực lân cận
    const nearbyAreas = this.getNearbyAreas(extracted.location.primary);
    nearbyAreas.forEach(area => {
      related.push({
        location: area,
        propertyType: extracted.propertyType.primary
      });
    });

    // Gợi ý loại BDS tương tự
    const similarTypes = this.getSimilarPropertyTypes(extracted.propertyType.primary);
    similarTypes.forEach(type => {
      related.push({
        location: extracted.location.primary,
        propertyType: type
      });
    });

    return related;
  }

  /**
   * Xây dựng chiến lược tìm kiếm
   */
  private buildSearchStrategy(primary: any, alternatives: any[], related: any[]): any {
    return {
      exact: primary,
      flexible: {
        ...primary,
        // Mở rộng khoảng giá 20%
        minPrice: primary.minPrice ? primary.minPrice * 0.8 : undefined,
        maxPrice: primary.maxPrice ? primary.maxPrice * 1.2 : undefined,
        // Mở rộng diện tích 15%
        minArea: primary.minArea ? primary.minArea * 0.85 : undefined,
        maxArea: primary.maxArea ? primary.maxArea * 1.15 : undefined
      },
      fallback: {
        location: primary.location,
        // Chỉ giữ lại location để tìm tất cả BDS trong khu vực
      }
    };
  }

  /**
   * Xây dựng gợi ý
   */
  private buildSuggestions(location: any, propertyType: any, priceInfo: any, areaInfo: any): any {
    return {
      locationVariants: location.alternatives.slice(0, 5),
      priceRanges: this.generatePriceRangeSuggestions(priceInfo),
      propertyTypes: propertyType.alternatives.slice(0, 5),
      areaRanges: this.generateAreaRangeSuggestions(areaInfo)
    };
  }

  /**
   * Tạo gợi ý khoảng giá
   */
  private generatePriceRangeSuggestions(priceInfo: any): any[] {
    const suggestions = [];
    const basePrice = priceInfo.max || priceInfo.min || 3000000000;

    suggestions.push(
      { max: basePrice * 0.7, label: `Dưới ${(basePrice * 0.7 / 1000000000).toFixed(1)} tỷ` },
      { min: basePrice * 0.8, max: basePrice * 1.2, label: `${(basePrice * 0.8 / 1000000000).toFixed(1)}-${(basePrice * 1.2 / 1000000000).toFixed(1)} tỷ` },
      { min: basePrice * 1.3, label: `Trên ${(basePrice * 1.3 / 1000000000).toFixed(1)} tỷ` }
    );

    return suggestions;
  }

  /**
   * Tạo gợi ý khoảng diện tích
   */
  private generateAreaRangeSuggestions(areaInfo: any): any[] {
    const suggestions = [];
    const baseArea = areaInfo.max || areaInfo.min || 80;

    suggestions.push(
      { max: baseArea * 0.8, label: `Dưới ${Math.round(baseArea * 0.8)}m²` },
      { min: baseArea * 0.9, max: baseArea * 1.1, label: `${Math.round(baseArea * 0.9)}-${Math.round(baseArea * 1.1)}m²` },
      { min: baseArea * 1.2, label: `Trên ${Math.round(baseArea * 1.2)}m²` }
    );

    return suggestions;
  }

  /**
   * Lấy khu vực lân cận
   */
  private getNearbyAreas(location: string | null): string[] {
    const nearbyMap: { [key: string]: string[] } = {
      'hải châu': ['thanh khê', 'sơn trà'],
      'thanh khê': ['hải châu', 'cẩm lệ'],
      'sơn trà': ['hải châu', 'ngũ hành sơn'],
      'ngũ hành sơn': ['sơn trà', 'hòa vang'],
      'cẩm lệ': ['thanh khê', 'liên chiểu'],
      'liên chiểu': ['cẩm lệ', 'hòa vang']
    };

    return nearbyMap[location || ''] || [];
  }

  /**
   * Lấy loại BDS tương tự
   */
  private getSimilarPropertyTypes(propertyType: string | null): string[] {
    const similarMap: { [key: string]: string[] } = {
      'căn hộ': ['nhà riêng', 'shophouse'],
      'nhà riêng': ['căn hộ', 'biệt thự'],
      'biệt thự': ['nhà riêng', 'đất nền'],
      'đất nền': ['biệt thự', 'shophouse'],
      'shophouse': ['nhà riêng', 'văn phòng'],
      'văn phòng': ['shophouse', 'căn hộ']
    };

    return similarMap[propertyType || ''] || [];
  }
}
