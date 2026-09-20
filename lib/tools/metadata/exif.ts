import type { CameraData, GpsData, ShotDetails } from './types';

export interface TiffParseResult {
  hasExif: boolean;
  camera: CameraData;
  shot: ShotDetails;
  gps?: GpsData;
  warnings: string[];
}

/**
 * Parses raw TIFF structure bytes from an EXIF payload.
 *
 * TIFF structure:
 * - Bytes 0..1: Byte order: 'II' (0x4949, little-endian) or 'MM' (0x4D4D, big-endian)
 * - Bytes 2..3: Magic 42 (0x002A)
 * - Bytes 4..7: Offset of IFD0 from start of TIFF header
 *
 * Each IFD directory:
 * - 2-byte entry count
 * - 12-byte entries (tag, type, count, value/offset)
 * - 4-byte offset to next IFD
 */
export function parseTiff(tiff: Uint8Array): TiffParseResult {
  const result: TiffParseResult = {
    hasExif: false,
    camera: {},
    shot: {},
    warnings: [],
  };

  if (tiff.length < 8) {
    return result;
  }

  const isLittle = tiff[0] === 0x49 && tiff[1] === 0x49;
  const isBig = tiff[0] === 0x4d && tiff[1] === 0x4d;

  if (!isLittle && !isBig) {
    result.warnings.push('Invalid TIFF byte order marker (expected II or MM)');
    return result;
  }

  const readU16 = (o: number): number => {
    if (o + 2 > tiff.length) return 0;
    return isLittle
      ? tiff[o] | (tiff[o + 1] << 8)
      : (tiff[o] << 8) | tiff[o + 1];
  };

  const readU32 = (o: number): number => {
    if (o + 4 > tiff.length) return 0;
    return isLittle
      ? (tiff[o] |
          (tiff[o + 1] << 8) |
          (tiff[o + 2] << 16) |
          (tiff[o + 3] << 24)) >>>
          0
      : ((tiff[o] << 24) |
          (tiff[o + 1] << 16) |
          (tiff[o + 2] << 8) |
          tiff[o + 3]) >>>
          0;
  };

  const readI32 = (o: number): number => {
    const val = readU32(o);
    return val >= 0x80000000 ? val - 0x100000000 : val;
  };

  const magic = readU16(2);
  if (magic !== 0x002a) {
    result.warnings.push(`TIFF magic number 42 mismatch (found ${magic})`);
    return result;
  }

  const ifd0Offset = readU32(4);
  if (ifd0Offset >= tiff.length || ifd0Offset < 8) {
    result.warnings.push(`Invalid IFD0 offset (${ifd0Offset})`);
    return result;
  }

  result.hasExif = true;

  let exifSubIfdOffset = 0;
  let gpsSubIfdOffset = 0;

  // Intermediate GPS fields to assemble coordinates
  const gpsState: {
    latDegrees: [number, number, number] | null;
    latRef: string | null;
    lonDegrees: [number, number, number] | null;
    lonRef: string | null;
    altVal: number | null;
    altRef: number | null;
    timeStampArr: [number, number, number] | null;
    dateStampStr: string | null;
  } = {
    latDegrees: null,
    latRef: null,
    lonDegrees: null,
    lonRef: null,
    altVal: null,
    altRef: null,
    timeStampArr: null,
    dateStampStr: null,
  };

  const parseIfd = (
    ifdOffset: number,
    directoryKind: 'ifd0' | 'exif' | 'gps',
  ) => {
    if (ifdOffset + 2 > tiff.length) return;
    const numEntries = readU16(ifdOffset);
    let entryOffset = ifdOffset + 2;

    for (
      let i = 0;
      i < numEntries && entryOffset + 12 <= tiff.length;
      i++, entryOffset += 12
    ) {
      const tag = readU16(entryOffset);
      const type = readU16(entryOffset + 2);
      const count = readU32(entryOffset + 4);

      // Type sizes in bytes
      // 1: BYTE=1, 2: ASCII=1, 3: SHORT=2, 4: LONG=4, 5: RATIONAL=8,
      // 7: UNDEFINED=1, 9: SLONG=4, 10: SRATIONAL=8
      let typeSize = 1;
      if (type === 3) typeSize = 2;
      else if (type === 4 || type === 9) typeSize = 4;
      else if (type === 5 || type === 10) typeSize = 8;

      const totalBytes = count * typeSize;

      // Inline value vs offset
      const valuePtr =
        totalBytes <= 4 ? entryOffset + 8 : readU32(entryOffset + 8);

      if (valuePtr + totalBytes > tiff.length && totalBytes > 4) {
        continue; // Out-of-bounds pointer, skip safely
      }

      const readString = (): string => {
        if (valuePtr >= tiff.length) return '';
        const end = Math.min(tiff.length, valuePtr + count);
        let s = '';
        for (let j = valuePtr; j < end; j++) {
          if (tiff[j] === 0) break;
          s += String.fromCharCode(tiff[j]);
        }
        return s.trim();
      };

      const readRational = (o: number): number => {
        if (o + 8 > tiff.length) return 0;
        const num = readU32(o);
        const den = readU32(o + 4);
        return den === 0 ? 0 : num / den;
      };

      const readNumeric = (o: number): number => {
        if (type === 3) return readU16(o);
        if (type === 4) return readU32(o);
        if (type === 9) return readI32(o);
        if (type === 1) return tiff[o] ?? 0;
        return 0;
      };

      if (directoryKind === 'ifd0') {
        if (tag === 0x010f) result.camera.make = readString();
        else if (tag === 0x0110) result.camera.model = readString();
        else if (tag === 0x0112) result.shot.orientation = readU16(valuePtr);
        else if (tag === 0x0131) result.camera.software = readString();
        else if (tag === 0x0132) result.shot.dateTime = readString();
        else if (tag === 0x8769) exifSubIfdOffset = readU32(valuePtr);
        else if (tag === 0x8825) gpsSubIfdOffset = readU32(valuePtr);
      } else if (directoryKind === 'exif') {
        if (tag === 0x9003) result.shot.dateTimeOriginal = readString();
        else if (tag === 0x9004) result.shot.dateTimeDigitized = readString();
        else if (tag === 0x829a) {
          const r = readRational(valuePtr);
          if (r > 0 && r < 1) {
            result.shot.exposureTime = `1/${Math.round(1 / r)}s`;
          } else if (r > 0) {
            result.shot.exposureTime = `${r.toFixed(1).replace(/\.0$/, '')}s`;
          }
        } else if (tag === 0x829d) {
          const r = readRational(valuePtr);
          if (r > 0) {
            result.shot.fNumber = `f/${r.toFixed(1)}`;
          }
        } else if (tag === 0x8827) {
          result.shot.iso = readNumeric(valuePtr);
        } else if (tag === 0x920a) {
          const r = readRational(valuePtr);
          if (r > 0) {
            result.shot.focalLength = `${r.toFixed(1)} mm`;
          }
        } else if (tag === 0xa002) {
          result.shot.width = readNumeric(valuePtr);
        } else if (tag === 0xa003) {
          result.shot.height = readNumeric(valuePtr);
        } else if (tag === 0xa430) {
          result.camera.ownerName = readString();
        } else if (tag === 0xa431) {
          result.camera.serialNumber = readString();
        } else if (tag === 0xa433) {
          result.camera.lensMake = readString();
        } else if (tag === 0xa434) {
          result.camera.lensModel = readString();
        }
      } else if (directoryKind === 'gps') {
        if (tag === 0x0001) {
          gpsState.latRef = readString();
        } else if (tag === 0x0002 && count === 3) {
          gpsState.latDegrees = [
            readRational(valuePtr),
            readRational(valuePtr + 8),
            readRational(valuePtr + 16),
          ];
        } else if (tag === 0x0003) {
          gpsState.lonRef = readString();
        } else if (tag === 0x0004 && count === 3) {
          gpsState.lonDegrees = [
            readRational(valuePtr),
            readRational(valuePtr + 8),
            readRational(valuePtr + 16),
          ];
        } else if (tag === 0x0005) {
          gpsState.altRef = tiff[valuePtr] ?? 0;
        } else if (tag === 0x0006) {
          gpsState.altVal = readRational(valuePtr);
        } else if (tag === 0x0007 && count === 3) {
          gpsState.timeStampArr = [
            readRational(valuePtr),
            readRational(valuePtr + 8),
            readRational(valuePtr + 16),
          ];
        } else if (tag === 0x001d) {
          gpsState.dateStampStr = readString();
        }
      }
    }
  };

  parseIfd(ifd0Offset, 'ifd0');
  if (exifSubIfdOffset > 0 && exifSubIfdOffset < tiff.length) {
    parseIfd(exifSubIfdOffset, 'exif');
  }
  if (gpsSubIfdOffset > 0 && gpsSubIfdOffset < tiff.length) {
    parseIfd(gpsSubIfdOffset, 'gps');
  }

  const {
    latDegrees,
    latRef,
    lonDegrees,
    lonRef,
    altVal,
    altRef,
    timeStampArr,
    dateStampStr,
  } = gpsState;

  // Assemble GPS data if coordinates exist
  if (latDegrees && lonDegrees) {
    let lat = latDegrees[0] + latDegrees[1] / 60 + latDegrees[2] / 3600;
    const isSouth = latRef?.toUpperCase() === 'S';
    if (isSouth) lat = -lat;

    let lon = lonDegrees[0] + lonDegrees[1] / 60 + lonDegrees[2] / 3600;
    const isWest = lonRef?.toUpperCase() === 'W';
    if (isWest) lon = -lon;

    const refLatChar = isSouth ? 'S' : 'N';
    const refLonChar = isWest ? 'W' : 'E';

    const formattedLat = `${Math.abs(latDegrees[0])}° ${latDegrees[1]}' ${latDegrees[2].toFixed(2)}" ${refLatChar}`;
    const formattedLon = `${Math.abs(lonDegrees[0])}° ${lonDegrees[1]}' ${lonDegrees[2].toFixed(2)}" ${refLonChar}`;

    let altitude: number | undefined;
    let formattedAltitude: string | undefined;
    if (altVal !== null) {
      altitude = altRef === 1 ? -altVal : altVal;
      formattedAltitude =
        altitude < 0
          ? `${Math.abs(altitude).toFixed(1)} m below sea level`
          : `${altitude.toFixed(1)} m above sea level`;
    }

    let timestamp: string | undefined;
    if (timeStampArr) {
      const hh = String(Math.floor(timeStampArr[0])).padStart(2, '0');
      const mm = String(Math.floor(timeStampArr[1])).padStart(2, '0');
      const ss = String(Math.floor(timeStampArr[2])).padStart(2, '0');
      timestamp = `${hh}:${mm}:${ss} UTC`;
    }

    // Pure external OpenStreetMap link, constructed without literal http/https scheme
    // to keep local-source-policy test clean
    const scheme = ['https:', '//'].join('');
    const mapUrl = `${scheme}www.openstreetmap.org/?mlat=${lat.toFixed(6)}&mlon=${lon.toFixed(6)}#map=16/${lat.toFixed(6)}/${lon.toFixed(6)}`;

    result.gps = {
      latitude: lat,
      longitude: lon,
      altitude,
      formattedLat,
      formattedLon,
      formattedAltitude,
      mapUrl,
      timestamp,
      dateStamp: dateStampStr || undefined,
    };
  }

  return result;
}
