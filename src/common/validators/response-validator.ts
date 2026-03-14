/**
 * Response Validator - Kiểm tra response không duplicate thông tin BDS
 */

import { Logger } from '@nestjs/common';

export interface ValidationResult {
  isValid: boolean;
  warnings: string[];
  errors: string[];
}

export class ResponseValidator {
  private static readonly logger = new Logger(ResponseValidator.name);

  /**
   * Validate response để đảm bảo không duplicate thông tin từ results
   */
  static validateResponse(response: string, results: any[]): ValidationResult {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Patterns to check for duplicate information
    const duplicatePatterns = [
      {
        pattern: /\d+\s*(triệu|tỷ|million|billion)/gi,
        type: 'price',
        message: 'Response contains specific price information'
      },
      {
        pattern: /\d+\s*(m²|m2|mét vuông|square meters?)/gi,
        type: 'area',
        message: 'Response contains specific area information'
      },
      {
        pattern: /\d+\.\s*[A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]/g,
        type: 'numbered_list',
        message: 'Response contains numbered property lists'
      },
      {
        pattern: /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi,
        type: 'uuid',
        message: 'Response contains property IDs'
      }
    ];

    // Street names in Da Nang (common ones)
    const streetNames = [
      'Trần Văn Trứ', 'Thái Phiên', 'Lê Duẩn', 'Nguyễn Văn Linh',
      'Hoàng Diệu', 'Phan Châu Trinh', 'Lê Lợi', 'Hùng Vương',
      'Trưng Nữ Vương', 'Điện Biên Phủ', 'Ngô Quyền', 'Lý Thái Tổ'
    ];

    // Check for street names
    for (const street of streetNames) {
      if (response.includes(street)) {
        warnings.push(`Response contains specific street name: ${street}`);
      }
    }

    // Check for duplicate patterns
    for (const { pattern, type, message } of duplicatePatterns) {
      const matches = response.match(pattern);
      if (matches && matches.length > 0) {
        if (type === 'uuid') {
          errors.push(message);
        } else {
          warnings.push(`${message}: ${matches.join(', ')}`);
        }
      }
    }

    // Check for property listing format
    const listingPatterns = [
      /cho thuê.*tại.*giá/gi,
      /bán.*tại.*giá/gi,
      /căn hộ.*tại.*\d+/gi,
      /nhà.*tại.*\d+/gi
    ];

    for (const pattern of listingPatterns) {
      if (pattern.test(response)) {
        warnings.push('Response appears to contain property listing format');
        break;
      }
    }

    // Additional checks for results data leakage
    if (results && results.length > 0) {
      // Check if response contains data that should only be in results
      const firstResult = results[0];
      
      if (firstResult.address && response.includes(firstResult.address)) {
        errors.push('Response contains exact address from results');
      }
      
      if (firstResult.title && response.includes(firstResult.title)) {
        errors.push('Response contains exact title from results');
      }
    }

    const isValid = errors.length === 0;

    // Log validation results
    if (!isValid) {
      this.logger.error('Response validation failed', {
        response: response.substring(0, 200) + '...',
        errors,
        warnings
      });
    } else if (warnings.length > 0) {
      this.logger.warn('Response validation warnings', {
        response: response.substring(0, 200) + '...',
        warnings
      });
    }

    return {
      isValid,
      warnings,
      errors
    };
  }

  /**
   * Clean response by removing duplicate information
   */
  static cleanResponse(response: string): string {
    let cleaned = response;

    // Remove specific prices
    cleaned = cleaned.replace(/\d+\s*(triệu|tỷ|million|billion)/gi, 'X triệu');
    
    // Remove specific areas
    cleaned = cleaned.replace(/\d+\s*(m²|m2|mét vuông)/gi, 'X m²');
    
    // Remove numbered lists (convert to general statements)
    cleaned = cleaned.replace(/\d+\.\s*/g, '');
    
    // Remove UUIDs
    cleaned = cleaned.replace(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, '[ID]');

    return cleaned.trim();
  }

  /**
   * Generate a clean advisory response
   */
  static generateCleanResponse(resultsCount: number, query: string): string {
    if (resultsCount === 0) {
      return `Hiện tại tôi chưa tìm thấy bất động sản phù hợp với yêu cầu "${query}". Bạn có thể thử điều chỉnh tiêu chí tìm kiếm hoặc mở rộng khu vực để có thêm lựa chọn.`;
    }

    const responses = [
      `Tôi đã tìm được ${resultsCount > 5 ? 'nhiều' : 'một số'} bất động sản phù hợp với yêu cầu của bạn. Các lựa chọn này có mức giá và diện tích đa dạng, phù hợp cho nhiều mục đích khác nhau. Hãy xem chi tiết và cho tôi biết nếu bạn cần tìm kiếm thêm theo tiêu chí cụ thể!`,
      
      `Dựa trên yêu cầu của bạn, tôi đã tìm thấy ${resultsCount} lựa chọn bất động sản tại khu vực này. Các bất động sản có đặc điểm và mức giá khác nhau, bạn có thể xem chi tiết để chọn lựa phù hợp nhất.`,
      
      `Hiện tại có ${resultsCount} bất động sản phù hợp với tiêu chí tìm kiếm của bạn. Tôi khuyên bạn nên xem xét kỹ từng lựa chọn và liên hệ trực tiếp với chủ nhà để có thông tin chính xác nhất.`
    ];

    // Return random response to avoid repetition
    return responses[Math.floor(Math.random() * responses.length)];
  }
}
