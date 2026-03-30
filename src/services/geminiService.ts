import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { ProfessionalReview, SequenceReviewItem } from "../types";

const isAiEnabled = import.meta.env.VITE_ENABLE_AI !== 'false';

const ai = isAiEnabled ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;

const SYSTEM_PROMPT = `
You are a SelectPro assistant. Analyse the image and return ONLY valid JSON 
matching this exact schema — no markdown, no explanation:
{
  "compositionScore": 0-10,
  "lightingScore": 0-10,
  "subjectFocusScore": 0-10,
  "overallQuality": 0-10,
  "tags": ["string"],
  "issues": ["string"],
  "keep": true|false
}
`;

export interface SelectionResult {
  filename: string;
  isRejected: boolean;
  rejectType?: 1 | 2 | 3 | 4; // 1: Focus, 2: Motion, 3: Eyes, 4: Composition
  reasons: string[];
  scores: {
    focus: number;
    expression: number;
    composition: number;
    eyesOpen: number;
    lighting: number;
    overall: number;
  };
  analysis: string;
  isHeroPotential: boolean;
  isHorizonTilted?: boolean;
  tags: string[];
  people: {
    name: string;
    confidence: number;
    boundingBox: {
      ymin: number;
      xmin: number;
      ymax: number;
      xmax: number;
    };
    attributes: {
      ageRange: string;
      gender: string;
      emotion: string;
    };
  }[];
}

export type SelectionMode = 'P' | 'A' | 'S' | 'M' | 'L';

export interface AnalysisSettings {
  blurSensitivity?: number;
  compositionEmphasis?: number;
  focusSensitivity?: number;
  emotionDetection?: boolean;
  technicalQuality?: boolean;
  aestheticScoring?: boolean;
  autoRejectBlinks?: boolean;
  blinkSensitivity?: number; // 0-100, where 0 is most lenient (squints ok) and 100 is most strict
  winkStrictness?: number; // 0-100, threshold for switching to minEAR (strict eye checking)
  faceConfidenceThreshold?: number; // 0-100, minimum confidence for face detection
  privacyMode?: 'standard' | 'strict' | 'private';
  anonymizeFaces?: boolean;
  storeMetadata?: boolean;
  mode?: SelectionMode;
  defaultMode?: SelectionMode;
  skipTagging?: boolean;
  shotCount?: number;
  model?: string;
  autoDetectModel?: boolean;
  manualOverride?: boolean;
  localAiOnly?: boolean;
  minSharpnessThreshold?: number;
}

export async function analyzeProfessionalQuality(
  base64Data: string,
  modelName?: string
): Promise<ProfessionalReview> {
  if (!isAiEnabled || !ai) {
    throw new Error("AI features are disabled in this build.");
  }
  const model = modelName || "gemini-2.0-flash";
  const prompt = `Analyze this photograph for professional quality. Rate 1-10 based on:
- Technical: focus sharpness, exposure, composition
- Subject: expression, timing, gesture (for people/events)
- Professional viability: client deliverability

Return JSON only:
{
  "score": 8,
  "keep": true,
  "reason": "...",
  "technical_issues": []
}`;

  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Data.split(",")[1] || base64Data,
            },
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.NUMBER },
          keep: { type: Type.BOOLEAN },
          reason: { type: Type.STRING },
          technical_issues: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["score", "keep", "reason", "technical_issues"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
}

export async function compareSequence(
  images: { id: string, base64: string }[],
  modelName?: string
): Promise<SequenceReviewItem[]> {
  if (!isAiEnabled || !ai) {
    throw new Error("AI features are disabled in this build.");
  }
  const model = modelName || "gemini-2.0-flash";
  
  const imageParts = images.map(img => ({
    inlineData: {
      mimeType: "image/jpeg",
      data: img.base64.split(",")[1] || img.base64
    }
  }));

  const prompt = `Compare these images from the same sequence. Identify the best keeper(s).
Return JSON array with each image scored (0-10) and status as primary/alternate/reject.
The array should match the order of images provided. Use "imageId" for the ID.`;

  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        parts: [
          { text: prompt },
          ...imageParts
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            imageId: { type: Type.STRING },
            score: { type: Type.NUMBER },
            status: { type: Type.STRING, enum: ['primary', 'alternate', 'reject'] }
          },
          required: ["imageId", "score", "status"]
        }
      }
    }
  });

  return JSON.parse(response.text || "[]");
}

export interface ToneCurveSettings {
  toe: number;
  shoulder: number;
  slope: number;
  blackPoint: number;
  whitePoint: number;
}

export async function suggestToneCurve(
  base64Data: string,
  modelName?: string
): Promise<ToneCurveSettings> {
  if (!isAiEnabled || !ai) {
    throw new Error("AI features are disabled in this build.");
  }
  const model = modelName || "gemini-2.0-flash";
  const prompt = `Analyze this photograph and suggest optimal filmic tone curve parameters to enhance its dynamic range and aesthetic appeal.
The parameters are:
- toe: 0.0 to 1.0 (controls shadow compression)
- shoulder: 0.0 to 1.0 (controls highlight compression)
- slope: 0.0 to 2.0 (overall contrast)
- blackPoint: 0.0 to 1.0 (black level)
- whitePoint: 0.0 to 1.0 (white level)

Return JSON only:
{
  "toe": 0.2,
  "shoulder": 0.8,
  "slope": 1.2,
  "blackPoint": 0.02,
  "whitePoint": 0.98
}`;

  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Data.split(",")[1] || base64Data,
            },
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          toe: { type: Type.NUMBER },
          shoulder: { type: Type.NUMBER },
          slope: { type: Type.NUMBER },
          blackPoint: { type: Type.NUMBER },
          whitePoint: { type: Type.NUMBER }
        },
        required: ["toe", "shoulder", "slope", "blackPoint", "whitePoint"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
}

export async function analyzeImage(
  base64Data: string, 
  filename: string, 
  settings?: AnalysisSettings
): Promise<SelectionResult> {
  if (!isAiEnabled || !ai) {
    throw new Error("AI features are disabled in this build.");
  }
  const model = settings?.model || "gemini-2.0-flash";
  
  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        parts: [
          { text: SYSTEM_PROMPT },
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Data.split(",")[1] || base64Data,
            },
          },
        ],
      },
    ],
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          compositionScore: { type: Type.NUMBER },
          lightingScore: { type: Type.NUMBER },
          subjectFocusScore: { type: Type.NUMBER },
          overallQuality: { type: Type.NUMBER },
          tags: { type: Type.ARRAY, items: { type: Type.STRING } },
          issues: { type: Type.ARRAY, items: { type: Type.STRING } },
          keep: { type: Type.BOOLEAN }
        },
        required: ["compositionScore", "lightingScore", "subjectFocusScore", "overallQuality", "tags", "issues", "keep"]
      }
    },
  });

  const rawResult = JSON.parse(response.text || "{}");
  
  // Map back to SelectionResult interface
  return {
    filename,
    isRejected: !rawResult.keep,
    reasons: rawResult.issues || [],
    scores: {
      focus: (rawResult.subjectFocusScore || 0) * 10,
      expression: 50, // Default since new prompt doesn't explicitly score expression
      composition: (rawResult.compositionScore || 0) * 10,
      eyesOpen: 100, // Default
      lighting: (rawResult.lightingScore || 0) * 10,
      overall: (rawResult.overallQuality || 0) * 10,
    },
    analysis: `AI analysis completed. Overall quality: ${rawResult.overallQuality}/10.`,
    isHeroPotential: (rawResult.overallQuality || 0) >= 9,
    tags: rawResult.tags || [],
    people: [] // New prompt doesn't handle people identification
  };
}

export async function identifyObjects(
  base64Data: string,
  modelName?: string
): Promise<string[]> {
  if (!isAiEnabled || !ai) {
    throw new Error("AI features are disabled in this build.");
  }
  const model = modelName || "gemini-2.0-flash";
  const prompt = `Identify all significant objects, landmarks, animals, and key elements in this image. 
Return a simple JSON array of strings containing the names of the identified objects.
Example: ["Mountain", "Lake", "Pine Tree", "Eagle"]`;

  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Data.split(",")[1] || base64Data,
            },
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      }
    }
  });

  return JSON.parse(response.text || "[]");
}
