import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';
import { app } from 'electron';
import log from 'electron-log';
import { getSnapsMissingVision, updateSnap } from './database';

const execFileAsync = promisify(execFile);

const TIMEOUT_MS = 30_000;
const MAX_BUFFER = 20 * 1024 * 1024;

interface VisionImageResult {
  ocrText: string;
  labels: { label: string; confidence: number }[];
  embedding: number[];
}

interface VisionTextResult {
  embedding: number[];
}

function getPaths() {
  if (app.isPackaged) {
    const resources = process.resourcesPath;
    return {
      bin: path.join(resources, 'snap-vision'),
      models: path.join(resources, 'models'),
      clipResources: path.join(resources, 'clip-resources'),
    };
  }
  const root = path.join(__dirname, '..');
  return {
    bin: path.join(root, 'build-native', 'snap-vision'),
    models: path.join(root, 'native', 'models'),
    clipResources: path.join(root, 'native', 'snap-vision', 'Resources'),
  };
}

/**
 * Encode a MobileCLIP embedding (Float32 vector, already L2-normalized)
 * as a compact Buffer for storage.
 */
function encodeEmbedding(vec: number[]): Buffer {
  const buf = Buffer.allocUnsafe(vec.length * 4);
  for (let i = 0; i < vec.length; i++) buf.writeFloatLE(vec[i], i * 4);
  return buf;
}

export function decodeEmbedding(buf: Buffer): Float32Array {
  const out = new Float32Array(buf.length / 4);
  for (let i = 0; i < out.length; i++) out[i] = buf.readFloatLE(i * 4);
  return out;
}

async function runImage(filePath: string): Promise<VisionImageResult> {
  const { bin, models, clipResources } = getPaths();
  const { stdout } = await execFileAsync(
    bin,
    ['image', filePath, models, clipResources],
    { timeout: TIMEOUT_MS, maxBuffer: MAX_BUFFER },
  );
  return JSON.parse(stdout) as VisionImageResult;
}

export async function embedText(query: string): Promise<Float32Array> {
  const { bin, models, clipResources } = getPaths();
  const { stdout } = await execFileAsync(
    bin,
    ['text', query, models, clipResources],
    { timeout: TIMEOUT_MS, maxBuffer: MAX_BUFFER },
  );
  const parsed = JSON.parse(stdout) as VisionTextResult;
  return new Float32Array(parsed.embedding);
}

/** Run OCR + classification + CLIP embedding for a single snap and persist. */
export async function runVisionForSnap(
  snapId: string,
  filePath: string,
): Promise<void> {
  try {
    const res = await runImage(filePath);
    const labels = res.labels.map((l) => l.label).join(', ');
    updateSnap(snapId, {
      ocrText: res.ocrText,
      classificationLabels: labels,
      visualEmbedding: encodeEmbedding(res.embedding),
    });
    log.info(
      `Vision: ${snapId} → ocr:${res.ocrText.length}ch labels:${res.labels.length} emb:${res.embedding.length}d`,
    );
  } catch (err) {
    log.warn(`Vision failed for ${snapId}: ${(err as Error).message}`);
  }
}

/**
 * Process any snaps that are missing vision data. Sequential (per-snap is
 * ~1-2s with CLIP + classification + OCR; overlapping CoreML predictions
 * doesn't help much and eats more memory).
 *
 * Progress notifications are throttled so the library browser doesn't
 * re-fetch + re-render dozens of times during a backfill — that floods the
 * renderer, cancels in-flight thumbnail IPCs, and stomps on whatever the
 * user is typing in the search bar.
 */
const BACKFILL_NOTIFY_MS = 3000;

export async function backfillVision(onProgress?: () => void): Promise<void> {
  const pending = getSnapsMissingVision();
  if (pending.length === 0) return;
  log.info(`Vision backfill: ${pending.length} snaps pending`);

  let lastNotify = Date.now();
  for (const snap of pending) {
    await runVisionForSnap(snap.id, snap.filePath);
    const now = Date.now();
    if (now - lastNotify >= BACKFILL_NOTIFY_MS) {
      onProgress?.();
      lastNotify = now;
    }
  }
  // Final refresh once everything has settled.
  onProgress?.();
  log.info('Vision backfill complete');
}

/**
 * Cached Float32Array view over the stored BLOB, keyed by snap id. Used by
 * the CLIP similarity search so we only decode each embedding once.
 */
const embeddingCache = new Map<string, Float32Array>();

export function getEmbeddingFor(
  snapId: string,
  blob: Buffer | null,
): Float32Array | null {
  if (!blob) return null;
  const cached = embeddingCache.get(snapId);
  if (cached && cached.buffer.byteLength === blob.length * 1) return cached;
  const decoded = decodeEmbedding(blob);
  embeddingCache.set(snapId, decoded);
  return decoded;
}

/** Cosine similarity between two L2-normalized vectors. */
export function cosineSim(a: Float32Array, b: Float32Array): number {
  let sum = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) sum += a[i] * b[i];
  return sum;
}
