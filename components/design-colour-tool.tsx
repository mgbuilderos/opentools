'use client';

import {
  AlertTriangle,
  ArrowDownToLine,
  CheckCircle2,
  Copy,
  FilePlus2,
  Info,
  Palette,
  Pipette,
  ShieldCheck,
  UploadCloud,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';

import { AppShell } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import { announceCompletion } from '@/lib/completion';
import {
  cmykToRgb,
  colorFromRgb,
  hslToRgb,
  parseHexColor,
  rgbToCmyk,
  rgbToHsl,
  CMYK_APPROXIMATION_NOTICE,
  type CmykColor,
  type ConvertedColorProfile,
  type HslColor,
  type RgbColor,
} from '@/lib/tools/design/colour';
import {
  extractPaletteFromRgba,
  PALETTE_METHOD_NOTICE,
  type PaletteExtractionResult,
} from '@/lib/tools/design/palette';

export function DesignColourTool() {
  const paletteFileInputRef = useRef<HTMLInputElement>(null);
  const hexInputId = useId();

  // Mode: converter or palette
  const [activeTab, setActiveTab] = useState<'convert' | 'palette'>('convert');

  // Colour Converter State
  const [currentRgb, setCurrentRgb] = useState<RgbColor>({
    r: 33,
    g: 150,
    b: 243,
  }); // #2196f3
  const [hexInput, setHexInput] = useState<string>('#2196f3');
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);

  // Derived profiles
  const profile: ConvertedColorProfile = useMemo(() => {
    return colorFromRgb(currentRgb);
  }, [currentRgb]);

  // Palette Extractor State
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [imageFilename, setImageFilename] = useState<string>('photo.jpg');
  const [swatchCount, setSwatchCount] = useState<number>(6);
  const [paletteResult, setPaletteResult] =
    useState<PaletteExtractionResult | null>(null);
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedSwatchHex, setCopiedSwatchHex] = useState<string | null>(null);
  const [paletteJsonUrl, setPaletteJsonUrl] = useState<string | null>(null);

  // Clean up object URLs
  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
      if (paletteJsonUrl) URL.revokeObjectURL(paletteJsonUrl);
    };
  }, [imagePreviewUrl, paletteJsonUrl]);

  // Handle Hex Input
  const handleHexChange = useCallback((value: string) => {
    setHexInput(value);
    const parsed = parseHexColor(value);
    if (parsed) {
      setCurrentRgb(parsed);
    }
  }, []);

  // Handle RGB Sliders
  const handleRgbChange = useCallback(
    (channel: keyof RgbColor, val: number) => {
      setCurrentRgb((prev) => {
        const next = { ...prev, [channel]: Math.min(255, Math.max(0, val)) };
        setHexInput(colorFromRgb(next).hex);
        return next;
      });
    },
    [],
  );

  // Handle HSL Sliders
  const handleHslChange = useCallback(
    (channel: keyof HslColor, val: number) => {
      const currentHsl = rgbToHsl(currentRgb);
      const updated = {
        ...currentHsl,
        [channel]:
          channel === 'h'
            ? Math.min(360, Math.max(0, val))
            : Math.min(100, Math.max(0, val)),
      };
      const newRgb = hslToRgb(updated);
      setCurrentRgb(newRgb);
      setHexInput(colorFromRgb(newRgb).hex);
    },
    [currentRgb],
  );

  // Handle CMYK Sliders
  const handleCmykChange = useCallback(
    (channel: keyof CmykColor, val: number) => {
      const currentCmyk = rgbToCmyk(currentRgb);
      const updated = {
        ...currentCmyk,
        [channel]: Math.min(100, Math.max(0, val)),
      };
      const newRgb = cmykToRgb(updated);
      setCurrentRgb(newRgb);
      setHexInput(colorFromRgb(newRgb).hex);
    },
    [currentRgb],
  );

  const copyToClipboard = useCallback(async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedFormat(label);
      setTimeout(() => setCopiedFormat(null), 2000);
    } catch {
      setErrorMessage('Failed to copy to clipboard.');
    }
  }, []);

  // Extract Palette from uploaded file
  const handleImageFile = useCallback(
    async (fileList: FileList | File[]) => {
      setErrorMessage(null);
      const file = fileList[0];
      if (!file) return;

      setIsExtracting(true);
      const startTime = performance.now();

      try {
        if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
        const objUrl = URL.createObjectURL(file);
        setImagePreviewUrl(objUrl);
        setImageFilename(file.name.replace(/[^\w.-]/g, '_'));

        const img = new Image();

        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () =>
            reject(new Error('Failed to load image for color analysis.'));
          img.src = objUrl;
        });

        if ('decode' in img) {
          try {
            await img.decode();
          } catch {
            // decode fallback
          }
        }

        // Downscale to max 200x200 for fast, high-quality median cut sampling
        const maxDim = 200;
        let w = img.naturalWidth || img.width;
        let h = img.naturalHeight || img.height;
        if (w > maxDim || h > maxDim) {
          const ratio = Math.min(maxDim / w, maxDim / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }

        const canvas = window.document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Could not get 2D canvas context.');

        ctx.drawImage(img, 0, 0, w, h);
        const imageData = ctx.getImageData(0, 0, w, h);

        const result = extractPaletteFromRgba(imageData.data, swatchCount);
        setPaletteResult(result);

        // Create downloadable JSON
        if (paletteJsonUrl) URL.revokeObjectURL(paletteJsonUrl);
        const jsonContent = JSON.stringify(
          {
            image: file.name,
            method: result.method,
            swatches: result.swatches.map((s) => ({
              hex: s.profile.hex,
              rgb: s.profile.rgbCss,
              hsl: s.profile.hslCss,
              cmyk: s.profile.cmykCss,
              percentage: `${s.percentage}%`,
            })),
          },
          null,
          2,
        );
        const blob = new Blob([jsonContent], { type: 'application/json' });
        setPaletteJsonUrl(URL.createObjectURL(blob));

        const elapsed = performance.now() - startTime;
        announceCompletion({
          operation: 'Palette Extraction',
          durationMs: elapsed,
          summary: `Extracted ${result.swatches.length} dominant colour swatches using Median Cut Color Quantization.`,
          metrics: [
            { label: 'Swatches', value: String(result.swatches.length) },
            { label: 'Pixels', value: String(result.totalSampledPixels) },
            { label: 'Algorithm', value: 'Median Cut' },
          ],
        });
      } catch (err) {
        setErrorMessage(
          err instanceof Error
            ? err.message
            : 'An error occurred while analyzing image colors.',
        );
      } finally {
        setIsExtracting(false);
      }
    },
    [imagePreviewUrl, paletteJsonUrl, swatchCount],
  );

  return (
    <AppShell currentToolId="color-converter" currentGroupId="images">
      <section id="tool" tabIndex={-1} className="space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Colour Converter & Palette Extractor
          </h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            Accurate conversions across HEX, RGB, HSL, and CMYK color spaces,
            plus dominant color palette extraction from photos via Median Cut
            quantization. 100% browser-based.
          </p>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex items-center rounded-lg border border-border bg-muted/40 p-1 w-fit">
          <button
            type="button"
            onClick={() => setActiveTab('convert')}
            className={`flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors ${
              activeTab === 'convert'
                ? 'bg-background text-foreground shadow-sm font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Pipette className="h-3.5 w-3.5" />
            Color Space Converter
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('palette')}
            className={`flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors ${
              activeTab === 'palette'
                ? 'bg-background text-foreground shadow-sm font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Palette className="h-3.5 w-3.5" />
            Image Palette Extractor
          </button>
        </div>

        {/* Tab 1: Color Space Converter */}
        {activeTab === 'convert' && (
          <div className="space-y-6">
            {/* Color Preview Swatch Bar */}
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <div
                className="h-36 w-full flex items-center justify-center p-4 transition-colors"
                style={{ backgroundColor: profile.hex }}
              >
                <div className="rounded-lg bg-background/90 px-4 py-2 font-mono text-sm font-bold text-foreground shadow-sm">
                  {profile.hex}
                </div>
              </div>

              {/* Quick Copy Chips */}
              <div className="grid grid-cols-2 gap-2 border-t border-border p-4 sm:grid-cols-4">
                <button
                  type="button"
                  onClick={() => void copyToClipboard(profile.hex, 'hex')}
                  className="flex items-center justify-between rounded-lg border border-border bg-background p-2.5 text-left text-xs transition-colors hover:border-foreground/40"
                >
                  <div>
                    <span className="text-muted-foreground">HEX</span>
                    <div className="font-mono font-medium text-foreground">
                      {profile.hex}
                    </div>
                  </div>
                  {copiedFormat === 'hex' ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-foreground" />
                  ) : (
                    <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => void copyToClipboard(profile.rgbCss, 'rgb')}
                  className="flex items-center justify-between rounded-lg border border-border bg-background p-2.5 text-left text-xs transition-colors hover:border-foreground/40"
                >
                  <div>
                    <span className="text-muted-foreground">RGB</span>
                    <div className="font-mono font-medium text-foreground">
                      {profile.rgbCss}
                    </div>
                  </div>
                  {copiedFormat === 'rgb' ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-foreground" />
                  ) : (
                    <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => void copyToClipboard(profile.hslCss, 'hsl')}
                  className="flex items-center justify-between rounded-lg border border-border bg-background p-2.5 text-left text-xs transition-colors hover:border-foreground/40"
                >
                  <div>
                    <span className="text-muted-foreground">HSL</span>
                    <div className="font-mono font-medium text-foreground">
                      {profile.hslCss}
                    </div>
                  </div>
                  {copiedFormat === 'hsl' ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-foreground" />
                  ) : (
                    <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => void copyToClipboard(profile.cmykCss, 'cmyk')}
                  className="flex items-center justify-between rounded-lg border border-border bg-background p-2.5 text-left text-xs transition-colors hover:border-foreground/40"
                >
                  <div>
                    <span className="text-muted-foreground">CMYK</span>
                    <div className="font-mono font-medium text-foreground">
                      {profile.cmykCss}
                    </div>
                  </div>
                  {copiedFormat === 'cmyk' ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-foreground" />
                  ) : (
                    <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </button>
              </div>
            </div>

            {/* Honest CMYK Print Approximation Callout */}
            <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-foreground">
                    CMYK Print Reproduction Notice
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {CMYK_APPROXIMATION_NOTICE}
                  </p>
                </div>
              </div>
            </div>

            {/* Slider Controls Matrix */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* HEX & RGB Controls */}
              <div className="space-y-4 rounded-xl border border-border bg-card p-5 sm:p-6">
                <h3 className="text-base font-semibold text-foreground">
                  HEX & RGB Channels
                </h3>

                <div>
                  <label
                    htmlFor={hexInputId}
                    className="block text-xs font-medium text-foreground"
                  >
                    HEX Color Code
                  </label>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      id={hexInputId}
                      type="text"
                      value={hexInput}
                      onChange={(e) => handleHexChange(e.target.value)}
                      placeholder="#2196f3"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm text-foreground focus:border-foreground focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <div>
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-foreground">
                        Red (R)
                      </span>
                      <span className="font-mono text-muted-foreground">
                        {currentRgb.r}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="255"
                      value={currentRgb.r}
                      onChange={(e) =>
                        handleRgbChange('r', parseInt(e.target.value, 10))
                      }
                      className="mt-1 h-2 w-full cursor-pointer accent-foreground"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-foreground">
                        Green (G)
                      </span>
                      <span className="font-mono text-muted-foreground">
                        {currentRgb.g}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="255"
                      value={currentRgb.g}
                      onChange={(e) =>
                        handleRgbChange('g', parseInt(e.target.value, 10))
                      }
                      className="mt-1 h-2 w-full cursor-pointer accent-foreground"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-foreground">
                        Blue (B)
                      </span>
                      <span className="font-mono text-muted-foreground">
                        {currentRgb.b}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="255"
                      value={currentRgb.b}
                      onChange={(e) =>
                        handleRgbChange('b', parseInt(e.target.value, 10))
                      }
                      className="mt-1 h-2 w-full cursor-pointer accent-foreground"
                    />
                  </div>
                </div>
              </div>

              {/* HSL & CMYK Controls */}
              <div className="space-y-4 rounded-xl border border-border bg-card p-5 sm:p-6">
                <h3 className="text-base font-semibold text-foreground">
                  HSL & CMYK Channels
                </h3>

                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-foreground">
                        Hue (H)
                      </span>
                      <span className="font-mono text-muted-foreground">
                        {profile.hsl.h}°
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="360"
                      value={profile.hsl.h}
                      onChange={(e) =>
                        handleHslChange('h', parseInt(e.target.value, 10))
                      }
                      className="mt-1 h-2 w-full cursor-pointer accent-foreground"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-foreground">
                        Saturation (S)
                      </span>
                      <span className="font-mono text-muted-foreground">
                        {profile.hsl.s}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={profile.hsl.s}
                      onChange={(e) =>
                        handleHslChange('s', parseInt(e.target.value, 10))
                      }
                      className="mt-1 h-2 w-full cursor-pointer accent-foreground"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-foreground">
                        Lightness (L)
                      </span>
                      <span className="font-mono text-muted-foreground">
                        {profile.hsl.l}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={profile.hsl.l}
                      onChange={(e) =>
                        handleHslChange('l', parseInt(e.target.value, 10))
                      }
                      className="mt-1 h-2 w-full cursor-pointer accent-foreground"
                    />
                  </div>

                  <div className="pt-3 border-t border-border space-y-2">
                    <span className="block text-xs font-semibold text-foreground">
                      CMYK Ink Channels
                    </span>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Cyan</span>
                          <span className="font-mono text-foreground">
                            {profile.cmyk.c}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={profile.cmyk.c}
                          onChange={(e) =>
                            handleCmykChange('c', parseInt(e.target.value, 10))
                          }
                          className="mt-1 h-2 w-full cursor-pointer accent-foreground"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Magenta</span>
                          <span className="font-mono text-foreground">
                            {profile.cmyk.m}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={profile.cmyk.m}
                          onChange={(e) =>
                            handleCmykChange('m', parseInt(e.target.value, 10))
                          }
                          className="mt-1 h-2 w-full cursor-pointer accent-foreground"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Yellow</span>
                          <span className="font-mono text-foreground">
                            {profile.cmyk.y}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={profile.cmyk.y}
                          onChange={(e) =>
                            handleCmykChange('y', parseInt(e.target.value, 10))
                          }
                          className="mt-1 h-2 w-full cursor-pointer accent-foreground"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">
                            Black (K)
                          </span>
                          <span className="font-mono text-foreground">
                            {profile.cmyk.k}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={profile.cmyk.k}
                          onChange={(e) =>
                            handleCmykChange('k', parseInt(e.target.value, 10))
                          }
                          className="mt-1 h-2 w-full cursor-pointer accent-foreground"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Palette Extractor */}
        {activeTab === 'palette' && (
          <div className="space-y-6">
            {/* Hidden File Input */}
            <input
              ref={paletteFileInputRef}
              type="file"
              id="palette-file-input"
              aria-label="Upload image to extract color palette"
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                if (e.target.files) void handleImageFile(e.target.files);
              }}
            />

            {/* Dropzone */}
            {!imagePreviewUrl && (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (e.dataTransfer.files)
                    void handleImageFile(e.dataTransfer.files);
                }}
                className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-card/50 p-8 text-center transition-colors hover:border-foreground/30 sm:p-12"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-foreground">
                  <UploadCloud className="h-6 w-6" />
                </div>
                <h2 className="mt-4 text-base font-semibold text-foreground sm:text-lg">
                  Drop a photo or graphic here, or browse
                </h2>
                <p className="mt-1.5 max-w-md text-xs text-muted-foreground sm:text-sm">
                  Supports JPEG, PNG, and WebP. Automatically extracts dominant
                  harmonious color swatches.
                </p>

                <div className="mt-4 flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    Swatches:
                  </span>
                  {[4, 6, 8].map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setSwatchCount(count)}
                      className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                        swatchCount === count
                          ? 'bg-foreground text-background font-bold'
                          : 'bg-muted text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {count} colors
                    </button>
                  ))}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="mt-5"
                  disabled={isExtracting}
                  onClick={() => paletteFileInputRef.current?.click()}
                >
                  <FilePlus2 className="mr-2 h-4 w-4" />
                  {isExtracting ? 'Analyzing Palette...' : 'Choose Image File'}
                </Button>
                <div className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                  <span>
                    Images are processed in memory inside this browser tab. Zero
                    network egress.
                  </span>
                </div>
              </div>
            )}

            {/* Error banner */}
            {errorMessage && (
              <div
                role="alert"
                className="flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="flex-1 font-medium">{errorMessage}</div>
              </div>
            )}

            {/* Extracted Palette Results */}
            {paletteResult && imagePreviewUrl && (
              <div className="space-y-6">
                {/* Method explanation callout */}
                <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="space-y-1">
                      <div className="text-xs font-semibold text-foreground">
                        Algorithm Methodology
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {PALETTE_METHOD_NOTICE}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Swatches Visual Grid */}
                <div className="space-y-4 rounded-xl border border-border bg-card p-5 sm:p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-foreground">
                        Extracted Swatches ({paletteResult.swatches.length}{' '}
                        colors)
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Source: {imageFilename} • Sampled{' '}
                        {paletteResult.totalSampledPixels} pixels
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {paletteJsonUrl && (
                        <a
                          href={paletteJsonUrl}
                          download={`${imageFilename.replace(/\.[^/.]+$/, '')}_palette.json`}
                          data-receipt-download
                          className="inline-flex items-center justify-center rounded-lg border border-border bg-foreground px-3.5 py-1.5 text-xs font-medium text-background hover:opacity-90"
                        >
                          <ArrowDownToLine className="mr-1.5 h-3.5 w-3.5" />
                          Download JSON
                        </a>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => paletteFileInputRef.current?.click()}
                      >
                        <FilePlus2 className="mr-1.5 h-3.5 w-3.5" />
                        New Image
                      </Button>
                    </div>
                  </div>

                  {/* Visual Swatch Row */}
                  <div className="h-16 w-full flex overflow-hidden rounded-lg border border-border">
                    {paletteResult.swatches.map((swatch, idx) => (
                      <div
                        key={idx}
                        className="h-full flex-1 transition-all hover:flex-[1.5]"
                        style={{ backgroundColor: swatch.profile.hex }}
                        title={`${swatch.profile.hex} (${swatch.percentage}%)`}
                      />
                    ))}
                  </div>

                  {/* Individual Swatch Details Cards */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 pt-2">
                    {paletteResult.swatches.map((swatch, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-3 rounded-lg border border-border bg-background p-3"
                      >
                        <div
                          className="h-12 w-12 shrink-0 rounded-md border border-border"
                          style={{ backgroundColor: swatch.profile.hex }}
                        />
                        <div className="flex-1 space-y-0.5">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs font-bold text-foreground">
                              {swatch.profile.hex}
                            </span>
                            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-foreground">
                              {swatch.percentage}%
                            </span>
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {swatch.profile.rgbCss}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {swatch.profile.cmykCss}
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            void navigator.clipboard.writeText(
                              swatch.profile.hex,
                            );
                            setCopiedSwatchHex(swatch.profile.hex);
                            setTimeout(() => setCopiedSwatchHex(null), 2000);
                          }}
                          aria-label={`Copy hex code ${swatch.profile.hex}`}
                        >
                          {copiedSwatchHex === swatch.profile.hex ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-foreground" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </AppShell>
  );
}
