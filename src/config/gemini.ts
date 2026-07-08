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

const generateWithFallback = async (prompt: any, fallbackPayload: string) => {
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
  title: `Hành trình khám phá ${destination} tuyệt đỉnh`,
  summary: `Chuyến đi ${days} ngày tới ${destination} với ngân sách ${budget} được thiết kế riêng cho những ai đam mê ${interests.join(', ') || 'khám phá'}.`,
  days: Array.from({ length: Math.max(1, Number(days) || 1) }, (_, index) => ({
    day: index + 1,
    theme: `Khám phá văn hoá và Ẩm thực ngày ${index + 1}`,
    activities: [
      {
        time: '08:30',
        description: `Bắt đầu ngày mới đầy năng lượng với đặc sản địa phương và dạo quanh các góc phố đẹp nhất của ${destination}.`,
        location: `Trung tâm ${destination}`,
        latitude: 16.0544,
        longitude: 108.2022,
        estimatedCost: 100000
      },
      {
        time: '14:00',
        description: `Dành thời gian thư giãn hoặc khám phá văn hóa độc đáo, hòa mình vào nhịp sống của người dân bản địa.`,
        location: `Khu vực sầm uất tại ${destination}`,
        latitude: 16.0644,
        longitude: 108.2122,
        estimatedCost: 200000
      },
      {
        time: '19:00',
        description: `Thưởng thức bữa tối lãng mạn và tận hưởng bầu không khí tuyệt vời về đêm.`,
        location: `Điểm ngắm cảnh tại ${destination}`,
        latitude: 16.0744,
        longitude: 108.2222,
        estimatedCost: 350000
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
  const prompt = `Bạn là một chuyên gia du lịch bản địa am hiểu tường tận về ${destination}. Hãy tạo một lịch trình du lịch ${days} ngày thật chi tiết, xuất sắc và hợp lý.
  Ngân sách: ${budget}
  Sở thích: ${interests.join(", ")}
  
  YÊU CẦU QUAN TRỌNG VỀ ĐỊA ĐIỂM VÀ LỊCH TRÌNH:
  1. CỤ THỂ VÀ CHÍNH XÁC: Các địa điểm (location) LÀ NHỮNG NƠI CÓ THẬT 100%. Tuyệt đối KHÔNG ĐƯỢC viết chung chung như "Nhà hàng địa phương", "Chợ đêm", "Quán cà phê". PHẦI NÊU ĐÍCH DANH tên quán, tên đường, tên khu vực cụ thể (VD: "Bún chả Hương Liên", "Chợ đêm HảI Sản Dinh Cậu", "Cà phê RuNam").
  2. KHÔNG LẶP LẠI: Các địa điểm và hoạt động tuyệt đối KHÔNG ĐƯỢC lặp lại giữa các ngày. Mỗi ngày phải là một trải nghiệm hoàn toàn mới lạ với các chủ đề (theme) khác nhau.
  3. MÔ TẢ HẤP DẪN: Phần mô tả (description) phải giàu cảm xúc, sinh động và chi tiết. Thay vì viết "Ăn tối và đi dạo", hãy viết "Thưởng thức hải sản tươi rói ngập tràn hương vị biển cả, sau đó dạo bước hóng gió biển rì rào dưới ánh đèn lung linh".
  4. LỘ TRÌNH THÔNG MINH: Phải sắp xếp các địa điểm trong cùng một ngày ở GẦN NHAU (cùng một khu vực/quận) để tối ưu quãng đường và thời gian di chuyển.
  5. THỰC TẾ: Thời gian (time) là giờ cụ thể định dạng HH:MM (VD: 08:30). Chi phí ước tính (estimatedCost) của TỪNG HOẠT ĐỘNG phải CỰC KỲ SÁT với giá cả thực tế tại địa phương (đơn vị VND, số nguyên). Tổng chi phí KHÔNG vượt quá Ngân sách.

  Vui lòng trả về kết quả dưới dạng JSON với cấu trúc:
  {
    "title": "Tiêu đề chuyến đi (Viết thật giật tít, hấp dẫn, lôi cuốn)",
    "summary": "Mô tả ngắn gọn nhưng truyền cảm hứng mạnh mẽ, khiến người dùng muốn xách balo lên và đi ngay lập tức.",
    "days": [
      {
        "day": 1,
        "theme": "Chủ đề của ngày (VD: Khám phá di sản, Thiên đường ẩm thực...)",
        "activities": [
          { "time": "08:30", "description": "Mô tả thật sinh động, hấp dẫn, có hồn", "location": "Tên địa điểm CỤ THỂ, CÓ THẬT (VD: Bánh mì Phượng, Hội An)", "latitude": 16.0123, "longitude": 108.0123, "estimatedCost": 150000 }
        ]
      }
    ]
  }
  Đảm bảo kết quả trả về là JSON thuần tuý (không có markdown \`\`\`json).`;

  try {
    const fallbackPayload = JSON.stringify(buildFallbackTripPlan(destination, days, budget, interests));
    const text = await generateWithFallback(prompt, fallbackPayload);
    return JSON.parse(text);
  } catch (error) {
    console.error('Lỗi khi gọi Gemini AI:', error);
    throw error;
  }
};

export const generatePhotoDescription = async (base64Image: string, contextText: string) => {
  const promptParts = [
    {
      inlineData: {
        data: base64Image,
        mimeType: "image/jpeg"
      }
    },
    `Bạn là một chuyên gia du lịch và nhiếp ảnh. Dựa trên bức ảnh này${contextText ? ' và thông tin thêm: ' + contextText : ''}, hãy viết một caption du lịch thật hay, giàu cảm xúc bằng tiếng Việt để đăng mạng xã hội, cùng với các hashtag phù hợp. Trả về kết quả dưới dạng JSON thuần tuý như sau:
    {
      "description": "...",
      "hashtags": "#hashtag1 #hashtag2 ..."
    }
    Tuyệt đối không kèm theo markdown (như \`\`\`json).`
  ];

  try {
    const fallbackPayload = JSON.stringify(buildFallbackPhotoDescription(contextText));
    const text = await generateWithFallback(promptParts, fallbackPayload);
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanText);
  } catch (error) {
    console.error('Lỗi khi gọi Gemini AI cho mô tả ảnh:', error);
    throw error;
  }
};
