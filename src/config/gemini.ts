import { GoogleGenerativeAI } from "@google/generative-ai";

// Lấy API key từ biến môi trường
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || "";

// Initialize the Gemini API
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

export const getGeminiModel = () => {
  return genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });
};

// Hàm tiện ích tạo lịch trình
export const generateTripPlan = async (destination: string, days: number, budget: string, interests: string[]) => {
  const model = getGeminiModel();
  
  const prompt = `Bạn là một trợ lý du lịch chuyên nghiệp. Hãy tạo một lịch trình du lịch chi tiết.
  Điểm đến: ${destination}
  Số ngày: ${days} ngày
  Ngân sách: ${budget}
  Sở thích: ${interests.join(", ")}
  
  Vui lòng trả về kết quả dưới dạng JSON với cấu trúc:
  {
    "title": "Tiêu đề chuyến đi",
    "summary": "Mô tả ngắn gọn",
    "days": [
      {
        "day": 1,
        "activities": [
          { "time": "Sáng", "description": "Làm gì đó", "location": "Ở đâu đó" }
        ]
      }
    ]
  }
  Đảm bảo kết quả trả về là JSON thuần tuý (không có markdown \`\`\`json).
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    return JSON.parse(text);
  } catch (error) {
    console.error("Lỗi khi gọi Gemini AI:", error);
    throw error;
  }
};
