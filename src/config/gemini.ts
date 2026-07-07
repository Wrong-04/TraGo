import { GoogleGenerativeAI } from "@google/generative-ai";

// Lấy API key từ biến môi trường
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || "";

// Initialize the Gemini API
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const GEMINI_MODEL_CANDIDATES = [
  "gemini-1.5-flash",
  "gemini-1.5-pro",
  "gemini-2.0-flash",
];

export const getGeminiModel = (modelName = GEMINI_MODEL_CANDIDATES[0]) => {
  return genAI.getGenerativeModel({ model: modelName });
};

const isServiceUnavailableError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  return /429|quota|rate limit|exceeded|not found|unsupported|failed to fetch|service unavailable/i.test(message);
};

const generateWithFallback = async (prompt: string, fallbackPayload: string) => {
  if (!GEMINI_API_KEY.trim()) {
    return fallbackPayload;
  }

  let lastError: unknown;

  for (const modelName of GEMINI_MODEL_CANDIDATES) {
    try {
      const model = getGeminiModel(modelName);
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      lastError = error;
      console.warn(`Gemini model ${modelName} failed`, error);
    }
  }

  if (lastError && isServiceUnavailableError(lastError)) {
    console.warn('Gemini service unavailable, using local fallback content.');
    return fallbackPayload;
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Unable to generate Gemini response.');
};

const buildFallbackTripPlan = (destination: string, days: number, budget: string, interests: string[]) => ({
  title: `Explore ${destination}`,
  summary: `A flexible ${days}-day plan for ${destination} that fits a budget of ${budget} and matches your interests in ${interests.join(', ') || 'local highlights'}.`,
  days: Array.from({ length: Math.max(1, Number(days) || 1) }, (_, index) => ({
    day: index + 1,
    activities: [
      {
        time: 'Morning',
        description: `Start with a local breakfast and a relaxed walk through the main sights of ${destination}.`,
        location: `City center of ${destination}`,
      },
      {
        time: 'Afternoon',
        description: `Enjoy a lunch spot and a short cultural or nature activity based on your interests.`,
        location: `Popular area in ${destination}`,
      },
      {
        time: 'Evening',
        description: `Finish the day with dinner and a scenic view or local performance.`,
        location: `Sunset area in ${destination}`,
      },
    ],
  })),
});

const buildFallbackPhotoDescription = (imageContext: string) => ({
  description: `A memorable travel moment captured in ${imageContext || 'a beautiful destination'}, with warm light and a lively atmosphere.`,
  hashtags: '#travel #photography #adventure #wanderlust',
});

// Hàm tiện ích tạo lịch trình
export const generateTripPlan = async (destination: string, days: number, budget: string, interests: string[]) => {
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
    const fallbackPayload = JSON.stringify(buildFallbackTripPlan(destination, days, budget, interests));
    const text = await generateWithFallback(prompt, fallbackPayload);
    return JSON.parse(text);
  } catch (error) {
    console.error('Lỗi khi gọi Gemini AI:', error);
    throw error;
  }
};

export const generatePhotoDescription = async (imageContext: string) => {
  const prompt = `Bạn là một trợ lý nội dung mạng xã hội. Dựa trên thông tin sau: "${imageContext}", hãy viết một mô tả du lịch hấp dẫn bằng tiếng Việt cho bức ảnh, cùng với các hashtag phù hợp. Trả về kết quả dưới dạng JSON như sau:
  {
    "description": "...",
    "hashtags": "#hashtag1 #hashtag2 ..."
  }
  Chỉ trả về JSON, không kèm chú giải hay định dạng markdown.`;

  try {
    const fallbackPayload = JSON.stringify(buildFallbackPhotoDescription(imageContext));
    const text = await generateWithFallback(prompt, fallbackPayload);
    return JSON.parse(text);
  } catch (error) {
    console.error('Lỗi khi gọi Gemini AI cho mô tả ảnh:', error);
    throw error;
  }
};
