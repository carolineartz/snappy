export type HexColor = `#${string}`;
export type TagColorSource = 'auto' | 'custom';

export interface TagColorRecord {
  color: HexColor | null;
  colorSource: TagColorSource | null;
}

export interface TagColorAssignment {
  baseColor: HexColor;
  colorSource: 'auto';
}

export interface TagColorStyles {
  dotColor: HexColor;
  pillBackground: HexColor;
  pillBorder: HexColor;
  pillText: HexColor;
}

export interface TagSummary {
  tag: string;
  count: number;
  color: HexColor | null;
  colorSource: TagColorSource | null;
}

interface RGB {
  r: number;
  g: number;
  b: number;
}

interface HSL {
  h: number;
  s: number;
  l: number;
}

const DEFAULT_CANDIDATE_COUNT = 36;

/**
 * Public API: Assign a new auto-generated color
 */
export function assignAutoTagColor(
  existingAutoColors: HexColor[],
  candidateCount = DEFAULT_CANDIDATE_COUNT,
): TagColorAssignment {
  if (existingAutoColors.length === 0) {
    return {
      baseColor: randomPleasantColor(),
      colorSource: 'auto',
    };
  }

  const existingRgb = existingAutoColors.map(hexToRgb);

  let bestCandidate: HexColor | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (let i = 0; i < candidateCount; i++) {
    const candidate = randomPleasantColor();
    const candidateRgb = hexToRgb(candidate);

    const minDistance = Math.min(
      ...existingRgb.map((existing) => colorDistance(candidateRgb, existing)),
    );

    const luminance = relativeLuminance(candidateRgb);

    const flexibilityBonus = 1 - Math.abs(luminance - 0.5);

    const score = minDistance + flexibilityBonus * 20;

    if (score > bestScore) {
      bestScore = score;
      bestCandidate = candidate;
    }
  }

  return {
    baseColor: bestCandidate ?? randomPleasantColor(),
    colorSource: 'auto',
  };
}

/**
 * Extract only auto-generated colors from DB rows
 */
export function extractExistingAutoColors(
  tags: TagColorRecord[],
): HexColor[] {
  return tags
    .filter(
      (t): t is { color: HexColor; colorSource: 'auto' } =>
        t.colorSource === 'auto' && typeof t.color === 'string',
    )
    .map((t) => normalizeHex(t.color));
}

/**
 * Derive UI-friendly colors from base color
 */
export function getTagColorStyles(baseColor: HexColor): TagColorStyles {
  const baseHsl = rgbToHsl(hexToRgb(baseColor));

  const dotColor = normalizeHex(baseColor);

  const pillBackground = hslToHex({
    h: baseHsl.h,
    s: clamp(baseHsl.s * 0.5, 18, 52),
    l: clamp(91 - baseHsl.s * 0.03, 84, 93),
  });

  const pillBorder = hslToHex({
    h: baseHsl.h,
    s: clamp(baseHsl.s * 0.72, 24, 72),
    l: clamp(baseHsl.l + 6, 42, 70),
  });

  const hueMatchedDarkText = hslToHex({
    h: baseHsl.h,
    s: clamp(baseHsl.s * 0.78, 18, 78),
    l: 24,
  });

  const pillText = pickReadableTextColor(
    pillBackground,
    hueMatchedDarkText,
  );

  return {
    dotColor,
    pillBackground,
    pillBorder,
    pillText,
  };
}

/* =========================
   Internals
   ========================= */

function randomPleasantColor(): HexColor {
  const [min, max] = randomHueBucket();

  const h = randomBetween(min, max);
  const s = randomBetween(54, 72);
  const l = randomBetween(46, 58);

  return hslToHex({ h, s, l });
}

/**
 * Slightly curated hue buckets to avoid weird muddy zones
 */
function randomHueBucket(): [number, number] {
  const buckets: Array<[number, number]> = [
    [0, 20],    // red
    [25, 50],   // orange
    [55, 75],   // yellow
    [85, 140],  // green
    [160, 210], // cyan/blue
    [220, 265], // indigo
    [275, 320], // purple/pink
    [330, 355], // rose
  ];

  return buckets[Math.floor(Math.random() * buckets.length)];
}

function pickReadableTextColor(
  backgroundHex: HexColor,
  preferredHex: HexColor,
): HexColor {
  const bg = hexToRgb(backgroundHex);
  const preferred = hexToRgb(preferredHex);
  const black = hexToRgb('#111111');
  const white = hexToRgb('#FFFFFF');

  const preferredContrast = contrastRatio(bg, preferred);
  const blackContrast = contrastRatio(bg, black);
  const whiteContrast = contrastRatio(bg, white);

  if (preferredContrast >= 4.5) {
    return preferredHex;
  }

  return blackContrast >= whiteContrast ? '#111111' : '#FFFFFF';
}

function colorDistance(a: RGB, b: RGB): number {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;

  return Math.sqrt(2 * dr * dr + 4 * dg * dg + 3 * db * db);
}

function hexToRgb(hex: string): RGB {
  const normalized = normalizeHex(hex).slice(1);

  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

function rgbToHex({ r, g, b }: RGB): HexColor {
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function rgbToHsl({ r, g, b }: RGB): HSL {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;

  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;

  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));

    switch (max) {
      case rn:
        h = 60 * (((gn - bn) / delta) % 6);
        break;
      case gn:
        h = 60 * ((bn - rn) / delta + 2);
        break;
      default:
        h = 60 * ((rn - gn) / delta + 4);
        break;
    }
  }

  if (h < 0) h += 360;

  return {
    h,
    s: s * 100,
    l: l * 100,
  };
}

function hslToHex({ h, s, l }: HSL): HexColor {
  const sn = s / 100;
  const ln = l / 100;

  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = ln - c / 2;

  let rPrime = 0;
  let gPrime = 0;
  let bPrime = 0;

  if (h < 60) {
    rPrime = c;
    gPrime = x;
  } else if (h < 120) {
    rPrime = x;
    gPrime = c;
  } else if (h < 180) {
    gPrime = c;
    bPrime = x;
  } else if (h < 240) {
    gPrime = x;
    bPrime = c;
  } else if (h < 300) {
    rPrime = x;
    bPrime = c;
  } else {
    rPrime = c;
    bPrime = x;
  }

  return rgbToHex({
    r: Math.round((rPrime + m) * 255),
    g: Math.round((gPrime + m) * 255),
    b: Math.round((bPrime + m) * 255),
  });
}

function relativeLuminance({ r, g, b }: RGB): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function contrastRatio(a: RGB, b: RGB): number {
  const l1 = relativeLuminance(a);
  const l2 = relativeLuminance(b);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

export function normalizeHex(hex: string): HexColor {
  const trimmed = hex.trim();

  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) {
    return trimmed.toUpperCase() as HexColor;
  }

  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    const [, r, g, b] = trimmed;
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase() as HexColor;
  }

  throw new Error(`Invalid hex color: ${hex}`);
}

function toHex(value: number): string {
  return clamp(Math.round(value), 0, 255)
    .toString(16)
    .padStart(2, '0')
    .toUpperCase();
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
