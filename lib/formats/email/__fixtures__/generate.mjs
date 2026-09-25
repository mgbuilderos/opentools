import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
await mkdir(root, { recursive: true });

const eml = `From: sender@example.invalid
To: recipient@example.invalid
Subject: =?UTF-8?Q?Quarterly_=E2=9C=93_report?=
MIME-Version: 1.0
Content-Type: multipart/mixed; boundary="outer-boundary"

--outer-boundary
Content-Type: multipart/alternative; boundary="body-boundary"

--body-boundary
Content-Type: text/plain; charset=UTF-8
Content-Transfer-Encoding: quoted-printable

Plain body with a check mark: =E2=9C=93
--body-boundary
Content-Type: text/html; charset=UTF-8
Content-Transfer-Encoding: 8bit

<p>HTML body ✓</p><img src="https://remote.invalid/pixel.png">
--body-boundary--
--outer-boundary
Content-Type: text/csv; name="report.csv"
Content-Disposition: attachment; filename="report.csv"
Content-Transfer-Encoding: base64

bmFtZSx2YWx1ZQphbHBoYSwxCg==
--outer-boundary
Content-Type: text/plain; name="notes.txt"
Content-Disposition: attachment; filename="notes.txt"
Content-Transfer-Encoding: quoted-printable

Generated=20attachment=2E
--outer-boundary--
`;

const mbox = `From first@example.invalid Sat Sep 26 00:00:00 2026
From: first@example.invalid
To: archive@example.invalid
Subject: First
Content-Type: text/plain; charset=UTF-8

Line one
>From this body line was escaped
From second@example.invalid Sat Sep 26 00:01:00 2026
From: second@example.invalid
To: archive@example.invalid
Subject: Second
Content-Type: text/plain; charset=UTF-8

Second body
From third@example.invalid Sat Sep 26 00:02:00 2026
From: third@example.invalid
To: archive@example.invalid
Subject: Third
Content-Type: text/plain; charset=UTF-8

Third body
`;

const FREE = 0xffffffff;
const END = 0xfffffffe;
const FAT = 0xfffffffd;
const SECTOR = 512;
const MINI = 64;

function utf16(value) {
  return Buffer.from(`${value}\0`, 'utf16le');
}

function ansi(value) {
  return Buffer.from(`${value}\0`, 'latin1');
}

function directoryEntry({
  name,
  type,
  start = FREE,
  size = 0,
  left = FREE,
  right = FREE,
  child = FREE,
}) {
  const entry = Buffer.alloc(128);
  const encodedName = Buffer.from(`${name}\0`, 'utf16le');
  encodedName.copy(entry, 0, 0, Math.min(encodedName.length, 64));
  entry.writeUInt16LE(Math.min(encodedName.length, 64), 64);
  entry[66] = type;
  entry[67] = 1;
  entry.writeUInt32LE(left, 68);
  entry.writeUInt32LE(right, 72);
  entry.writeUInt32LE(child, 76);
  entry.writeUInt32LE(start, 116);
  entry.writeBigUInt64LE(BigInt(size), 120);
  return entry;
}

function makeMsg({ unicode }) {
  const streams = [];
  const miniFat = [];
  const allocate = (bytes) => {
    const start = miniFat.length;
    const count = Math.max(1, Math.ceil(bytes.length / MINI));
    for (let index = 0; index < count; index += 1) {
      const sector = Buffer.alloc(MINI);
      bytes.copy(sector, 0, index * MINI, (index + 1) * MINI);
      streams.push(sector);
      miniFat.push(index === count - 1 ? END : start + index + 1);
    }
    return { start, size: bytes.length };
  };

  const subject = allocate(
    unicode ? utf16('Synthetic résumé ✓') : ansi('Synthetic ANSI subject'),
  );
  const body = allocate(
    unicode ? utf16('Synthetic MSG body.') : ansi('Synthetic ANSI body.'),
  );
  const html = allocate(Buffer.from('<p>MSG HTML body</p>', 'utf8'));
  const filename = allocate(utf16('note.txt'));
  const mime = allocate(utf16('text/plain'));
  const attachment = allocate(Buffer.from('hello\n', 'utf8'));
  const miniStream = Buffer.concat(streams);

  const entries = [
    directoryEntry({
      name: 'Root Entry',
      type: 5,
      start: 3,
      size: miniStream.length,
      child: 1,
    }),
    directoryEntry({
      name: unicode ? '__substg1.0_0037001F' : '__substg1.0_0037001E',
      type: 2,
      start: subject.start,
      size: subject.size,
      right: 2,
    }),
    directoryEntry({
      name: unicode ? '__substg1.0_1000001F' : '__substg1.0_1000001E',
      type: 2,
      start: body.start,
      size: body.size,
      right: 3,
    }),
    directoryEntry({
      name: '__substg1.0_10130102',
      type: 2,
      start: html.start,
      size: html.size,
      right: 4,
    }),
    directoryEntry({
      name: '__attach_version1.0_#00000000',
      type: 1,
      child: 5,
    }),
    directoryEntry({
      name: '__substg1.0_3707001F',
      type: 2,
      start: filename.start,
      size: filename.size,
      right: 6,
    }),
    directoryEntry({
      name: '__substg1.0_370E001F',
      type: 2,
      start: mime.start,
      size: mime.size,
      right: 7,
    }),
    directoryEntry({
      name: '__substg1.0_37010102',
      type: 2,
      start: attachment.start,
      size: attachment.size,
    }),
  ];

  const header = Buffer.alloc(SECTOR);
  Buffer.from('d0cf11e0a1b11ae1', 'hex').copy(header, 0);
  header.writeUInt16LE(0x003e, 24);
  header.writeUInt16LE(3, 26);
  header.writeUInt16LE(0xfffe, 28);
  header.writeUInt16LE(9, 30);
  header.writeUInt16LE(6, 32);
  header.writeUInt32LE(0, 40);
  header.writeUInt32LE(1, 44);
  header.writeUInt32LE(1, 48);
  header.writeUInt32LE(4096, 56);
  header.writeUInt32LE(4, 60);
  header.writeUInt32LE(1, 64);
  header.writeUInt32LE(END, 68);
  header.writeUInt32LE(0, 72);
  for (let index = 0; index < 109; index += 1) {
    header.writeUInt32LE(index === 0 ? 0 : FREE, 76 + index * 4);
  }

  const fat = Buffer.alloc(SECTOR, 0xff);
  [FAT, 2, END, END, END].forEach((value, index) =>
    fat.writeUInt32LE(value, index * 4),
  );
  const directory = Buffer.concat(entries);
  const miniSector = Buffer.alloc(SECTOR);
  miniStream.copy(miniSector);
  const miniFatSector = Buffer.alloc(SECTOR, 0xff);
  miniFat.forEach((value, index) =>
    miniFatSector.writeUInt32LE(value, index * 4),
  );
  return Buffer.concat([
    header,
    fat,
    directory.subarray(0, SECTOR),
    directory.subarray(SECTOR, SECTOR * 2),
    miniSector,
    miniFatSector,
  ]);
}

const unicodeMsg = makeMsg({ unicode: true });
const declaredLength = Buffer.from(unicodeMsg);
declaredLength.writeBigUInt64LE(BigInt(8192), SECTOR + SECTOR + 120);

await writeFile(resolve(root, 'multipart.eml'), eml, 'utf8');
await writeFile(resolve(root, 'three-message.mbox'), mbox, 'utf8');
await writeFile(resolve(root, 'unicode.msg'), unicodeMsg);
await writeFile(resolve(root, 'ansi.msg'), makeMsg({ unicode: false }));
await writeFile(
  resolve(root, 'truncated.eml'),
  'From: sender@example.invalid\nContent-Type: multipart/mixed; boundary="cut"\n\n--cut\nContent-Type: text/plain\n\nincomplete\n',
  'utf8',
);
await writeFile(
  resolve(root, 'wrong-magic.bin'),
  'not an email container\n',
  'utf8',
);
await writeFile(resolve(root, 'declared-length.msg'), declaredLength);
