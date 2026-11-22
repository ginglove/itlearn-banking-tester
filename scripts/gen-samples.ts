import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { PERSONAS } from '../lib/modules/personas';

const SAMPLES_DIR = path.join(process.cwd(), 'public', 'samples');
const SIZE_DIR = path.join(SAMPLES_DIR, 'size');

async function ensureDirs() {
  if (!fs.existsSync(SAMPLES_DIR)) fs.mkdirSync(SAMPLES_DIR, { recursive: true });
  if (!fs.existsSync(SIZE_DIR)) fs.mkdirSync(SIZE_DIR, { recursive: true });
}

async function generateCard(
  personaKey: string,
  side: 'front' | 'back',
  pData: (typeof PERSONAS)[string]
) {
  const width = 640;
  const height = 400;

  const svgFront = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="cardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#1e293b"/>
          <stop offset="100%" stop-color="#0f172a"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" rx="16" fill="url(#cardGrad)"/>
      <rect x="12" y="12" width="${width - 24}" height="${height - 24}" rx="12" fill="none" stroke="#334155" stroke-width="2"/>
      
      <!-- Header -->
      <text x="32" y="44" font-family="Arial" font-size="14" font-weight="bold" fill="#94a3b8" letter-spacing="1">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</text>
      <text x="32" y="64" font-family="Arial" font-size="12" fill="#64748b">CĂN CƯỚC CÔNG DÂN GẮN CHIP (MẶT TRƯỚC)</text>
      
      <!-- Watermark -->
      <g transform="rotate(-25 320 200)">
        <text x="70" y="220" font-family="Arial" font-size="34" font-weight="900" fill="rgba(239, 68, 68, 0.35)" letter-spacing="4">MẪU – KHÔNG CÓ GIÁ TRỊ</text>
      </g>
      
      <!-- Avatar box -->
      <rect x="36" y="90" width="130" height="170" rx="8" fill="#1e293b" stroke="#475569" stroke-width="2"/>
      <circle cx="101" cy="150" r="35" fill="#334155"/>
      <path d="M 66 230 Q 101 190 136 230 Z" fill="#334155"/>
      <text x="101" y="250" font-family="Arial" font-size="11" fill="#94a3b8" text-anchor="middle">${pData.id}</text>
      
      <!-- Identity Info -->
      <text x="190" y="115" font-family="Arial" font-size="12" fill="#94a3b8">Số / No.:</text>
      <text x="190" y="140" font-family="Arial" font-size="20" font-weight="bold" fill="#38bdf8" letter-spacing="2">${pData.idNumber}</text>
      
      <text x="190" y="170" font-family="Arial" font-size="12" fill="#94a3b8">Họ và tên / Full name:</text>
      <text x="190" y="195" font-family="Arial" font-size="18" font-weight="bold" fill="#f8fafc">${pData.fullName}</text>
      
      <text x="190" y="225" font-family="Arial" font-size="12" fill="#94a3b8">Ngày sinh / Date of birth:</text>
      <text x="190" y="245" font-family="Arial" font-size="15" font-weight="bold" fill="#cbd5e1">${pData.dob}</text>
      
      <text x="190" y="275" font-family="Arial" font-size="12" fill="#94a3b8">Có giá trị đến / Date of expiry:</text>
      <text x="190" y="295" font-family="Arial" font-size="15" font-weight="bold" fill="#f43f5e">${pData.expiryDate}</text>
      
      <text x="36" y="340" font-family="Arial" font-size="12" fill="#94a3b8">Nơi thường trú / Place of residence:</text>
      <text x="36" y="365" font-family="Arial" font-size="13" fill="#e2e8f0">${pData.address}</text>
    </svg>
  `;

  const svgBack = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="cardGradBack" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#1e293b"/>
          <stop offset="100%" stop-color="#0f172a"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" rx="16" fill="url(#cardGradBack)"/>
      <rect x="12" y="12" width="${width - 24}" height="${height - 24}" rx="12" fill="none" stroke="#334155" stroke-width="2"/>
      
      <!-- Watermark -->
      <g transform="rotate(-25 320 200)">
        <text x="70" y="220" font-family="Arial" font-size="34" font-weight="900" fill="rgba(239, 68, 68, 0.35)" letter-spacing="4">MẪU – KHÔNG CÓ GIÁ TRỊ</text>
      </g>
      
      <!-- Chip Simulation -->
      <rect x="40" y="40" width="80" height="60" rx="6" fill="#ca8a04" stroke="#eab308" stroke-width="2"/>
      <line x1="40" y1="70" x2="120" y2="70" stroke="#a16207" stroke-width="2"/>
      <line x1="80" y1="40" x2="80" y2="100" stroke="#a16207" stroke-width="2"/>
      
      <text x="140" y="70" font-family="Arial" font-size="14" font-weight="bold" fill="#94a3b8">ĐẶC ĐIỂM NHẬN DẠNG &amp; VÂN TAY</text>
      <text x="140" y="90" font-family="Arial" font-size="12" fill="#64748b">CĂN CƯỚC CÔNG DÂN GẮN CHIP (MẶT SAU)</text>
      
      <!-- MRZ Lines -->
      <rect x="30" y="280" width="${width - 60}" height="80" rx="6" fill="#020617"/>
      <text x="50" y="315" font-family="Courier New, monospace" font-size="18" font-weight="bold" fill="#38bdf8" letter-spacing="3">IDVNM001098001234&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;</text>
      <text x="50" y="345" font-family="Courier New, monospace" font-size="18" font-weight="bold" fill="#38bdf8" letter-spacing="3">9805156M3805152VNM&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;8</text>
    </svg>
  `;

  const filename = `${personaKey}_${side}.jpg`;
  const filePath = path.join(SAMPLES_DIR, filename);
  const svg = side === 'front' ? svgFront : svgBack;

  const buf = await sharp(Buffer.from(svg))
    .jpeg({ quality: 95 })
    .toBuffer();

  // Ensure persona cards are within 100KB - 5MB range (pad to 200 KB)
  const targetSize = 200 * 1024;
  if (buf.length < targetSize) {
    const padding = Buffer.alloc(targetSize - buf.length, 0x20);
    fs.writeFileSync(filePath, Buffer.concat([buf, padding]));
  } else {
    fs.writeFileSync(filePath, buf);
  }
}

async function generateSelfie(name: string, title: string, subtitle: string, color: string) {
  const width = 480;
  const height = 480;

  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#0f172a"/>
      <!-- Face circle guide -->
      <circle cx="240" cy="220" r="140" fill="none" stroke="${color}" stroke-width="4" stroke-dasharray="8 8"/>
      <circle cx="240" cy="180" r="60" fill="#1e293b"/>
      <path d="M 160 300 Q 240 230 320 300 Z" fill="#1e293b"/>
      
      <!-- Title -->
      <text x="240" y="390" font-family="Arial" font-size="20" font-weight="bold" fill="#f8fafc" text-anchor="middle">${title}</text>
      <text x="240" y="420" font-family="Arial" font-size="14" fill="#94a3b8" text-anchor="middle">${subtitle}</text>
      <text x="240" y="450" font-family="Arial" font-size="12" fill="#ef4444" font-weight="bold" text-anchor="middle">ẢNH THỰC NGHIỆM - KHÔNG CÓ THẬT</text>
    </svg>
  `;

  const filePath = path.join(SAMPLES_DIR, `${name}.jpg`);
  const buf = await sharp(Buffer.from(svg))
    .jpeg({ quality: 90 })
    .toBuffer();

  const targetSize = 150 * 1024;
  if (buf.length < targetSize) {
    const padding = Buffer.alloc(targetSize - buf.length, 0x20);
    fs.writeFileSync(filePath, Buffer.concat([buf, padding]));
  } else {
    fs.writeFileSync(filePath, buf);
  }
}

async function createPaddedFile(filepath: string, exactTargetBytes: number) {
  // Generate base image
  const baseImg = await sharp({
    create: {
      width: 400,
      height: 300,
      channels: 3,
      background: { r: 30, g: 41, b: 59 },
    },
  })
    .jpeg({ quality: 80 })
    .toBuffer();

  if (baseImg.length > exactTargetBytes) {
    // If base image is larger than target, write sliced buffer
    fs.writeFileSync(filepath, baseImg.subarray(0, exactTargetBytes));
    return;
  }

  // Pad remaining bytes
  const diff = exactTargetBytes - baseImg.length;
  const padding = Buffer.alloc(diff, 0x20); // Pad with spaces or nulls
  const finalBuf = Buffer.concat([baseImg, padding]);
  fs.writeFileSync(filepath, finalBuf);
}

async function main() {
  console.log('Generating sample assets...');
  await ensureDirs();

  // 1. Generate Personas P01 - P09
  for (const [key, pData] of Object.entries(PERSONAS)) {
    await generateCard(key, 'front', pData);
    await generateCard(key, 'back', pData);
    console.log(`✓ Generated ${key} front/back cards`);
  }

  // 2. Generate Selfie Samples
  await generateSelfie('S_score_95', 'Mẫu 1', 'Điểm khớp: 95% • Liveness: Đạt', '#10b981');
  await generateSelfie('S_score_85', 'Mẫu 2', 'Điểm khớp: 85% • Liveness: Đạt', '#10b981');
  await generateSelfie('S_score_84_9', 'Mẫu 3', 'Điểm khớp: 84.9% • Liveness: Đạt', '#f59e0b');
  await generateSelfie('S_score_80', 'Mẫu 4', 'Điểm khớp: 80% • Liveness: Đạt', '#f59e0b');
  await generateSelfie('S_score_79_9', 'Mẫu 5', 'Điểm khớp: 79.9% • Liveness: Đạt', '#ef4444');
  await generateSelfie('S_liveness_fail', 'Mẫu 6', 'Điểm khớp: 90% • Liveness: Không đạt', '#ef4444');
  console.log('✓ Generated 6 selfie samples');

  // 3. Generate Size Samples with exact byte counts
  await createPaddedFile(path.join(SIZE_DIR, '99KB.jpg'), 99 * 1024);
  await createPaddedFile(path.join(SIZE_DIR, '100KB.jpg'), 100 * 1024);
  await createPaddedFile(path.join(SIZE_DIR, '101KB.jpg'), 101 * 1024);
  await createPaddedFile(path.join(SIZE_DIR, '5MB.jpg'), 5 * 1024 * 1024); // 5,242,880 bytes
  await createPaddedFile(path.join(SIZE_DIR, '5_1MB.jpg'), Math.floor(5.1 * 1024 * 1024)); // 5,347,737 bytes
  console.log('✓ Generated size boundary files (99KB, 100KB, 101KB, 5MB, 5_1MB)');

  console.log('All sample assets generated successfully!');
}

main().catch(console.error);
