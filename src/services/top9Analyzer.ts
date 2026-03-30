import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';
import '@tensorflow/tfjs-backend-cpu';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import * as blazeface from '@tensorflow-models/blazeface';
import { PhotoItem } from '../types';

export interface Top9Score {
  imageId: string;
  totalScore: number;
  breakdown: {
    composition: number;   // 0-100
    tones: number;         // 0-100
    sharpness: number;     // 0-100
    subjectPresence: number; // 0-100
    faceQuality: number;   // 0-100 (0 if no face)
  };
  detectedSubjects: string[];
  faceCount: number;
  isPortrait: boolean;
  focalLength?: number;
  isTopCandidate: boolean;
}

class Top9Analyzer {
  private cocoModel: cocoSsd.ObjectDetection | null = null;
  private faceModel: blazeface.BlazeFaceModel | null = null;
  private modelsLoaded = false;

  async loadModels(onProgress?: (msg: string) => void): Promise<void> {
    if (this.modelsLoaded) return;

    onProgress?.('Initializing TensorFlow.js...');
    await tf.ready();
    console.log('TF.js backend:', tf.getBackend());

    onProgress?.('Loading subject detection model...');
    this.cocoModel = await cocoSsd.load({ base: 'mobilenet_v2' });

    onProgress?.('Loading face detection model...');
    this.faceModel = await blazeface.load();

    this.modelsLoaded = true;
    onProgress?.('Models ready');
  }

  async analyzeImage(
    imageElement: HTMLImageElement,
    imageId: string
  ): Promise<Top9Score> {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = imageElement.naturalWidth;
    canvas.height = imageElement.naturalHeight;
    ctx.drawImage(imageElement, 0, 0);

    const [composition, tones, sharpness] = await Promise.all([
      this.scoreComposition(canvas, ctx),
      this.scoreTones(ctx, canvas.width, canvas.height),
      this.scoreSharpness(ctx, canvas.width, canvas.height),
    ]);

    let subjectPresence = 0;
    let detectedSubjects: string[] = [];
    let faceCount = 0;
    let faceQuality = 0;

    if (this.cocoModel) {
      const predictions = await this.cocoModel.detect(imageElement);
      const peoplePreds = predictions.filter(p => p.class === 'person');
      detectedSubjects = [...new Set(predictions.map(p => p.class))];
      subjectPresence = Math.min(100, peoplePreds.length > 0
        ? 60 + (peoplePreds[0].score * 40)
        : predictions.length > 0 ? predictions[0].score * 50 : 0
      );
    }

    if (this.faceModel) {
      const faces = await this.faceModel.estimateFaces(imageElement, false);
      faceCount = faces.length;
      if (faceCount > 0) {
        // Score based on face size relative to frame — larger = more prominent
        const imgArea = canvas.width * canvas.height;
        const largestFace = faces.reduce((best, f) => {
          const s = f as any;
          const area = (s.bottomRight[0] - s.topLeft[0]) * (s.bottomRight[1] - s.topLeft[1]);
          return area > best ? area : best;
        }, 0);
        const relativeSize = largestFace / imgArea;
        faceQuality = Math.min(100, relativeSize * 1000);
      }
    }

    // Weighted total — tuned for people/events photography
    const totalScore = Math.round(
      composition * 0.25 +
      tones * 0.20 +
      sharpness * 0.20 +
      subjectPresence * 0.20 +
      faceQuality * 0.15
    );

    const isPortrait = canvas.height > canvas.width;

    return {
      imageId,
      totalScore,
      breakdown: { composition, tones, sharpness, subjectPresence, faceQuality },
      detectedSubjects,
      faceCount,
      isPortrait,
      isTopCandidate: false, // set after ranking
    };
  }

  private scoreComposition(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): number {
    const w = canvas.width;
    const h = canvas.height;
    // Rule of thirds intersections
    const thirds = [
      { x: w / 3, y: h / 3 }, { x: (2 * w) / 3, y: h / 3 },
      { x: w / 3, y: (2 * h) / 3 }, { x: (2 * w) / 3, y: (2 * h) / 3 },
    ];
    // Sample contrast at thirds points — high contrast = subject likely there
    let thirdsScore = 0;
    for (const pt of thirds) {
      const px = ctx.getImageData(Math.floor(pt.x), Math.floor(pt.y), 3, 3).data;
      const luminance = (px[0] * 0.299 + px[1] * 0.587 + px[2] * 0.114);
      thirdsScore += luminance > 20 && luminance < 235 ? 25 : 0;
    }
    return Math.min(100, thirdsScore);
  }

  private scoreTones(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ): number {
    // Sample a grid of pixels for histogram-style tone analysis
    const sampleSize = 50;
    const stepX = Math.floor(width / sampleSize);
    const stepY = Math.floor(height / sampleSize);
    const luminances: number[] = [];

    for (let y = 0; y < height; y += stepY) {
      for (let x = 0; x < width; x += stepX) {
        const px = ctx.getImageData(x, y, 1, 1).data;
        luminances.push(px[0] * 0.299 + px[1] * 0.587 + px[2] * 0.114);
      }
    }

    const mean = luminances.reduce((a, b) => a + b, 0) / luminances.length;
    const variance = luminances.reduce((a, b) => a + (b - mean) ** 2, 0) / luminances.length;
    const stdDev = Math.sqrt(variance);

    // Well-exposed: mean near 128, good dynamic range
    const exposureScore = 100 - Math.abs(mean - 128) * 0.8;
    const contrastScore = Math.min(100, stdDev * 1.5);

    return Math.round((exposureScore + contrastScore) / 2);
  }

  private scoreSharpness(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ): number {
    // Laplacian variance approximation — sample centre region
    const cx = Math.floor(width * 0.25);
    const cy = Math.floor(height * 0.25);
    const cw = Math.floor(width * 0.5);
    const ch = Math.floor(height * 0.5);
    const imageData = ctx.getImageData(cx, cy, cw, ch);
    const data = imageData.data;

    let sum = 0;
    let count = 0;
    for (let i = 4; i < data.length - 4; i += 16) {
      const prev = data[i - 4] * 0.299 + data[i - 3] * 0.587 + data[i - 2] * 0.114;
      const curr = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      const next = data[i + 4] * 0.299 + data[i + 5] * 0.587 + data[i + 6] * 0.114;
      sum += (prev - 2 * curr + next) ** 2;
      count++;
    }

    const laplacianVariance = count > 0 ? sum / count : 0;
    return Math.min(100, laplacianVariance * 2);
  }

  async rankImages(scores: Top9Score[], photos: PhotoItem[], topN: number = 9, goals?: any): Promise<Top9Score[]> {
    // 1. Create a map for quick lookup of scores by image ID
    const scoreMap = new Map(scores.map(s => [s.imageId, s]));
    
    // 2. Filter photos that have scores
    const scoredPhotos = photos.filter(p => scoreMap.has(p.id));
    if (scoredPhotos.length === 0) return scores;
    
    // 3. Ganging: Pre-filter to pick the best from each burst or near-identical sequence
    // This ensures we don't waste diversity slots on near-duplicates
    const gangedPhotos: PhotoItem[] = [];
    const sortedByTime = [...scoredPhotos].sort((a, b) => 
      Number(a.metadata.timestamp || 0) - Number(b.metadata.timestamp || 0)
    );

    // Use motordriveShooting to adjust the ganging sensitivity
    // High motordrive = more aggressive grouping (larger time window)
    const motordriveFactor = goals?.temporalAwareness?.motordriveShooting || 50;
    const gangingWindow = 500 + (motordriveFactor * 45); // 500ms to 5000ms (5 seconds)

    if (sortedByTime.length > 0) {
      let currentGang: PhotoItem[] = [sortedByTime[0]];
      for (let i = 1; i < sortedByTime.length; i++) {
        const prev = sortedByTime[i-1];
        const curr = sortedByTime[i];
        const prevTime = Number(prev.metadata.timestamp || 0);
        const currTime = Number(curr.metadata.timestamp || 0);
        
        const isSameBurst = prev.burstId && curr.burstId && prev.burstId === curr.burstId;
        const isVeryClose = Math.abs(currTime - prevTime) < gangingWindow;

        if (isSameBurst || isVeryClose) {
          currentGang.push(curr);
        } else {
          // Pick best from gang
          const best = currentGang.reduce((a, b) => 
            (scoreMap.get(a.id)?.totalScore || 0) > (scoreMap.get(b.id)?.totalScore || 0) ? a : b
          );
          gangedPhotos.push(best);
          currentGang = [curr];
        }
      }
      const bestFinal = currentGang.reduce((a, b) => 
        (scoreMap.get(a.id)?.totalScore || 0) > (scoreMap.get(b.id)?.totalScore || 0) ? a : b
      );
      gangedPhotos.push(bestFinal);
    }

    // 4. Temporal Clustering: Group ganged photos into "scenes" (> 60 seconds gap)
    const scenes: PhotoItem[][] = [];
    if (gangedPhotos.length > 0) {
      let currentScene: PhotoItem[] = [gangedPhotos[0]];
      for (let i = 1; i < gangedPhotos.length; i++) {
        const prevTime = Number(gangedPhotos[i-1].metadata.timestamp || 0);
        const currTime = Number(gangedPhotos[i].metadata.timestamp || 0);
        
        if (currTime - prevTime > 60000) { // 60 second gap for scenes
          scenes.push(currentScene);
          currentScene = [gangedPhotos[i]];
        } else {
          currentScene.push(gangedPhotos[i]);
        }
      }
      scenes.push(currentScene);
    }

    // 5. Logical Clustering within scenes (by focal length and subject logic)
    const clusters: PhotoItem[][] = [];
    for (const scene of scenes) {
      const sceneClusters: Map<string, PhotoItem[]> = new Map();
      for (const photo of scene) {
        const score = scoreMap.get(photo.id)!;
        const focal = Number(photo.metadata.focalLength || 0);
        
        // Cluster by focal length bins
        const focalRange = focal <= 24 ? 'ultra-wide' : 
                          focal <= 35 ? 'wide' : 
                          focal <= 55 ? 'normal' : 
                          focal <= 105 ? 'portrait' : 'tele';
        
        // Cluster by primary subject logic
        const primarySubject = score.detectedSubjects.includes('person') ? 'people' : 
                               score.detectedSubjects.length > 0 ? 'objects' : 'scenery';
        
        const clusterKey = `${focalRange}-${primarySubject}`;
        
        if (!sceneClusters.has(clusterKey)) {
          sceneClusters.set(clusterKey, []);
        }
        sceneClusters.get(clusterKey)!.push(photo);
      }
      clusters.push(...Array.from(sceneClusters.values()));
    }

    const selectedIds = new Set<string>();

    // 6. Diversity-aware selection logic
    // Use frameVariance to adjust the diversity penalty
    // High variance = lower penalty (we allow more similar frames if they are interesting)
    const frameVarianceFactor = goals?.temporalAwareness?.frameVariance || 50;
    const diversityMultiplier = Math.max(0.1, (100 - frameVarianceFactor) / 50); // 0.1 to 2.0

    const getDiversityPenalty = (photo: PhotoItem) => {
      let penalty = 0;
      const photoScore = scoreMap.get(photo.id)!;
      const photoFocal = Number(photo.metadata.focalLength || 0);

      for (const id of selectedIds) {
        const selected = photos.find(p => p.id === id);
        if (!selected) continue;
        const selectedScore = scoreMap.get(id)!;
        const selectedFocal = Number(selected.metadata.focalLength || 0);
        
        // 1. Focal Length Diversity: Penalize same focal range heavily
        const getFocalRange = (f: number) => {
          if (f <= 24) return 'ultra-wide';
          if (f <= 35) return 'wide';
          if (f <= 55) return 'normal';
          if (f <= 105) return 'portrait';
          return 'tele';
        };
        if (getFocalRange(photoFocal) === getFocalRange(selectedFocal)) {
          penalty += 30 * diversityMultiplier;
        }

        // 2. Frame Proportions: Penalize same orientation
        if (photoScore.isPortrait === selectedScore.isPortrait) {
          penalty += 10 * diversityMultiplier;
        }

        // 3. People Present: Ensure we don't over-select people shots if we have enough
        if (photoScore.faceCount > 0 && selectedScore.faceCount > 0) {
          penalty += 15 * diversityMultiplier;
        }

        // 4. Visual Similarity: Penalize similar subject sets
        const commonSubjects = photoScore.detectedSubjects.filter(s => 
          selectedScore.detectedSubjects.includes(s)
        );
        penalty += commonSubjects.length * 8 * diversityMultiplier;
      }
      return penalty;
    };

    // 7. Round-robin selection from clusters to ensure diversity
    let clusterIndex = 0;
    const clusterQueue = [...clusters].sort((a, b) => b.length - a.length); // Start with largest clusters
    
    while (selectedIds.size < topN && clusterQueue.length > 0) {
      const currentCluster = clusterQueue[clusterIndex % clusterQueue.length];
      
      let bestInCluster: PhotoItem | null = null;
      let bestAdjustedScore = -Infinity;

      for (const photo of currentCluster) {
        if (selectedIds.has(photo.id)) continue;
        
        const score = scoreMap.get(photo.id)!.totalScore;
        const penalty = getDiversityPenalty(photo);
        const adjustedScore = score - penalty;

        if (adjustedScore > bestAdjustedScore) {
          bestAdjustedScore = adjustedScore;
          bestInCluster = photo;
        }
      }

      if (bestInCluster) {
        selectedIds.add(bestInCluster.id);
      } else {
        // Cluster exhausted
        clusterQueue.splice(clusterIndex % clusterQueue.length, 1);
        if (clusterQueue.length === 0) break;
        continue; // Don't increment index if we removed an item
      }
      
      clusterIndex++;
    }

    // 8. Fill remaining slots from any photo if clusters didn't provide enough
    if (selectedIds.size < topN) {
      const remaining = scoredPhotos
        .filter(p => !selectedIds.has(p.id))
        .sort((a, b) => scoreMap.get(b.id)!.totalScore - scoreMap.get(a.id)!.totalScore);
      
      for (const p of remaining) {
        if (selectedIds.size >= topN) break;
        selectedIds.add(p.id);
      }
    }

    // 9. Return all scores with the isTopCandidate flag set
    return scores.map(s => ({
      ...s,
      isTopCandidate: selectedIds.has(s.imageId)
    }));
  }
}

export const top9Analyzer = new Top9Analyzer();
