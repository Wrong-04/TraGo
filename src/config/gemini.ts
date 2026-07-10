import { GoogleGenerativeAI } from "@google/generative-ai";

// Lấy API key từ biến môi trường
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || "";

// Initialize the Gemini API
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const DEFAULT_GEMINI_MODEL_PREFERENCES = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash",
  "gemini-1.5-flash-latest",
  "gemini-1.5-pro-latest",
];

const ENV_MODEL_CANDIDATES = (process.env.EXPO_PUBLIC_GEMINI_MODELS || "")
  .split(",")
  .map((name: string) => name.trim())
  .filter(Boolean);

const HARD_FALLBACK_MODELS = [...ENV_MODEL_CANDIDATES, ...DEFAULT_GEMINI_MODEL_PREFERENCES];

type GeminiModelListResponse = {
  models?: Array<{
    name?: string;
    supportedGenerationMethods?: string[];
  }>;
};

let cachedModelCandidates: string[] | null = null;
let cachedModelCandidatesAt = 0;
const MODEL_CACHE_TTL_MS = 10 * 60 * 1000;
let didWarnGeminiUnavailable = false;

const getErrorMessage = (error: unknown) => {
  return error instanceof Error ? error.message : String(error);
};

const shortenErrorMessage = (message: string, maxLength = 180) => {
  const compact = message.replace(/\s+/g, " ").trim();
  return compact.length > maxLength ? `${compact.slice(0, maxLength)}...` : compact;
};

export const getGeminiModel = (modelName = getInitialModelName()) => {
  return genAI.getGenerativeModel({ model: modelName });
};

const getInitialModelName = () => HARD_FALLBACK_MODELS[0] || "gemini-2.5-flash";

export const getDefaultGeminiModel = () => {
  return genAI.getGenerativeModel({ model: getInitialModelName() });
};

const listAvailableGeminiModels = async (): Promise<string[]> => {
  if (!GEMINI_API_KEY.trim()) {
    return [];
  }

  const now = Date.now();
  if (cachedModelCandidates && now - cachedModelCandidatesAt < MODEL_CACHE_TTL_MS) {
    return cachedModelCandidates;
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(GEMINI_API_KEY)}`
    );

    if (!response.ok) {
      throw new Error(`List models failed with status ${response.status}`);
    }

    const data = (await response.json()) as GeminiModelListResponse;
    const availableModels = (data.models || [])
      .filter((model) => model.supportedGenerationMethods?.includes("generateContent"))
      .map((model) => (model.name || "").replace(/^models\//, ""))
      .filter(Boolean);

    if (availableModels.length === 0) {
      cachedModelCandidates = HARD_FALLBACK_MODELS;
      cachedModelCandidatesAt = now;
      return cachedModelCandidates;
    }

    const preferred = [...ENV_MODEL_CANDIDATES, ...DEFAULT_GEMINI_MODEL_PREFERENCES].filter((name) =>
      availableModels.includes(name)
    );

    const ordered = [...new Set([...preferred, ...availableModels])];
    cachedModelCandidates = ordered;
    cachedModelCandidatesAt = now;
    return ordered;
  } catch (error) {
    console.warn("Unable to list Gemini models. Using fallback model list.");
    cachedModelCandidates = HARD_FALLBACK_MODELS;
    cachedModelCandidatesAt = now;
    return cachedModelCandidates;
  }
};

const isServiceUnavailableError = (error: unknown) => {
  const message = getErrorMessage(error);
  return /429|quota|rate limit|exceeded|not found|unsupported|failed to fetch|service unavailable/i.test(message);
};

const isQuotaExceededError = (error: unknown) => {
  const message = getErrorMessage(error);
  return /429|quota exceeded|free_tier|rate limit/i.test(message);
};

const safeParseJson = <T>(text: string, fallback: T): T => {
  try {
    return JSON.parse(text) as T;
  } catch {
    const jsonBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (jsonBlockMatch?.[1]) {
      try {
        return JSON.parse(jsonBlockMatch[1]) as T;
      } catch {
        // Fall through to object extraction.
      }
    }

    const firstBrace = text.indexOf("{");
    const lastBrace = text.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(text.slice(firstBrace, lastBrace + 1)) as T;
      } catch {
        return fallback;
      }
    }

    return fallback;
  }
};

const parseBudgetValue = (budget: string | number) => {
  if (typeof budget === "number") return Number.isFinite(budget) ? Math.max(0, Math.round(budget)) : 0;
  const numeric = Number(String(budget || "").replace(/[^\d]/g, ""));
  return Number.isFinite(numeric) ? Math.max(0, Math.round(numeric)) : 0;
};

const clampNumber = (value: unknown, fallback: number) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return fallback;
};

type TripPlanActivity = {
  time: string;
  description: string;
  location: string;
  latitude?: number;
  longitude?: number;
  estimatedCost?: number;
};

type TripPlanDay = {
  day: number;
  date?: string;
  theme?: string;
  estimatedCost?: number;
  activities: TripPlanActivity[];
};

type TripPlanResult = {
  title: string;
  summary: string;
  totalEstimatedCost?: number;
  days: TripPlanDay[];
};

const normalizeTripPlan = (
  raw: TripPlanResult,
  destination: string,
  days: number,
  budget: string
): TripPlanResult => {
  const targetDays = Math.max(1, Number(days) || 1);
  const targetBudget = parseBudgetValue(budget);
  const rawDays = Array.isArray(raw?.days) ? raw.days : [];

  const normalizedDays: TripPlanDay[] = Array.from({ length: targetDays }, (_, index) => {
    const sourceDay = rawDays[index];
    const activities: TripPlanActivity[] = Array.isArray(sourceDay?.activities)
      ? sourceDay.activities
          .slice(0, 6)
          .map((act, actIndex) => ({
            time: typeof act?.time === "string" && act.time.trim() ? act.time : `${8 + actIndex * 3}:00`,
            description: typeof act?.description === "string" && act.description.trim()
              ? act.description
              : `Khám phá ${destination} theo lịch trình gợi ý`,
            location: typeof act?.location === "string" && act.location.trim()
              ? act.location
              : `Điểm dừng ${actIndex + 1} tại ${destination}`,
            latitude: clampNumber(act?.latitude, 16.0544 + index * 0.01 + actIndex * 0.003),
            longitude: clampNumber(act?.longitude, 108.2022 + index * 0.01 + actIndex * 0.003),
            estimatedCost: Math.max(0, Math.round(clampNumber(act?.estimatedCost, 0))),
          }))
      : [];

    if (activities.length === 0) {
      activities.push(
        {
          time: "08:30",
          description: `Khởi động ngày mới tại ${destination} với bữa sáng địa phương.`,
          location: `Trung tâm ${destination}`,
          latitude: 16.0544 + index * 0.01,
          longitude: 108.2022 + index * 0.01,
          estimatedCost: 120000,
        },
        {
          time: "14:00",
          description: `Tham quan điểm nổi bật và trải nghiệm văn hóa bản địa.`,
          location: `Khu tham quan ngày ${index + 1} tại ${destination}`,
          latitude: 16.0644 + index * 0.01,
          longitude: 108.2122 + index * 0.01,
          estimatedCost: 200000,
        },
        {
          time: "19:00",
          description: "Ăn tối và đi bộ thư giãn buổi tối.",
          location: `Khu ẩm thực ${destination}`,
          latitude: 16.0744 + index * 0.01,
          longitude: 108.2222 + index * 0.01,
          estimatedCost: 250000,
        }
      );
    }

    const dayCostFromActivities = activities.reduce((sum, act) => sum + (act.estimatedCost || 0), 0);
    const dayCost = Math.max(0, Math.round(clampNumber(sourceDay?.estimatedCost, dayCostFromActivities)));

    return {
      day: index + 1,
      date: sourceDay?.date,
      theme:
        typeof sourceDay?.theme === "string" && sourceDay.theme.trim()
          ? sourceDay.theme
          : `Lịch trình ngày ${index + 1}`,
      estimatedCost: dayCost,
      activities,
    };
  });

  if (targetBudget > 0) {
    const currentTotal = normalizedDays.reduce((sum, day) => sum + (day.estimatedCost || 0), 0);
    const fallbackPerDay = Math.max(1, Math.round(targetBudget / targetDays));

    if (currentTotal <= 0) {
      normalizedDays.forEach((day, dayIndex) => {
        day.estimatedCost = dayIndex === targetDays - 1
          ? Math.max(0, targetBudget - fallbackPerDay * (targetDays - 1))
          : fallbackPerDay;
      });
    } else {
      const scaled = normalizedDays.map((day) => Math.max(0, Math.round(((day.estimatedCost || 0) / currentTotal) * targetBudget)));
      const scaledSum = scaled.reduce((sum, value) => sum + value, 0);
      const diff = targetBudget - scaledSum;
      if (scaled.length > 0) {
        scaled[scaled.length - 1] = Math.max(0, scaled[scaled.length - 1] + diff);
      }
      normalizedDays.forEach((day, index) => {
        day.estimatedCost = scaled[index] ?? 0;
      });
    }

    normalizedDays.forEach((day) => {
      const dayTotal = day.estimatedCost || 0;
      const actTotal = day.activities.reduce((sum, act) => sum + (act.estimatedCost || 0), 0);
      if (day.activities.length === 0) return;

      if (actTotal <= 0) {
        const perAct = Math.max(1, Math.round(dayTotal / day.activities.length));
        day.activities = day.activities.map((act, index) => ({
          ...act,
          estimatedCost: index === day.activities.length - 1
            ? Math.max(0, dayTotal - perAct * (day.activities.length - 1))
            : perAct,
        }));
      } else {
        const scaledActs = day.activities.map((act) => Math.max(0, Math.round(((act.estimatedCost || 0) / actTotal) * dayTotal)));
        const scaledActsSum = scaledActs.reduce((sum, value) => sum + value, 0);
        const actDiff = dayTotal - scaledActsSum;
        if (scaledActs.length > 0) {
          scaledActs[scaledActs.length - 1] = Math.max(0, scaledActs[scaledActs.length - 1] + actDiff);
        }
        day.activities = day.activities.map((act, index) => ({ ...act, estimatedCost: scaledActs[index] ?? 0 }));
      }
    });
  } else {
    normalizedDays.forEach((day) => {
      const sumActs = day.activities.reduce((sum, act) => sum + (act.estimatedCost || 0), 0);
      day.estimatedCost = sumActs;
    });
  }

  const totalEstimatedCost = normalizedDays.reduce((sum, day) => sum + (day.estimatedCost || 0), 0);

  return {
    title: raw?.title || `Lịch trình khám phá ${destination}`,
    summary: raw?.summary || `Gợi ý hành trình ${targetDays} ngày tối ưu theo nhu cầu của bạn tại ${destination}.`,
    totalEstimatedCost,
    days: normalizedDays,
  };
};

const generateWithFallback = async (prompt: any, fallbackPayload: string) => {
  if (!GEMINI_API_KEY.trim()) {
    return fallbackPayload;
  }

  const modelCandidates = await listAvailableGeminiModels();
  const modelsToTry = modelCandidates.length > 0 ? modelCandidates : HARD_FALLBACK_MODELS;
  let lastError: unknown;

  for (const modelName of modelsToTry) {
    try {
      const model = getGeminiModel(modelName);
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      lastError = error;
      if (isQuotaExceededError(error)) {
        if (!didWarnGeminiUnavailable) {
          didWarnGeminiUnavailable = true;
          const shortReason = shortenErrorMessage(getErrorMessage(error));
          console.warn(`Gemini quota exceeded on model ${modelName}. Using local fallback content. Reason: ${shortReason}`);
        }
        return fallbackPayload;
      }

      const message = getErrorMessage(error);
      if (/404|not found|unsupported/i.test(message)) {
        continue;
      }

      console.warn(`Gemini model ${modelName} failed: ${shortenErrorMessage(message)}`);
    }
  }

  if (lastError && isServiceUnavailableError(lastError)) {
    if (!didWarnGeminiUnavailable) {
      didWarnGeminiUnavailable = true;
      console.warn("Gemini service unavailable, using local fallback content.");
    }
    return fallbackPayload;
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Unable to generate Gemini response.');
};

const buildFallbackTripPlan = (destination: string, days: number, budget: string, interests: string[]) => {
  const fallback: TripPlanResult = {
    title: `Hành trình khám phá ${destination} tuyệt đỉnh`,
    summary: `Chuyến đi ${days} ngày tới ${destination} với ngân sách ${budget} được thiết kế riêng cho những ai đam mê ${interests.join(', ') || 'khám phá'}.`,
    days: Array.from({ length: Math.max(1, Number(days) || 1) }, (_, index) => ({
      day: index + 1,
      theme: `Khám phá văn hoá và Ẩm thực ngày ${index + 1}`,
      estimatedCost: 0,
      activities: [
        {
          time: '08:30',
          description: `Bắt đầu ngày mới đầy năng lượng với đặc sản địa phương và dạo quanh các góc phố đẹp nhất của ${destination}.`,
          location: `Trung tâm ${destination}`,
          latitude: 16.0544 + index * 0.01,
          longitude: 108.2022 + index * 0.01,
          estimatedCost: 100000,
        },
        {
          time: '14:00',
          description: `Dành thời gian thư giãn hoặc khám phá văn hóa độc đáo, hòa mình vào nhịp sống của người dân bản địa.`,
          location: `Khu vực sầm uất tại ${destination}`,
          latitude: 16.0644 + index * 0.01,
          longitude: 108.2122 + index * 0.01,
          estimatedCost: 200000,
        },
        {
          time: '19:00',
          description: `Thưởng thức bữa tối lãng mạn và tận hưởng bầu không khí tuyệt vời về đêm.`,
          location: `Điểm ngắm cảnh tại ${destination}`,
          latitude: 16.0744 + index * 0.01,
          longitude: 108.2222 + index * 0.01,
          estimatedCost: 350000,
        },
      ],
    })),
  };

  return normalizeTripPlan(fallback, destination, days, budget);
};

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
  5. THỰC TẾ: Thời gian (time) là giờ cụ thể định dạng HH:MM (VD: 08:30). Chi phí ước tính (estimatedCost) của TỪNG HOẠT ĐỘNG phải CỰC KỲ SÁT với giá cả thực tế tại địa phương (đơn vị VND, số nguyên).
  6. BẮT BUỘC NGÂN SÁCH: Mỗi ngày PHẢI có estimatedCost cho cả ngày. Tổng estimatedCost của tất cả ngày PHẢI gần bằng ngân sách người dùng đã nhập (sai số <= 5%).
  7. TỌA ĐỘ BẢN ĐỒ: Mỗi hoạt động phải có latitude và longitude hợp lệ để app ghim marker lên bản đồ.

  Vui lòng trả về kết quả dưới dạng JSON với cấu trúc:
  {
    "title": "Tiêu đề chuyến đi (Viết thật giật tít, hấp dẫn, lôi cuốn)",
    "summary": "Mô tả ngắn gọn nhưng truyền cảm hứng mạnh mẽ, khiến người dùng muốn xách balo lên và đi ngay lập tức.",
    "totalEstimatedCost": 5000000,
    "days": [
      {
        "day": 1,
        "date": "YYYY-MM-DD",
        "theme": "Chủ đề của ngày (VD: Khám phá di sản, Thiên đường ẩm thực...)",
        "estimatedCost": 1600000,
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
    const parsed = safeParseJson<TripPlanResult>(text, buildFallbackTripPlan(destination, days, budget, interests));
    return normalizeTripPlan(parsed, destination, days, budget);
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
    return safeParseJson(text, buildFallbackPhotoDescription(contextText));
  } catch (error) {
    console.error('Lỗi khi gọi Gemini AI cho mô tả ảnh:', error);
    throw error;
  }
};

export const generateTripDetails = async (city: string) => {
  const fallback = {
    title: `Khám phá ${city}`,
    description: `Lịch trình du lịch được đề xuất cho ${city}, ưu tiên các điểm nổi bật và trải nghiệm địa phương.`,
    budget: 5000000,
    tags: ['Ẩm thực', 'Check-in', 'Thư giãn'],
  };

  const prompt = `Dựa trên thành phố ${city}, trả về JSON thuần với cấu trúc:
  {
    "title": "...",
    "description": "...",
    "budget": 5000000,
    "tags": ["Biển", "Ẩm thực"]
  }
  Chỉ trả JSON.`;

  try {
    const text = await generateWithFallback(prompt, JSON.stringify(fallback));
    return safeParseJson(text, fallback);
  } catch {
    return fallback;
  }
};

export const generateExpenseAdvice = async (budget: number, expenses: Array<{ amount?: number; category?: string; description?: string }>) => {
  const totalSpent = expenses.reduce((sum, item) => sum + (item.amount || 0), 0);
  const fallback = totalSpent > budget
    ? `Bạn đã chi ${totalSpent.toLocaleString('vi-VN')}đ, vượt ngân sách ${budget.toLocaleString('vi-VN')}đ. Nên giảm các khoản ăn uống và di chuyển không cần thiết.`
    : `Bạn đã chi ${totalSpent.toLocaleString('vi-VN')}đ trên tổng ngân sách ${budget.toLocaleString('vi-VN')}đ. Hiện vẫn kiểm soát tốt, hãy ưu tiên các trải nghiệm chính.`;

  const prompt = `Bạn là trợ lý tài chính du lịch. Dựa trên dữ liệu:
  - Ngân sách: ${budget}
  - Đã chi: ${totalSpent}
  - Danh sách chi tiêu: ${JSON.stringify(expenses)}
  Viết 3-5 câu tiếng Việt, ngắn gọn, dễ hiểu, có gợi ý tối ưu chi tiêu.`;

  try {
    const text = await generateWithFallback(prompt, fallback);
    return text?.trim() || fallback;
  } catch {
    return fallback;
  }
};

export const generateWeatherAdvice = async (city: string, currentWeather: { temperature?: number; windspeed?: number; weathercode?: number }) => {
  const fallback = `Thời tiết tại ${city} hiện khoảng ${Math.round(currentWeather?.temperature || 0)}°C. Hãy chuẩn bị trang phục phù hợp và ưu tiên hoạt động ngoài trời vào buổi sáng hoặc chiều mát.`;

  const prompt = `Bạn là trợ lý du lịch theo thời tiết. Dữ liệu hiện tại tại ${city}: ${JSON.stringify(currentWeather)}.
  Hãy trả lời bằng tiếng Việt, ngắn gọn 3-4 câu: nên làm gì, tránh gì, mang theo gì.`;

  try {
    const text = await generateWithFallback(prompt, fallback);
    return text?.trim() || fallback;
  } catch {
    return fallback;
  }
};

export const generateJournalAdvice = async (city: string, places: string) => {
  const fallback = `Hôm nay mình đã có một ngày đáng nhớ tại ${city}. Mỗi điểm đến ${places ? `như ${places}` : ''} đều mang lại những cảm xúc rất riêng, từ hào hứng khám phá đến khoảnh khắc thư giãn nhẹ nhàng.`;

  const prompt = `Viết một đoạn nhật ký du lịch bằng tiếng Việt (120-180 từ), giọng kể tự nhiên, ấm áp.
  Thành phố: ${city}
  Các địa điểm: ${places}`;

  try {
    const text = await generateWithFallback(prompt, fallback);
    return text?.trim() || fallback;
  } catch {
    return fallback;
  }
};
