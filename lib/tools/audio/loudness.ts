/**
 * Audio Loudness and Delivery Check Engine (ITU-R BS.1770-4).
 *
 * Implements K-weighting filtering, gating, true peak, and noise floor
 * measurement on raw PCM audio data, completely in the browser with no external dependencies.
 *
 * Standards:
 * - ITU-R BS.1770-4 / EBU R128 (-23.0 LUFS, max -1.0 dBTP)
 * - Spotify (-14.0 LUFS, max -1.0 dBTP)
 * - Apple Music (-16.0 LUFS, max -1.0 dBTP)
 * - Amazon Music (-14.0 LUFS, max -1.0 dBTP)
 * - YouTube (-14.0 LUFS, max -1.0 dBTP)
 * - ACX Audiobook (-23.0 to -18.0 LUFS, max -3.0 dBTP, noise floor <= -60.0 dB)
 * - Podcast / AES TD1004 (-16.0 LUFS for stereo, -19.0 LUFS for mono, max -1.0 dBTP)
 */

import type { AudioData } from './wav';

export interface BiquadCoefficients {
  b0: number;
  b1: number;
  b2: number;
  a1: number;
  a2: number;
}

/**
 * Filter coefficients for ITU-R BS.1770 K-weighting stage 1: High shelf filter.
 * Standard specified at 48 kHz:
 * Gain = +3.99 dB, f0 = 1681.97 Hz, Q = 0.7071
 */
export function getPreFilterCoefficients(
  sampleRate: number,
): BiquadCoefficients {
  // ITU-R BS.1770-4 pre-filter (high shelf)
  if (Math.abs(sampleRate - 48000) < 10) {
    return {
      b0: 1.53512485958697,
      b1: -2.69169618940638,
      b2: 1.19839281085285,
      a1: -1.69065929318241,
      a2: 0.73248077421585,
    };
  }
  if (Math.abs(sampleRate - 44100) < 10) {
    return {
      b0: 1.53769666874412,
      b1: -2.65127202353326,
      b2: 1.15783307567848,
      a1: -1.66364516631899,
      a2: 0.7079038890069,
    };
  }

  // Exact bilinear transform from ITU-R BS.1770
  const dbGain = 3.999843853973347;
  const f0 = 1681.974450955533;
  const Q = 0.7071752369554193;
  const K = Math.tan((Math.PI * f0) / sampleRate);
  const K2 = K * K;
  const vh = Math.pow(10, dbGain / 20);
  const vb = Math.pow(vh, 0.4996667741545416);

  const a0 = 1.0 + K / Q + K2;
  const b0 = (vh + (vb * K) / Q + K2) / a0;
  const b1 = (2.0 * (K2 - vh)) / a0;
  const b2 = (vh - (vb * K) / Q + K2) / a0;
  const a1 = (2.0 * (K2 - 1.0)) / a0;
  const a2 = (1.0 - K / Q + K2) / a0;

  return { b0, b1, b2, a1, a2 };
}

/**
 * Filter coefficients for ITU-R BS.1770 K-weighting stage 2: High pass (RLB) filter.
 * Standard specified at 48 kHz:
 * f0 = 38.13547087602444 Hz, Q = 0.5
 */
export function getRLBCoefficients(sampleRate: number): BiquadCoefficients {
  const f0 = 38.13547087602444;
  const Q = 0.5003270373238773;
  const K = Math.tan((Math.PI * f0) / sampleRate);
  const K2 = K * K;

  const a0 = 1.0 + K / Q + K2;
  const b0 = 1.0 / a0;
  const b1 = -2.0 / a0;
  const b2 = 1.0 / a0;
  const a1 = (2.0 * (K2 - 1.0)) / a0;
  const a2 = (1.0 - K / Q + K2) / a0;

  return { b0, b1, b2, a1, a2 };
}

/** Apply a Direct Form II transposed IIR filter to an audio channel */
export function applyBiquadFilter(
  samples: Float32Array,
  coeffs: BiquadCoefficients,
): Float32Array {
  const out = new Float32Array(samples.length);
  const { b0, b1, b2, a1, a2 } = coeffs;
  let s1 = 0;
  let s2 = 0;

  for (let i = 0; i < samples.length; i++) {
    const x = samples[i];
    const y = b0 * x + s1;
    s1 = b1 * x - a1 * y + s2;
    s2 = b2 * x - a2 * y;
    out[i] = y;
  }
  return out;
}

/**
 * Apply ITU-R BS.1770 K-weighting dual filter (Stage 1 High-shelf + Stage 2 High-pass RLB).
 */
export function applyKWeighting(
  channel: Float32Array,
  sampleRate: number,
): Float32Array {
  const preCoeffs = getPreFilterCoefficients(sampleRate);
  const stage1 = applyBiquadFilter(channel, preCoeffs);
  const rlbCoeffs = getRLBCoefficients(sampleRate);
  return applyBiquadFilter(stage1, rlbCoeffs);
}

/**
 * Channel weighting factors according to BS.1770-4:
 * Left, Right, Centre = 1.0 (0 dB)
 * Left surround, Right surround = 1.41 (~1.5 dB)
 */
export function getChannelWeights(channelCount: number): number[] {
  if (channelCount === 1) return [1.0];
  if (channelCount === 2) return [1.0, 1.0];
  if (channelCount === 3) return [1.0, 1.0, 1.0]; // L, R, C
  if (channelCount >= 5) {
    // Standard 5.1 surround: L, R, C, LFE (skipped), Ls, Rs
    return [1.0, 1.0, 1.0, 0.0, 1.41, 1.41];
  }
  return Array(channelCount).fill(1.0);
}

export interface LoudnessMetrics {
  /** Integrated loudness in LUFS (LKFS) */
  integratedLufs: number;
  /** Maximum true peak across channels in dBTP */
  truePeakDb: number;
  /** Maximum sample peak in dBFS */
  samplePeakDbfs: number;
  /** Loudness Range (LRA) in LU */
  loudnessRangeLu: number;
  /** Measured noise floor in dBFS (RMS of quietest 100ms segments) */
  noiseFloorDbfs: number;
  /** Duration in seconds */
  durationSeconds: number;
  /** Channel count */
  channels: number;
  /** Sample rate */
  sampleRate: number;
}

export interface TargetDeliveryStandard {
  id: string;
  name: string;
  targetLufs: number;
  lufsTolerance: number;
  maxTruePeakDb: number;
  maxNoiseFloorDb?: number;
  notes: string;
}

export const DELIVERY_STANDARDS: TargetDeliveryStandard[] = [
  {
    id: 'spotify',
    name: 'Spotify',
    targetLufs: -14.0,
    lufsTolerance: 1.0,
    maxTruePeakDb: -1.0,
    notes:
      'Normalized with -14 LUFS target and -1.0 dBTP ceiling to avoid lossy transcoding distortion.',
  },
  {
    id: 'apple-music',
    name: 'Apple Music (Sound Check)',
    targetLufs: -16.0,
    lufsTolerance: 1.0,
    maxTruePeakDb: -1.0,
    notes: 'AES TD1004 recommendation / Apple Sound Check target.',
  },
  {
    id: 'ebu-r128',
    name: 'EBU R128 (European Broadcast)',
    targetLufs: -23.0,
    lufsTolerance: 0.5,
    maxTruePeakDb: -1.0,
    notes: 'Strict European broadcast standard (-23.0 ± 0.5 LUFS).',
  },
  {
    id: 'atsc-a85',
    name: 'ATSC A/85 (US Television)',
    targetLufs: -24.0,
    lufsTolerance: 1.0,
    maxTruePeakDb: -2.0,
    notes: 'CALM Act compliance standard for television delivery.',
  },
  {
    id: 'youtube',
    name: 'YouTube',
    targetLufs: -14.0,
    lufsTolerance: 1.0,
    maxTruePeakDb: -1.0,
    notes:
      'YouTube turns down audio louder than -14 LUFS; does not turn up quieter audio.',
  },
  {
    id: 'amazon-music',
    name: 'Amazon Music',
    targetLufs: -14.0,
    lufsTolerance: 1.0,
    maxTruePeakDb: -1.0,
    notes: 'Industry streaming standard matching YouTube and Spotify.',
  },
  {
    id: 'acx-audiobook',
    name: 'ACX / Audible Audiobooks',
    targetLufs: -20.5, // Center of -23 to -18
    lufsTolerance: 2.5, // [-23, -18]
    maxTruePeakDb: -3.0,
    maxNoiseFloorDb: -60.0,
    notes:
      'Strict RMS / LUFS range between -23 LUFS and -18 LUFS with noise floor under -60 dBFS.',
  },
  {
    id: 'podcast-stereo',
    name: 'Podcasts (AES TD1004 Stereo)',
    targetLufs: -16.0,
    lufsTolerance: 1.0,
    maxTruePeakDb: -1.0,
    notes: 'Recommended podcast target for stereo mixes.',
  },
];

export interface StandardEvaluation {
  standard: TargetDeliveryStandard;
  passesLufs: boolean;
  passesTruePeak: boolean;
  passesNoiseFloor: boolean;
  overallPass: boolean;
  lufsDifference: number;
  truePeakHeadroom: number;
  summary: string;
}

/**
 * Sinc-interpolation 4x oversampling approximation to measure True Peak (BS.1770 Annex 2).
 */
export function measureTruePeak(channel: Float32Array): number {
  if (channel.length === 0) return Number.NEGATIVE_INFINITY;

  let maxPeak = 0;
  // Sample peak first
  for (let i = 0; i < channel.length; i++) {
    const abs = Math.abs(channel[i]);
    if (abs > maxPeak) maxPeak = abs;
  }

  // Linear / 4-point cubic Hermite interpolation between adjacent samples for inter-sample peak estimation
  for (let i = 1; i < channel.length - 2; i++) {
    const y0 = channel[i - 1];
    const y1 = channel[i];
    const y2 = channel[i + 1];
    const y3 = channel[i + 2];

    // Evaluate at quarter intervals: t = 0.25, 0.5, 0.75
    for (const t of [0.25, 0.5, 0.75]) {
      const a = -0.5 * y0 + 1.5 * y1 - 1.5 * y2 + 0.5 * y3;
      const b = y0 - 2.5 * y1 + 2.0 * y2 - 0.5 * y3;
      const c = -0.5 * y0 + 0.5 * y2;
      const d = y1;
      const interpolated = Math.abs(a * t * t * t + b * t * t + c * t + d);
      if (interpolated > maxPeak) {
        maxPeak = interpolated;
      }
    }
  }

  return maxPeak === 0 ? Number.NEGATIVE_INFINITY : 20 * Math.log10(maxPeak);
}

/**
 * Measure noise floor in dBFS by calculating RMS in 100ms non-overlapping windows
 * and finding the 10th percentile lowest non-silent energy block.
 */
export function measureNoiseFloor(audio: AudioData): number {
  const windowSize = Math.floor(audio.sampleRate * 0.1); // 100ms window
  if (windowSize <= 0 || audio.channels.length === 0)
    return Number.NEGATIVE_INFINITY;

  const totalSamples = audio.channels[0].length;
  const numWindows = Math.floor(totalSamples / windowSize);
  if (numWindows === 0) return Number.NEGATIVE_INFINITY;

  const rmsEnergies: number[] = [];

  for (let w = 0; w < numWindows; w++) {
    let sumSquares = 0;
    const offset = w * windowSize;

    for (let ch = 0; ch < audio.channels.length; ch++) {
      const channel = audio.channels[ch];
      for (let i = 0; i < windowSize; i++) {
        const s = channel[offset + i];
        sumSquares += s * s;
      }
    }

    const meanSquare = sumSquares / (windowSize * audio.channels.length);
    if (meanSquare > 1e-12) {
      rmsEnergies.push(meanSquare);
    }
  }

  if (rmsEnergies.length === 0) return -100.0; // Clean digital silence

  // Sort energies and pick 10th percentile
  rmsEnergies.sort((a, b) => a - b);
  const percentileIndex = Math.floor(rmsEnergies.length * 0.1);
  const energy = rmsEnergies[percentileIndex];

  return 10 * Math.log10(energy);
}

/**
 * Compute ITU-R BS.1770-4 Integrated Loudness (LUFS) and Loudness Range (LRA).
 */
export function measureLoudness(audio: AudioData): LoudnessMetrics {
  const { sampleRate, channels } = audio;
  if (channels.length === 0 || channels[0].length === 0) {
    return {
      integratedLufs: Number.NEGATIVE_INFINITY,
      truePeakDb: Number.NEGATIVE_INFINITY,
      samplePeakDbfs: Number.NEGATIVE_INFINITY,
      loudnessRangeLu: 0,
      noiseFloorDbfs: Number.NEGATIVE_INFINITY,
      durationSeconds: 0,
      channels: 0,
      sampleRate,
    };
  }

  const durationSeconds = channels[0].length / sampleRate;

  // 1. Apply K-weighting filter to each channel
  const filteredChannels: Float32Array[] = [];
  let maxSamplePeak = 0;
  let maxTruePeak = Number.NEGATIVE_INFINITY;

  for (let ch = 0; ch < channels.length; ch++) {
    const raw = channels[ch];
    filteredChannels.push(applyKWeighting(raw, sampleRate));

    for (let i = 0; i < raw.length; i++) {
      const abs = Math.abs(raw[i]);
      if (abs > maxSamplePeak) maxSamplePeak = abs;
    }

    const tp = measureTruePeak(raw);
    if (tp > maxTruePeak) maxTruePeak = tp;
  }

  const samplePeakDbfs =
    maxSamplePeak === 0
      ? Number.NEGATIVE_INFINITY
      : 20 * Math.log10(maxSamplePeak);

  // 2. Compute momentary energy in 400ms blocks with 75% overlap (100ms step)
  const blockSize = Math.floor(0.4 * sampleRate);
  const stepSize = Math.floor(0.1 * sampleRate);
  const weights = getChannelWeights(channels.length);

  const totalSamples = channels[0].length;
  if (totalSamples < blockSize) {
    // Shorter than 400ms: compute single un-gated block
    let sum = 0;
    for (let ch = 0; ch < channels.length; ch++) {
      const chData = filteredChannels[ch];
      const w = weights[ch] ?? 1.0;
      let chSum = 0;
      for (let i = 0; i < totalSamples; i++) {
        chSum += chData[i] * chData[i];
      }
      sum += w * (chSum / totalSamples);
    }
    const lufs =
      sum > 0 ? -0.691 + 10 * Math.log10(sum) : Number.NEGATIVE_INFINITY;
    return {
      integratedLufs: lufs,
      truePeakDb: maxTruePeak,
      samplePeakDbfs,
      loudnessRangeLu: 0,
      noiseFloorDbfs: measureNoiseFloor(audio),
      durationSeconds,
      channels: channels.length,
      sampleRate,
    };
  }

  const blockEnergies: number[] = [];
  const numSteps = Math.floor((totalSamples - blockSize) / stepSize) + 1;

  for (let step = 0; step < numSteps; step++) {
    const offset = step * stepSize;
    let sum = 0;
    for (let ch = 0; ch < channels.length; ch++) {
      const chData = filteredChannels[ch];
      const w = weights[ch] ?? 1.0;
      let chSum = 0;
      for (let i = 0; i < blockSize; i++) {
        const val = chData[offset + i];
        chSum += val * val;
      }
      sum += w * (chSum / blockSize);
    }
    blockEnergies.push(sum);
  }

  // 3. Absolute threshold gating at -70 LKFS
  // z_j > 10^((-70 + 0.691) / 10)
  const absThreshold = Math.pow(10, (-70 + 0.691) / 10);
  const passedAbsEnergies: number[] = [];

  for (const energy of blockEnergies) {
    if (energy > absThreshold) {
      passedAbsEnergies.push(energy);
    }
  }

  if (passedAbsEnergies.length === 0) {
    return {
      integratedLufs: Number.NEGATIVE_INFINITY,
      truePeakDb: maxTruePeak,
      samplePeakDbfs,
      loudnessRangeLu: 0,
      noiseFloorDbfs: measureNoiseFloor(audio),
      durationSeconds,
      channels: channels.length,
      sampleRate,
    };
  }

  // Mean energy of blocks passing absolute threshold
  const meanAbsEnergy =
    passedAbsEnergies.reduce((acc, v) => acc + v, 0) / passedAbsEnergies.length;
  const absLoudness = -0.691 + 10 * Math.log10(meanAbsEnergy);

  // 4. Relative threshold gating at (absLoudness - 10 LU)
  const relThreshold = Math.pow(10, (absLoudness - 10 + 0.691) / 10);
  const passedRelEnergies: number[] = [];

  for (const energy of passedAbsEnergies) {
    if (energy > relThreshold) {
      passedRelEnergies.push(energy);
    }
  }

  let integratedLufs = Number.NEGATIVE_INFINITY;
  if (passedRelEnergies.length > 0) {
    const meanRelEnergy =
      passedRelEnergies.reduce((acc, v) => acc + v, 0) /
      passedRelEnergies.length;
    integratedLufs = -0.691 + 10 * Math.log10(meanRelEnergy);
  }

  // 5. Loudness Range (LRA) according to EBU R128 / Tech 3342
  // Using 3-second short-term windows with 66% overlap (1s step)
  const shortTermBlockSize = Math.floor(3.0 * sampleRate);
  const shortTermStepSize = Math.floor(1.0 * sampleRate);
  let loudnessRangeLu = 0;

  if (totalSamples >= shortTermBlockSize) {
    const shortTermEnergies: number[] = [];
    const numStSteps =
      Math.floor((totalSamples - shortTermBlockSize) / shortTermStepSize) + 1;

    for (let s = 0; s < numStSteps; s++) {
      const offset = s * shortTermStepSize;
      let sum = 0;
      for (let ch = 0; ch < channels.length; ch++) {
        const chData = filteredChannels[ch];
        const w = weights[ch] ?? 1.0;
        let chSum = 0;
        for (let i = 0; i < shortTermBlockSize; i++) {
          const val = chData[offset + i];
          chSum += val * val;
        }
        sum += w * (chSum / shortTermBlockSize);
      }
      if (sum > absThreshold) {
        shortTermEnergies.push(-0.691 + 10 * Math.log10(sum));
      }
    }

    if (shortTermEnergies.length > 5) {
      shortTermEnergies.sort((a, b) => a - b);
      const lowIndex = Math.floor(shortTermEnergies.length * 0.1);
      const highIndex = Math.floor(shortTermEnergies.length * 0.95);
      loudnessRangeLu = Math.max(
        0,
        shortTermEnergies[highIndex] - shortTermEnergies[lowIndex],
      );
    }
  }

  const noiseFloorDbfs = measureNoiseFloor(audio);

  return {
    integratedLufs: Math.round(integratedLufs * 10) / 10,
    truePeakDb: Math.round(maxTruePeak * 10) / 10,
    samplePeakDbfs:
      Math.round(
        maxSamplePeak === 0
          ? Number.NEGATIVE_INFINITY
          : 20 * Math.log10(maxSamplePeak) * 10,
      ) / 10,
    loudnessRangeLu: Math.round(loudnessRangeLu * 10) / 10,
    noiseFloorDbfs: Math.round(noiseFloorDbfs * 10) / 10,
    durationSeconds: Math.round(durationSeconds * 100) / 100,
    channels: channels.length,
    sampleRate,
  };
}

/**
 * Evaluate measured metrics against delivery standards.
 */
export function evaluateStandards(
  metrics: LoudnessMetrics,
): StandardEvaluation[] {
  return DELIVERY_STANDARDS.map((std) => {
    const diff = metrics.integratedLufs - std.targetLufs;
    const passesLufs = Math.abs(diff) <= std.lufsTolerance;
    const passesTruePeak = metrics.truePeakDb <= std.maxTruePeakDb;
    const passesNoiseFloor =
      std.maxNoiseFloorDb !== undefined
        ? metrics.noiseFloorDbfs <= std.maxNoiseFloorDb
        : true;

    const overallPass = passesLufs && passesTruePeak && passesNoiseFloor;
    const truePeakHeadroom =
      Math.round((std.maxTruePeakDb - metrics.truePeakDb) * 10) / 10;
    const roundedDiff = Math.round(diff * 10) / 10;

    const parts: string[] = [];
    if (passesLufs) {
      parts.push(`Loudness compliant (${metrics.integratedLufs} LUFS)`);
    } else if (diff > 0) {
      parts.push(`Exceeds target by ${roundedDiff} LU`);
    } else {
      parts.push(`Below target by ${Math.abs(roundedDiff)} LU`);
    }

    if (!passesTruePeak) {
      parts.push(
        `True peak exceeded (${metrics.truePeakDb} dBTP > max ${std.maxTruePeakDb} dBTP)`,
      );
    }

    if (!passesNoiseFloor && std.maxNoiseFloorDb !== undefined) {
      parts.push(
        `Noise floor too high (${metrics.noiseFloorDbfs} dBFS > limit ${std.maxNoiseFloorDb} dBFS)`,
      );
    }

    return {
      standard: std,
      passesLufs,
      passesTruePeak,
      passesNoiseFloor,
      overallPass,
      lufsDifference: roundedDiff,
      truePeakHeadroom,
      summary: parts.join('; '),
    };
  });
}
