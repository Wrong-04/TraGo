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

const generateWithFallback = async (prompt: string, fallbackPayload: string) => {
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
    return safeParseJson(text, buildFallbackTripPlan(destination, days, budget, interests));
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
    return safeParseJson(text, buildFallbackPhotoDescription(imageContext));
  } catch (error) {
    console.error('Lỗi khi gọi Gemini AI cho mô tả ảnh:', error);
    throw error;
  }
};
