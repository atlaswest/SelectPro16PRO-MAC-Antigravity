import * as faceapi from 'face-api.js';
import cv from '@techstark/opencv-js';
import { GoogleGenAI } from "@google/genai";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface FaceResult {
  bounds: { x: number; y: number; width: number; height: number };
  smileScore: number;       // 0–1  (from expression.happy)
  eyeOpenScore: number;     // 0–1  (derived from EAR landmark geometry)
  expression: string;       // dominant expression label
}

export interface LocalScores {
  faceCount: number;
  faces: FaceResult[];
  sharpnessScore: number;   // 0–1  (normalised Laplacian variance)
  blurry: boolean;
}

export interface GeminiScores {
  compositionScore: number; // 0–10
  lightingScore: number;
  subjectFocusScore: number;
  overallQuality: number;
  tags: string[];
  issues: string[];
  keep: boolean;
}

export interface PhotoScore {
  finalScore: number;       // 0–1  weighted composite
  grade: 'hero' | 'keep' | 'maybe' | 'reject';
  local: LocalScores | null;
  cloud: GeminiScores | null;
  analysedAt: number;
  durationMs: number;
}

export type WorkerInMessage =
  | { type: 'init';    modelsPath: string; geminiKey: string }
  | { type: 'analyse'; jobId: string; imagePath: string; imageDataUrl: string; provider?: string; localOnly?: boolean }
  | { type: 'cancel';  jobId: string };

export type WorkerOutMessage =
  | { type: 'ready' }
  | { type: 'progress'; jobId: string; stage: 'local' | 'cloud' | 'done'; partial?: Partial<PhotoScore> }
  | { type: 'result';   jobId: string; score: PhotoScore }
  | { type: 'error';    jobId: string; message: string };

// ─── State ───────────────────────────────────────────────────────────────────

let modelsLoaded = false;
let geminiApiKey = '';
const cancelledJobs = new Set<string>();

// ─── Init ────────────────────────────────────────────────────────────────────

async function initModels(modelsPath: string, apiKey: string): Promise<void> {
  if (modelsLoaded) return;
  geminiApiKey = apiKey;

  // Load only the three lightweight models needed for SelectPro
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(modelsPath),
    faceapi.nets.faceExpressionNet.loadFromUri(modelsPath),
    faceapi.nets.faceLandmark68TinyNet.loadFromUri(modelsPath),
  ]);

  modelsLoaded = true;
  self.postMessage({ type: 'ready' } satisfies WorkerOutMessage);
}

// ─── Eye aspect ratio (EAR) ──────────────────────────────────────────────────
// Uses 6 landmark points per eye from the 68-point model.
// EAR < 0.2 = closed, > 0.3 = open.

function eyeAspectRatio(pts: faceapi.Point[]): number {
  const dist = (a: faceapi.Point, b: faceapi.Point) =>
    Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);

  const vertical1 = dist(pts[1], pts[5]);
  const vertical2 = dist(pts[2], pts[4]);
  const horizontal = dist(pts[0], pts[3]);
  return (vertical1 + vertical2) / (2.0 * horizontal);
}

function eyeOpenScore(landmarks: faceapi.FaceLandmarks68): number {
  const leftEAR  = eyeAspectRatio(landmarks.getLeftEye());
  const rightEAR = eyeAspectRatio(landmarks.getRightEye());
  const avg = (leftEAR + rightEAR) / 2;
  // Normalise: 0.18 = fully closed → 0, 0.35 = fully open → 1
  return Math.min(1, Math.max(0, (avg - 0.18) / (0.35 - 0.18)));
}

// ─── Sharpness via Laplacian variance (OpenCV.js) ────────────────────────────

async function laplacianSharpness(imageDataUrl: string): Promise<number> {
  const blob = await (await fetch(imageDataUrl)).blob();
  const bitmap = await createImageBitmap(blob);
  
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0);
  const imageData = ctx.getImageData(0, 0, bitmap.width, bitmap.height);

  // Convert to OpenCV Mat
  const src = cv.matFromImageData(imageData);
  const gray = new cv.Mat();
  const lap = new cv.Mat();
  const mean = new cv.Mat();
  const stddev = new cv.Mat();

  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
  cv.Laplacian(gray, lap, cv.CV_64F);
  cv.meanStdDev(lap, mean, stddev);

  const variance = stddev.data64F[0] ** 2;

  src.delete(); gray.delete(); lap.delete(); mean.delete(); stddev.delete();
  bitmap.close();

  // Empirically: < 50 = blurry, > 500 = sharp. Normalise to 0–1.
  return Math.min(1, Math.max(0, (variance - 50) / 450));
}

// ─── Local analysis (face-api.js + OpenCV) ───────────────────────────────────

async function runLocalAnalysis(imageDataUrl: string): Promise<LocalScores> {
  const blob = await (await fetch(imageDataUrl)).blob();
  const img = await createImageBitmap(blob);

  // face-api.js might need a canvas to work in a worker
  const canvas = new OffscreenCanvas(img.width, img.height);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);

  const detections = await faceapi
    .detectAllFaces(canvas as any, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks(true)
    .withFaceExpressions();

  const faces: FaceResult[] = detections.map((d) => {
    const { x, y, width, height } = d.detection.box;
    const expEntries = Object.entries(d.expressions) as [string, number][];
    const dominantExpr = expEntries.reduce((a, b) => (b[1] > a[1] ? b : a))[0];

    return {
      bounds: { x, y, width, height },
      smileScore:   d.expressions.happy,
      eyeOpenScore: eyeOpenScore(d.landmarks),
      expression:   dominantExpr,
    };
  });

  const sharpnessScore = await laplacianSharpness(imageDataUrl);
  img.close();

  return {
    faceCount: faces.length,
    faces,
    sharpnessScore,
    blurry: sharpnessScore < 0.25,
  };
}

// ─── Cloud analysis (Gemini) ─────────────────────────────────────────────────

const GEMINI_SYSTEM = `You are a professional SelectPro assistant for a photographer.
Analyse the image and return ONLY valid JSON — no markdown, no preamble:
{
  "compositionScore": 0-10,
  "lightingScore": 0-10,
  "subjectFocusScore": 0-10,
  "overallQuality": 0-10,
  "tags": ["string"],
  "issues": ["string"],
  "keep": true|false
}`;

async function runGeminiAnalysis(
  imageDataUrl: string,
  jobId: string
): Promise<GeminiScores | null> {
  if (!geminiApiKey) return null;

  // Strip the data: prefix for the API
  const base64 = imageDataUrl.split(',')[1];
  const mimeType = imageDataUrl.split(';')[0].split(':')[1];

  const ai = new GoogleGenAI({ apiKey: geminiApiKey });
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [
        {
          parts: [
            { text: GEMINI_SYSTEM },
            { inlineData: { mimeType, data: base64 } }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
      }
    });

    const text = response.text;
    if (!text) return null;
    
    return JSON.parse(text) as GeminiScores;
  } catch (error) {
    console.error(`Gemini analysis failed for job ${jobId}:`, error);
    return null;
  }
}

// ─── Finalize Score ──────────────────────────────────────────────────────────

function finalizeScore(local: LocalScores, cloud: GeminiScores | null, startTime: number): PhotoScore {
  let finalScore = 0;
  
  if (cloud) {
    // Weighted merge
    // Cloud: 60%, Local: 40%
    const cloudAvg = (cloud.compositionScore + cloud.lightingScore + cloud.subjectFocusScore + cloud.overallQuality) / 40; // 0-1
    
    // Local components
    const sharpness = local.sharpnessScore;
    const faceQuality = local.faceCount > 0 
      ? local.faces.reduce((acc, f) => acc + (f.smileScore + f.eyeOpenScore) / 2, 0) / local.faceCount
      : 1.0; // No faces is neutral
      
    finalScore = (cloudAvg * 0.6) + (sharpness * 0.2) + (faceQuality * 0.2);
  } else {
    // Local only
    finalScore = (local.sharpnessScore * 0.5) + (local.faceCount > 0 
      ? (local.faces.reduce((acc, f) => acc + (f.smileScore + f.eyeOpenScore) / 2, 0) / local.faceCount) * 0.5
      : 0.5);
  }

  let grade: PhotoScore['grade'] = 'maybe';
  if (finalScore > 0.85) grade = 'hero';
  else if (finalScore > 0.6) grade = 'keep';
  else if (finalScore < 0.3 || local.blurry) grade = 'reject';

  return {
    finalScore,
    grade,
    local,
    cloud,
    analysedAt: Date.now(),
    durationMs: Date.now() - startTime,
  };
}

// ─── Run Analysis ────────────────────────────────────────────────────────────

async function runAnalysis(jobId: string, imagePath: string, imageDataUrl: string, provider?: string, localOnly?: boolean) {
  const startTime = Date.now();
  try {
    // 1. Local Analysis
    self.postMessage({ type: 'progress', jobId, stage: 'local' } satisfies WorkerOutMessage);
    const local = await runLocalAnalysis(imageDataUrl);
    
    if (cancelledJobs.has(jobId)) {
      cancelledJobs.delete(jobId);
      return;
    }

    // 2. Cloud Analysis (Skip if localOnly or provider is 'local')
    let cloud: GeminiScores | null = null;
    const skipCloud = localOnly || provider === 'local' || !geminiApiKey;

    if (!skipCloud) {
      self.postMessage({ type: 'progress', jobId, stage: 'cloud', partial: { local } } satisfies WorkerOutMessage);
      cloud = await runGeminiAnalysis(imageDataUrl, jobId);
    }

    if (cancelledJobs.has(jobId)) {
      cancelledJobs.delete(jobId);
      return;
    }

    // 3. Merge & Finalize
    const photoScore = finalizeScore(local, cloud, startTime);
    
    self.postMessage({ type: 'result', jobId, score: photoScore } satisfies WorkerOutMessage);
  } catch (error: any) {
    console.error(`Analysis failed for job ${jobId}:`, error);
    self.postMessage({ type: 'error', jobId, message: error.message || 'Unknown error' } satisfies WorkerOutMessage);
  }
}

// ─── Message Handler ─────────────────────────────────────────────────────────

self.onmessage = async (e: MessageEvent<WorkerInMessage>) => {
  const msg = e.data;
  switch (msg.type) {
    case 'init':
      await initModels(msg.modelsPath, msg.geminiKey);
      break;
    case 'analyse':
      await runAnalysis(msg.jobId, msg.imagePath, msg.imageDataUrl, msg.provider, msg.localOnly);
      break;
    case 'cancel':
      cancelledJobs.add(msg.jobId);
      break;
  }
};
