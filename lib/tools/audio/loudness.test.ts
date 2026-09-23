import { describe, expect, it } from 'vitest';
import {
  evaluateStandards,
  measureLoudness,
  measureNoiseFloor,
  measureTruePeak,
} from './loudness';
import type { AudioData } from './wav';

describe('ITU-R BS.1770-4 Audio Loudness and Delivery Check', () => {
  it('measures silent audio correctly', () => {
    const sampleRate = 48000;
    const channel = new Float32Array(sampleRate); // 1 sec silence
    const audio: AudioData = {
      sampleRate,
      channels: [channel, channel],
    };

    const metrics = measureLoudness(audio);
    expect(metrics.integratedLufs).toBe(Number.NEGATIVE_INFINITY);
    expect(metrics.truePeakDb).toBe(Number.NEGATIVE_INFINITY);
  });

  it('measures 1 kHz sine wave loudness and peak accurately', () => {
    const sampleRate = 48000;
    const durationSec = 1.0;
    const numSamples = Math.floor(sampleRate * durationSec);
    const channel = new Float32Array(numSamples);

    // 1 kHz sine wave with 0 dBFS amplitude (peak = 1.0)
    for (let i = 0; i < numSamples; i++) {
      channel[i] = Math.sin((2 * Math.PI * 1000 * i) / sampleRate);
    }

    const audio: AudioData = {
      sampleRate,
      channels: [channel, channel],
    };

    const metrics = measureLoudness(audio);

    // Peak of full scale sine is ~0 dBFS
    expect(metrics.samplePeakDbfs).toBeCloseTo(0, 0);
    expect(metrics.truePeakDb).toBeGreaterThanOrEqual(-0.2);

    // In BS.1770, a 0 dBFS 1 kHz sine on ONE channel yields -3.01 LKFS.
    // Across TWO identical channels (L and R), the total energy is 2x (+3.01 dB), yielding 0.0 LKFS.
    expect(metrics.integratedLufs).toBeCloseTo(0, 0);

    const monoAudio: AudioData = { sampleRate, channels: [channel] };
    const monoMetrics = measureLoudness(monoAudio);
    expect(monoMetrics.integratedLufs).toBeCloseTo(-3, 0);

    const evals = evaluateStandards(metrics);
    expect(evals.length).toBeGreaterThan(5);

    const spotify = evals.find((e) => e.standard.id === 'spotify')!;
    expect(spotify).toBeDefined();
    // A full scale sine wave is louder than -14 LUFS
    expect(spotify.passesLufs).toBe(false);
  });

  it('measures noise floor on low-level signal', () => {
    const sampleRate = 48000;
    const numSamples = sampleRate;
    const channel = new Float32Array(numSamples);

    // 1e-4 amplitude (-80 dBFS)
    for (let i = 0; i < numSamples; i++) {
      channel[i] = (Math.random() * 2 - 1) * 1e-4;
    }

    const audio: AudioData = {
      sampleRate,
      channels: [channel],
    };

    const nf = measureNoiseFloor(audio);
    expect(nf).toBeLessThan(-70);
  });

  it('detects inter-sample true peak higher than sample peak', () => {
    // Construct sample points that miss an analog peak between samples
    const channel = new Float32Array([0, 0.9, 0.9, 0]);
    const tp = measureTruePeak(channel);
    const samplePeak = 20 * Math.log10(0.9);
    expect(tp).toBeGreaterThan(samplePeak);
  });
});
