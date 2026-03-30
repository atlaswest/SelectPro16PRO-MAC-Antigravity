import * as tf from '@tensorflow/tfjs';
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';
import '@tensorflow/tfjs-backend-webgl';
import '@mediapipe/face_mesh';
import * as faceapi from 'face-api.js';
import { pipeline, env } from '@xenova/transformers';
import * as poseDetection from '@tensorflow-models/pose-detection';
import '@mediapipe/pose';

// Configure Transformers.js
env.allowLocalModels = false;
env.useBrowserCache = true;

let detector: faceLandmarksDetection.FaceLandmarksDetector | null = null;
let objectDetector: any = null;
let poseDetector: poseDetection.PoseDetector | null = null;
let isFaceApiLoaded = false;

const FACE_API_MODELS_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';

/**
 * Initializes local AI models.
 * Note: Using loadFromUri instead of loadFromDisk as this is a browser environment.
 */
export async function initLocalAI(modelsPath: string = FACE_API_MODELS_URL) {
  if (isFaceApiLoaded) return;
  try {
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(modelsPath),
      faceapi.nets.faceExpressionNet.loadFromUri(modelsPath),
      faceapi.nets.faceLandmark68TinyNet.loadFromUri(modelsPath),
      faceapi.nets.ageGenderNet.loadFromUri(modelsPath)
    ]);
    isFaceApiLoaded = true;
    console.log('Local AI models initialized successfully');
  } catch (error) {
    console.error('Failed to initialize local AI models:', error);
  }
}

async function loadFaceApiModels() {
  if (isFaceApiLoaded) return;
  await initLocalAI();
}

async function loadDetector() {
  if (detector) return detector;
  
  // Initialize TFJS backend
  await tf.ready();
  if (tf.getBackend() !== 'webgl') {
    await tf.setBackend('webgl');
  }

  const model = faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh;
  const detectorConfig = {
    runtime: 'mediapipe' as const,
    solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh',
    refineLandmarks: true
  };
  
  detector = await faceLandmarksDetection.createDetector(model, detectorConfig);
  return detector;
}

async function loadPoseDetector() {
  if (poseDetector) return poseDetector;
  
  await tf.ready();
  const model = poseDetection.SupportedModels.MoveNet;
  const detectorConfig = {
    modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
    enableSmoothing: true
  };
  
  poseDetector = await poseDetection.createDetector(model, detectorConfig);
  return poseDetector;
}

/**
 * Calculates the Eye Aspect Ratio (EAR) to detect if an eye is closed.
 */
function calculateEAR(landmarks: any[]) {
  const p1 = landmarks[0];
  const p2 = landmarks[1];
  const p3 = landmarks[2];
  const p4 = landmarks[3];
  const p5 = landmarks[4];
  const p6 = landmarks[5];

  const dist = (a: any, b: any) => Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));

  const vertical1 = dist(p2, p6);
  const vertical2 = dist(p3, p5);
  const horizontal = dist(p1, p4);

  return (vertical1 + vertical2) / (2.0 * horizontal);
}

export interface LocalFaceAnalysis {
  faces: {
    box: { xmin: number; ymin: number; width: number; height: number };
    eyesOpen: boolean;
    ear: number;
    expression?: string;
    expressionScore?: number;
    age?: number;
    gender?: string;
  }[];
  anyBlinks: boolean;
  allEyesOpen: boolean;
}

/**
 * Performs local face and blink detection using TensorFlow.js and face-api.js.
 */
export async function detectBlinks(
  imageElement: HTMLImageElement | HTMLCanvasElement,
  options: { 
    sensitivity?: number; 
    winkStrictness?: number; 
    faceConfidenceThreshold?: number; 
    includeExpressions?: boolean;
  } = {}
): Promise<LocalFaceAnalysis> {
  const { 
    sensitivity = 50, 
    winkStrictness = 70, 
    faceConfidenceThreshold = 50,
    includeExpressions = true
  } = options;

  const [detector, _] = await Promise.all([
    loadDetector(),
    includeExpressions ? loadFaceApiModels() : Promise.resolve()
  ]);

  const [tfFaces, faceApiDetections] = await Promise.all([
    detector.estimateFaces(imageElement),
    includeExpressions ? faceapi.detectAllFaces(imageElement, new faceapi.TinyFaceDetectorOptions()).withFaceExpressions().withAgeAndGender() : Promise.resolve([])
  ]);

  const analysis: LocalFaceAnalysis = {
    faces: [],
    anyBlinks: false,
    allEyesOpen: true
  };

  if (tfFaces.length === 0) {
    return analysis;
  }

  const minThreshold = 0.15;
  const maxThreshold = 0.32;
  const EAR_THRESHOLD = minThreshold + (maxThreshold - minThreshold) * (sensitivity / 100);

  for (let i = 0; i < tfFaces.length; i++) {
    const face = tfFaces[i];
    const confidence = (face as any).score || 1.0;
    if (confidence < (faceConfidenceThreshold / 100)) {
      continue;
    }

    const keypoints = face.keypoints;
    const leftEyeIndices = [33, 160, 158, 133, 153, 144];
    const leftEyeLandmarks = leftEyeIndices.map(idx => keypoints[idx]);
    const rightEyeIndices = [362, 385, 387, 263, 373, 380];
    const rightEyeLandmarks = rightEyeIndices.map(idx => keypoints[idx]);

    const leftEAR = calculateEAR(leftEyeLandmarks);
    const rightEAR = calculateEAR(rightEyeLandmarks);
    const minEAR = Math.min(leftEAR, rightEAR);
    const avgEAR = (leftEAR + rightEAR) / 2;
    const effectiveEAR = sensitivity > winkStrictness ? minEAR : avgEAR;
    const eyesOpen = effectiveEAR > EAR_THRESHOLD;

    if (!eyesOpen) {
      analysis.anyBlinks = true;
      analysis.allEyesOpen = false;
    }

    // Match with face-api.js results for expressions
    const faceApiMatch = faceApiDetections.find(d => {
      const dBox = d.detection.box;
      const fBox = face.box;
      // Simple overlap check
      return Math.abs(dBox.x - fBox.xMin) < 50 && Math.abs(dBox.y - fBox.yMin) < 50;
    });

    let expression = 'neutral';
    let expressionScore = 0;
    if (faceApiMatch) {
      Object.entries(faceApiMatch.expressions).forEach(([exp, score]) => {
        const s = score as number;
        if (s > expressionScore) {
          expressionScore = s;
          expression = exp;
        }
      });
    }

    analysis.faces.push({
      box: {
        xmin: face.box.xMin / imageElement.width,
        ymin: face.box.yMin / imageElement.height,
        width: face.box.width / imageElement.width,
        height: face.box.height / imageElement.height
      },
      eyesOpen,
      ear: effectiveEAR,
      expression,
      expressionScore,
      age: faceApiMatch ? Math.round(faceApiMatch.age) : undefined,
      gender: faceApiMatch ? faceApiMatch.gender : undefined
    });
  }

  return analysis;
}

export async function identifyObjectsLocal(imageSrc: string): Promise<string[]> {
  try {
    if (!objectDetector) {
      objectDetector = await pipeline('object-detection', 'Xenova/detr-resnet-50');
    }
    
    const output = await objectDetector(imageSrc, { threshold: 0.5 });
    const labels = output.map((item: any) => item.label);
    return Array.from(new Set(labels)) as string[];
  } catch (error) {
    console.error('Local object detection failed:', error);
    return [];
  }
}

export async function detectPoseLocal(imageElement: HTMLImageElement | HTMLCanvasElement): Promise<poseDetection.Pose[]> {
  try {
    const detector = await loadPoseDetector();
    const poses = await detector.estimatePoses(imageElement);
    return poses;
  } catch (error) {
    console.error('Local pose detection failed:', error);
    return [];
  }
}

