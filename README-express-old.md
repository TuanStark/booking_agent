# 🏠 AI Agent Real Estate Assistant

**Hệ thống AI Agent thông minh chuyên về bất động sản Việt Nam** - Khác biệt hoàn toàn với AI thường bằng khả năng truy cập dữ liệu thực tế và thực hiện hành động cụ thể.

## 🎯 **ĐIỂM KHÁC BIỆT CỐT LÕI**

### 🤖 **AI Agent (Hệ thống này)**
- ✅ **Truy cập DATABASE THỰC TẾ** qua MCP (Model Context Protocol)
- ✅ **8 công cụ chuyên biệt** cho bất động sản
- ✅ **Phân tích thông minh** và chọn tools phù hợp
- ✅ **Dữ liệu real-time** từ hệ thống BDS
- ✅ **Multi-tool execution** - gọi nhiều tools cùng lúc
- ✅ **Fallback system** - OpenAI → Gemini → Demo Mode

### ❌ **AI Thường**
- ❌ Chỉ dựa trên kiến thức cũ đã học
- ❌ Không thể truy cập dữ liệu thực tế
- ❌ Không có tools để thực hiện hành động
- ❌ Thông tin có thể lỗi thời hoặc không chính xác

## 🚀 **TÍNH NĂNG CHÍNH**

### 🧠 **Intelligent AI Services**
- **OpenAI GPT-4o** - Primary AI với function calling và conditional knowledge base
- **Conditional Knowledge Base** - Tự động tối ưu token usage dựa trên độ phức tạp query
- **Demo Mode** - Intelligent tool router khi AI services down

### 🛠️ **8 MCP Tools**
1. **`search_properties`** - Tìm kiếm BDS theo tiêu chí
2. **`smart_property_search`** - Tìm kiếm thông minh bằng ngôn ngữ tự nhiên
3. **`search_properties_by_price_range`** - Tìm kiếm theo khoảng giá
4. **`get_property_details`** - Chi tiết BDS theo ID
5. **`get_featured_properties`** - BDS nổi bật được đề xuất
6. **`get_property_statistics`** - Thống kê thị trường theo khu vực
7. **`get_sale_info`** - Thông tin người bán/môi giới
8. **`get_sales_list`** - Danh sách tất cả sales

### 📊 **Workflow Thông Minh**
```
User Query → AI Analysis → Tool Selection → MCP Execution → Data Aggregation → Response
```

## 🏗️ **KIẾN TRÚC HỆ THỐNG**

```
┌─────────────────┐
│   User Query    │
└─────────┬───────┘
          │
┌─────────▼───────┐
│SuperIntelligent │
│     Agent       │
└─────────┬───────┘
          │
    ┌─────▼─────┐
    │AI Service │
    │ Selection │
    └─────┬─────┘
          │
┌─────────▼───────┐
│   OpenAI GPT-4o │ ──fallback──▶ │  Demo Mode      │
│ + Conditional   │               │ Smart Router    │
│ Knowledge Base  │               │                 │
└─────────┬───────┘               └─────────┬───────┘
          │                                 │
          └─────────────────┬───────────────┘
                            │
                    ┌───────▼───────┐
                    │   MCP Server  │
                    │   8 Tools     │
                    └───────┬───────┘
                            │
                    ┌───────▼───────┐
                    │   Database    │
                    │  Real Estate  │
                    └───────────────┘
```

## 🔧 **CÔNG NGHỆ SỬ DỤNG**

- **Backend**: Node.js + Express
- **AI Services**: OpenAI GPT-4o với conditional knowledge base
- **MCP**: Model Context Protocol cho tool integration
- **Database**: Real estate database via MCP
- **Caching**: In-memory caching
- **Documentation**: Swagger/OpenAPI
- **Token Optimization**: Conditional knowledge loading system

## 🚀 **HƯỚNG DẪN CÀI ĐẶT**

### **Yêu cầu hệ thống**
- Node.js (v18+)
- npm hoặc yarn
- OpenAI API key

### **Cài đặt**

1. **Clone repository:**
```bash
git clone <repository-url>
cd AI-Agent
```

2. **Cài đặt dependencies:**
```bash
npm install
```

3. **Cấu hình environment:**
```bash
cp .env.example .env
# Chỉnh sửa .env với API keys
```

4. **Khởi động server:**
```bash
npm run dev
```

Server sẽ chạy tại `http://localhost:3000`

## 📚 **API DOCUMENTATION**

### **Main Endpoints**

#### **POST /api/v1/super-agent/query**
Gửi câu hỏi cho AI Agent
```json
{
  "query": "Tìm căn hộ 2 phòng ngủ tại Đà Nẵng giá dưới 3 tỷ"
}
```

#### **GET /api/v1/super-agent/status**
Kiểm tra trạng thái hệ thống
```json
{
  "agent": {
    "primaryAI": "OpenAI",
    "fallbackMode": "AI_ONLINE"
  },
  "services": {
    "openai": { "available": true },
    "gemini": { "available": true },
    "mcp": { "connected": true, "toolCount": 8 }
  }
}
```

### **Interactive Documentation**
Truy cập `http://localhost:3000/api-docs` để xem API documentation đầy đủ.

## ⚙️ **CẤU HÌNH**

### **Environment Variables**
```env
# AI Services
OPENAI_API_KEY=your_openai_key
GEMINI_API_KEY=your_gemini_key

# Server
PORT=3000
NODE_ENV=development

# MCP Configuration
MCP_SERVER_PATH=./mcp-servers/hasura-advanced
```

## 📖 **DOCUMENTATION CHI TIẾT**

Xem file `docs/TECHNICAL_DOCUMENTATION.md` để hiểu chi tiết:
- Cách Agent hoạt động
- Giải thích từng dòng code
- Flow xử lý request
- Cách thêm tools mới

## 🧪 **TESTING**

### **Test cơ bản**
```bash
# Kiểm tra status
curl http://localhost:3000/api/v1/super-agent/status

# Test query
curl -X POST http://localhost:3000/api/v1/super-agent/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Tìm căn hộ tại Hà Nội"}'
```

### **Example Queries**
- "Tìm căn hộ 2 phòng ngủ tại Đà Nẵng giá dưới 3 tỷ"
- "Cho tôi thống kê thị trường bất động sản Hải Châu"
- "Tìm bất động sản nổi bật để đầu tư"
- "So sánh giá căn hộ ở Quận 1 và Quận 7"

## 🤝 **CONTRIBUTING**

1. Fork repository
2. Tạo feature branch
3. Implement changes
4. Thêm tests nếu cần
5. Submit pull request

## 📄 **LICENSE**

MIT License - xem file LICENSE để biết chi tiết.
