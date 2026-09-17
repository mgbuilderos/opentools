/**
 * Tells the two kinds of password-protected PDF apart without decrypting.
 *
 * A PDF with only an owner password opens in every viewer, because its user
 * password is empty; the owner password only restricts what may be changed.
 * A PDF with a user password cannot be opened at all without it. Both are
 * encrypted, so neither can be filled here, but they need different advice.
 *
 * The check follows the Standard security handler (ISO 32000-2, 7.6.4):
 * compute the /U entry an empty user password would produce and compare it
 * with the one in the file. MD5 and RC4 are not in Web Crypto, so the small
 * versions below exist only for this comparison.
 */

export type StandardEncryption = {
  filter: string | undefined;
  /** /R, the revision of the Standard security handler. */
  revision: number;
  /** /Length in bits, when present. */
  lengthBits: number | undefined;
  owner: Uint8Array;
  user: Uint8Array;
  permissions: number;
  encryptMetadata: boolean;
  /** First element of the trailer /ID array. */
  firstId: Uint8Array;
};

export type EncryptionKind = 'owner-only' | 'user-password' | 'unknown';

const PASSWORD_PADDING = new Uint8Array([
  0x28, 0xbf, 0x4e, 0x5e, 0x4e, 0x75, 0x8a, 0x41, 0x64, 0x00, 0x4e, 0x56, 0xff,
  0xfa, 0x01, 0x08, 0x2e, 0x2e, 0x00, 0xb6, 0xd0, 0x68, 0x3e, 0x80, 0x2f, 0x0c,
  0xa9, 0xfe, 0x64, 0x53, 0x69, 0x7a,
]);

function concatBytes(...parts: Uint8Array[]) {
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function bytesEqual(a: Uint8Array, b: Uint8Array) {
  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
}

const MD5_SHIFTS = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5,
  9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11,
  16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15,
  21,
];
const MD5_CONSTANTS = Array.from(
  { length: 64 },
  (_, index) => Math.floor(Math.abs(Math.sin(index + 1)) * 2 ** 32) >>> 0,
);

/** MD5 (RFC 1321). Used only to verify an empty PDF password. */
export function md5(message: Uint8Array): Uint8Array {
  const bitLength = message.length * 8;
  const paddedLength = (((message.length + 8) >> 6) + 1) * 64;
  const padded = new Uint8Array(paddedLength);
  padded.set(message);
  padded[message.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(paddedLength - 8, bitLength >>> 0, true);
  view.setUint32(paddedLength - 4, Math.floor(bitLength / 2 ** 32), true);

  let a0 = 0x67452301;
  let b0 = 0xefcdab89;
  let c0 = 0x98badcfe;
  let d0 = 0x10325476;

  for (let chunk = 0; chunk < paddedLength; chunk += 64) {
    let a = a0;
    let b = b0;
    let c = c0;
    let d = d0;
    for (let index = 0; index < 64; index += 1) {
      let f: number;
      let g: number;
      if (index < 16) {
        f = (b & c) | (~b & d);
        g = index;
      } else if (index < 32) {
        f = (d & b) | (~d & c);
        g = (5 * index + 1) % 16;
      } else if (index < 48) {
        f = b ^ c ^ d;
        g = (3 * index + 5) % 16;
      } else {
        f = c ^ (b | ~d);
        g = (7 * index) % 16;
      }
      const rotated =
        (a +
          f +
          MD5_CONSTANTS[index]! +
          view.getUint32(chunk + g * 4, true)) >>>
        0;
      const shift = MD5_SHIFTS[index]!;
      a = d;
      d = c;
      c = b;
      b = (b + ((rotated << shift) | (rotated >>> (32 - shift)))) >>> 0;
    }
    a0 = (a0 + a) >>> 0;
    b0 = (b0 + b) >>> 0;
    c0 = (c0 + c) >>> 0;
    d0 = (d0 + d) >>> 0;
  }

  const digest = new Uint8Array(16);
  const out = new DataView(digest.buffer);
  out.setUint32(0, a0, true);
  out.setUint32(4, b0, true);
  out.setUint32(8, c0, true);
  out.setUint32(12, d0, true);
  return digest;
}

/** RC4. Encryption and decryption are the same operation. */
export function rc4(key: Uint8Array, data: Uint8Array): Uint8Array {
  const state = Uint8Array.from({ length: 256 }, (_, index) => index);
  let j = 0;
  for (let i = 0; i < 256; i += 1) {
    j = (j + state[i]! + key[i % key.length]!) & 0xff;
    [state[i], state[j]] = [state[j]!, state[i]!];
  }
  const out = new Uint8Array(data.length);
  let i = 0;
  j = 0;
  for (let index = 0; index < data.length; index += 1) {
    i = (i + 1) & 0xff;
    j = (j + state[i]!) & 0xff;
    [state[i], state[j]] = [state[j]!, state[i]!];
    out[index] = data[index]! ^ state[(state[i]! + state[j]!) & 0xff]!;
  }
  return out;
}

/** Algorithm 2: the file key for an empty password, revisions 2 to 4. */
function rc4FileKey(encryption: StandardEncryption) {
  const keyLength =
    encryption.revision === 2
      ? 5
      : Math.min(16, Math.max(5, (encryption.lengthBits ?? 40) / 8));
  const permissions = new Uint8Array(4);
  new DataView(permissions.buffer).setInt32(0, encryption.permissions, true);
  const parts = [
    PASSWORD_PADDING,
    encryption.owner.slice(0, 32),
    permissions,
    encryption.firstId,
  ];
  if (encryption.revision >= 4 && !encryption.encryptMetadata) {
    parts.push(new Uint8Array([0xff, 0xff, 0xff, 0xff]));
  }
  let key = md5(concatBytes(...parts));
  if (encryption.revision >= 3) {
    for (let round = 0; round < 50; round += 1) {
      key = md5(key.slice(0, keyLength));
    }
  }
  return key.slice(0, keyLength);
}

/** Algorithms 4 and 5: does the empty password produce this /U? */
function emptyPasswordOpensRc4(encryption: StandardEncryption) {
  const key = rc4FileKey(encryption);
  if (encryption.revision === 2) {
    return bytesEqual(rc4(key, PASSWORD_PADDING), encryption.user.slice(0, 32));
  }
  let value = rc4(key, md5(concatBytes(PASSWORD_PADDING, encryption.firstId)));
  for (let round = 1; round <= 19; round += 1) {
    value = rc4(
      key.map((byte) => byte ^ round),
      value,
    );
  }
  return bytesEqual(value.slice(0, 16), encryption.user.slice(0, 16));
}

async function digest(algorithm: string, data: Uint8Array) {
  return new Uint8Array(
    await crypto.subtle.digest(algorithm, data as Uint8Array<ArrayBuffer>),
  );
}

/** Algorithm 2.B: the revision 6 password hash, with an empty password. */
async function revision6Hash(salt: Uint8Array) {
  let k = await digest('SHA-256', salt);
  let e = new Uint8Array([0]);
  let round = 0;
  while (round < 64 || e[e.length - 1]! > round - 32) {
    const k1 = new Uint8Array(k.length * 64);
    for (let copy = 0; copy < 64; copy += 1) k1.set(k, copy * k.length);
    const aesKey = await crypto.subtle.importKey(
      'raw',
      k.slice(0, 16),
      { name: 'AES-CBC' },
      false,
      ['encrypt'],
    );
    // Web Crypto always pads; k1 is a whole number of blocks, so the padding
    // block comes last and dropping it leaves the unpadded ciphertext.
    const encrypted = new Uint8Array(
      await crypto.subtle.encrypt(
        { name: 'AES-CBC', iv: k.slice(16, 32) },
        aesKey,
        k1,
      ),
    );
    e = encrypted.slice(0, k1.length);
    const remainder = e.slice(0, 16).reduce((sum, byte) => sum + byte, 0) % 3;
    k = await digest(
      remainder === 0 ? 'SHA-256' : remainder === 1 ? 'SHA-384' : 'SHA-512',
      e,
    );
    round += 1;
  }
  return k.slice(0, 32);
}

async function emptyPasswordOpensAes256(encryption: StandardEncryption) {
  if (encryption.user.length < 48) return undefined;
  const hash = encryption.user.slice(0, 32);
  const validationSalt = encryption.user.slice(32, 40);
  const computed =
    encryption.revision === 5
      ? await digest('SHA-256', validationSalt)
      : await revision6Hash(validationSalt);
  return bytesEqual(computed, hash);
}

/**
 * Works out whether an encrypted PDF opens without a password. Anything this
 * cannot read is reported as `unknown`, never guessed.
 */
export async function classifyEncryption(
  encryption: StandardEncryption,
): Promise<EncryptionKind> {
  if (encryption.filter !== 'Standard') return 'unknown';
  try {
    let opens: boolean | undefined;
    if (encryption.revision >= 2 && encryption.revision <= 4) {
      if (encryption.owner.length < 32 || encryption.user.length < 16) {
        return 'unknown';
      }
      opens = emptyPasswordOpensRc4(encryption);
    } else if (encryption.revision === 5 || encryption.revision === 6) {
      opens = await emptyPasswordOpensAes256(encryption);
    }
    if (opens === undefined) return 'unknown';
    return opens ? 'owner-only' : 'user-password';
  } catch {
    return 'unknown';
  }
}
