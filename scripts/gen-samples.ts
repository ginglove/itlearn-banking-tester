import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import https from 'https';
import { PERSONAS } from '../lib/modules/personas';

const SAMPLES_DIR = path.join(process.cwd(), 'public', 'samples');
const SIZE_DIR = path.join(SAMPLES_DIR, 'size');

async function ensureDirs() {
  if (!fs.existsSync(SAMPLES_DIR)) fs.mkdirSync(SAMPLES_DIR, { recursive: true });
  if (!fs.existsSync(SIZE_DIR)) fs.mkdirSync(SIZE_DIR, { recursive: true });
}

// Download image from URL as Buffer
function downloadImage(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return downloadImage(res.headers.location).then(resolve).catch(reject);
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`Failed to download ${url}: HTTP ${res.statusCode}`));
        }
        const chunks: Buffer[] = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      })
      .on('error', reject);
  });
}

// Map personas to curated portrait photography
const PERSONA_PHOTO_MAP: Record<string, { photoId: string; sex: 'Nam' | 'Nữ' }> = {
  P01: { photoId: 'photo-1507003211169-0a1dd7228f2d', sex: 'Nam' }, // Nguyen Van An (28, Male)
  P02: { photoId: 'photo-1534528741775-53994a69daeb', sex: 'Nữ' }, // Tran Thi Binh (26, Female)
  P03: { photoId: 'photo-1539571696357-5a69c17a67c6', sex: 'Nam' }, // Le Minh Cuong (18, Male)
  P04: { photoId: 'photo-1524504388940-b1c1722653e1', sex: 'Nữ' }, // Pham Thu Dung (18, Female)
  P05: { photoId: 'photo-1519085360753-af0119f7cbe7', sex: 'Nam' }, // Vo Hoang Em (16, Teen)
  P06: { photoId: 'photo-1492562080023-ab3db95bfbce', sex: 'Nam' }, // Hoang Van Giang (36, Male)
  P07: { photoId: 'photo-1573496359142-b8d87734a5a2', sex: 'Nữ' }, // Dang Thi Hanh (31, Female)
  P08: { photoId: 'photo-1508214751196-bcfd4ca60f91', sex: 'Nam' }, // Bui Van Khoa (71, Senior Male)
  P09: { photoId: 'photo-1531746020798-e6953c6e8e04', sex: 'Nữ' }, // Ngo Thi Lan (27, Female)
};

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatDisplayDateVN(isoDate: string): string {
  if (isoDate === 'KHONG THOI HAN') return 'Không thời hạn';
  const parts = isoDate.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return isoDate;
}

function formatIdSpaced(idNum: string): string {
  if (idNum.length === 12) {
    return `${idNum.slice(0, 3)} ${idNum.slice(3, 6)} ${idNum.slice(6)}`;
  }
  return idNum;
}

function getOriginFromAddress(address: string): string {
  const parts = address.split(',');
  return parts[parts.length - 1]?.trim() || 'Việt Nam';
}

/**
 * Generate Authentic Vietnamese CCCD (Căn cước công dân gắn chip)
 */
async function generateCard(
  personaKey: string,
  side: 'front' | 'back',
  pData: (typeof PERSONAS)[string]
) {
  const width = 856;
  const height = 540;
  const mapping = PERSONA_PHOTO_MAP[personaKey] || { photoId: 'photo-1507003211169-0a1dd7228f2d', sex: 'Nam' };

  if (side === 'front') {
    // 1. Fetch portrait photo
    const portraitUrl = `https://images.unsplash.com/${mapping.photoId}?auto=format&fit=crop&w=170&h=225&q=85`;
    let portraitBuf: Buffer;
    try {
      portraitBuf = await downloadImage(portraitUrl);
      // Ensure exact crop size
      portraitBuf = await sharp(portraitBuf).resize(170, 225, { fit: 'cover' }).jpeg({ quality: 90 }).toBuffer();
    } catch {
      // Fallback portrait
      portraitBuf = await sharp({
        create: { width: 170, height: 225, channels: 3, background: { r: 226, g: 232, b: 240 } },
      }).jpeg().toBuffer();
    }

    // 2. Front SVG Template with authentic Vietnam CCCD design
    const svgFront = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#e0f2f1"/>
            <stop offset="35%" stop-color="#fef9c3"/>
            <stop offset="70%" stop-color="#e0f7fa"/>
            <stop offset="100%" stop-color="#d1fae5"/>
          </linearGradient>
          <pattern id="guilloche" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 0 20 Q 10 0 20 20 T 40 20" fill="none" stroke="#99f6e4" stroke-width="0.8" opacity="0.45"/>
            <path d="M 0 20 Q 10 40 20 20 T 40 20" fill="none" stroke="#fef08a" stroke-width="0.8" opacity="0.35"/>
            <circle cx="20" cy="20" r="14" fill="none" stroke="#ccfbf1" stroke-width="0.5" opacity="0.4"/>
          </pattern>
        </defs>

        <!-- Base Background with Guilloche Security Pattern -->
        <rect width="100%" height="100%" rx="24" fill="url(#bgGrad)"/>
        <rect width="100%" height="100%" rx="24" fill="url(#guilloche)"/>
        <rect x="10" y="10" width="${width - 20}" height="${height - 20}" rx="20" fill="none" stroke="#0d9488" stroke-width="2.5" opacity="0.7"/>
        <rect x="15" y="15" width="${width - 30}" height="${height - 30}" rx="16" fill="none" stroke="#ca8a04" stroke-width="1" opacity="0.5"/>

        <!-- Vietnam National Emblem (Quốc huy Việt Nam) -->
        <g transform="translate(42, 22)">
          <circle cx="36" cy="36" r="32" fill="#da251d" stroke="#eab308" stroke-width="2.5"/>
          <polygon points="36,18 40.5,29.5 52,29.5 42.5,37 46,48.5 36,41.5 26,48.5 29.5,37 20,29.5 31.5,29.5" fill="#ffd700"/>
          <path d="M 12 46 Q 6 24 22 12 Q 36 2 50 12 Q 66 24 60 46" fill="none" stroke="#f59e0b" stroke-width="2.2" stroke-dasharray="3,2"/>
          <rect x="25" y="52" width="22" height="7" rx="1.5" fill="#ca8a04"/>
          <circle cx="36" cy="55.5" r="2.5" fill="#da251d"/>
          <path d="M 14 58 Q 36 63 58 58 L 56 64 Q 36 68 16 64 Z" fill="#b91c1c" stroke="#f59e0b" stroke-width="0.8"/>
        </g>

        <!-- National Header -->
        <text x="130" y="44" font-family="-apple-system, BlinkMacSystemFont, Arial, sans-serif" font-size="14" font-weight="900" fill="#0f2b48" letter-spacing="0.4">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</text>
        <text x="130" y="63" font-family="-apple-system, BlinkMacSystemFont, Arial, sans-serif" font-size="12" font-weight="700" fill="#0f2b48">Độc lập - Tự do - Hạnh phúc</text>
        <line x1="130" y1="67" x2="295" y2="67" stroke="#0f2b48" stroke-width="1.2"/>

        <!-- Title CĂN CƯỚC CÔNG DÂN -->
        <text x="500" y="96" font-family="-apple-system, BlinkMacSystemFont, Arial, sans-serif" font-size="22" font-weight="900" fill="#b91c1c" letter-spacing="1.5" text-anchor="middle">CĂN CƯỚC CÔNG DÂN</text>
        <text x="500" y="114" font-family="-apple-system, BlinkMacSystemFont, Arial, sans-serif" font-size="12" font-weight="600" fill="#475569" font-style="italic" text-anchor="middle">Citizen Identity Card</text>

        <!-- Contactless Chip Wave Icon -->
        <g transform="translate(770, 30)">
          <path d="M 0 10 A 14 14 0 0 1 14 24" fill="none" stroke="#0284c7" stroke-width="2.5" stroke-linecap="round"/>
          <path d="M 6 10 A 21 21 0 0 1 21 25" fill="none" stroke="#0284c7" stroke-width="2.5" stroke-linecap="round"/>
          <path d="M 12 10 A 28 28 0 0 1 28 26" fill="none" stroke="#0284c7" stroke-width="2.5" stroke-linecap="round"/>
          <path d="M 18 10 A 35 35 0 0 1 35 27" fill="none" stroke="#0284c7" stroke-width="2.5" stroke-linecap="round"/>
        </g>

        <!-- Photo frame border -->
        <rect x="43" y="143" width="174" height="229" rx="6" fill="none" stroke="#0d9488" stroke-width="2"/>

        <!-- Number / Số -->
        <text x="245" y="156" font-family="Arial, sans-serif" font-size="12" font-weight="700" fill="#334155">Số / No.:</text>
        <text x="245" y="184" font-family="Arial, sans-serif" font-size="25" font-weight="900" fill="#dc2626" letter-spacing="2.5">${formatIdSpaced(pData.idNumber)}</text>

        <!-- Họ và tên -->
        <text x="245" y="214" font-family="Arial, sans-serif" font-size="11" font-weight="700" fill="#475569">Họ và tên / Full name:</text>
        <text x="245" y="238" font-family="Arial, sans-serif" font-size="19" font-weight="900" fill="#0f172a" letter-spacing="0.5">${pData.fullName}</text>

        <!-- Ngày sinh, Giới tính, Quốc tịch -->
        <text x="245" y="268" font-family="Arial, sans-serif" font-size="11" font-weight="700" fill="#475569">Ngày sinh / Date of birth:</text>
        <text x="245" y="288" font-family="Arial, sans-serif" font-size="14" font-weight="800" fill="#0f172a">${formatDisplayDateVN(pData.dob)}</text>

        <text x="450" y="268" font-family="Arial, sans-serif" font-size="11" font-weight="700" fill="#475569">Giới tính / Sex:</text>
        <text x="450" y="288" font-family="Arial, sans-serif" font-size="14" font-weight="800" fill="#0f172a">${mapping.sex}</text>

        <text x="580" y="268" font-family="Arial, sans-serif" font-size="11" font-weight="700" fill="#475569">Quốc tịch / Nationality:</text>
        <text x="580" y="288" font-family="Arial, sans-serif" font-size="14" font-weight="800" fill="#0f172a">Việt Nam</text>

        <!-- Quê quán -->
        <text x="245" y="320" font-family="Arial, sans-serif" font-size="11" font-weight="700" fill="#475569">Quê quán / Place of origin:</text>
        <text x="245" y="340" font-family="Arial, sans-serif" font-size="13" font-weight="800" fill="#0f172a">${getOriginFromAddress(pData.address)}</text>

        <!-- Nơi thường trú -->
        <text x="245" y="372" font-family="Arial, sans-serif" font-size="11" font-weight="700" fill="#475569">Nơi thường trú / Place of residence:</text>
        <text x="245" y="394" font-family="Arial, sans-serif" font-size="13" font-weight="800" fill="#0f172a">${pData.address}</text>

        <!-- Có giá trị đến -->
        <text x="45" y="405" font-family="Arial, sans-serif" font-size="11" font-weight="700" fill="#475569">Có giá trị đến / Date of expiry:</text>
        <text x="45" y="425" font-family="Arial, sans-serif" font-size="14" font-weight="900" fill="#b91c1c">${formatDisplayDateVN(pData.expiryDate)}</text>

        <!-- Watermark for test environment -->
        <g transform="rotate(-18 428 270)">
          <rect x="180" y="246" width="510" height="42" rx="6" fill="rgba(239, 68, 68, 0.12)"/>
          <text x="435" y="275" font-family="Arial, sans-serif" font-size="22" font-weight="900" fill="rgba(220, 38, 38, 0.45)" letter-spacing="3" text-anchor="middle">MẪU THỬ NGHIỆM - TEST SAMPLE</text>
        </g>
      </svg>
    `;

    const svgBuf = await sharp(Buffer.from(svgFront)).png().toBuffer();

    // Composite front: Base card SVG + Portrait photo overlay
    const finalBuf = await sharp(svgBuf)
      .composite([{ input: portraitBuf, top: 145, left: 45 }])
      .jpeg({ quality: 92 })
      .toBuffer();

    const filename = `${personaKey}_front.jpg`;
    const filePath = path.join(SAMPLES_DIR, filename);

    // Pad to 200 KB to satisfy boundary tests
    const targetSize = 200 * 1024;
    if (finalBuf.length < targetSize) {
      const padding = Buffer.alloc(targetSize - finalBuf.length, 0x20);
      fs.writeFileSync(filePath, Buffer.concat([finalBuf, padding]));
    } else {
      fs.writeFileSync(filePath, finalBuf);
    }
  } else {
    // BACK OF CARD (MẶT SAU CCCD GẮN CHIP)
    const mrzLine1 = `IDVNM${pData.idNumber}<<<<<<<<<<<<<<<`;
    const dobShort = pData.dob.replace(/-/g, '').slice(2);
    const expShort = pData.expiryDate === 'KHONG THOI HAN' ? '991231' : pData.expiryDate.replace(/-/g, '').slice(2);
    const sexChar = mapping.sex === 'Nam' ? 'M' : 'F';
    const mrzLine2 = `${dobShort}4${sexChar}${expShort}8VNM<<<<<<<<<<<<<6`;
    const nameClean = pData.fullName.replace(/\s+/g, '<');
    const mrzLine3 = `${nameClean}<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<`.slice(0, 30);

    const svgBack = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bgGradBack" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#e0f2f1"/>
            <stop offset="40%" stop-color="#fef9c3"/>
            <stop offset="70%" stop-color="#e0f7fa"/>
            <stop offset="100%" stop-color="#d1fae5"/>
          </linearGradient>
          <pattern id="guillocheBack" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 0 20 Q 10 0 20 20 T 40 20" fill="none" stroke="#99f6e4" stroke-width="0.8" opacity="0.45"/>
            <path d="M 0 20 Q 10 40 20 20 T 40 20" fill="none" stroke="#fef08a" stroke-width="0.8" opacity="0.35"/>
          </pattern>
          <linearGradient id="goldChip" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#fef08a"/>
            <stop offset="25%" stop-color="#eab308"/>
            <stop offset="60%" stop-color="#ca8a04"/>
            <stop offset="100%" stop-color="#a16207"/>
          </linearGradient>
        </defs>

        <rect width="100%" height="100%" rx="24" fill="url(#bgGradBack)"/>
        <rect width="100%" height="100%" rx="24" fill="url(#guillocheBack)"/>
        <rect x="10" y="10" width="${width - 20}" height="${height - 20}" rx="20" fill="none" stroke="#0d9488" stroke-width="2.5" opacity="0.7"/>

        <!-- Smart Card Gold Microchip (ISO 7816) -->
        <g transform="translate(50, 45)">
          <rect width="115" height="85" rx="10" fill="url(#goldChip)" stroke="#854d0e" stroke-width="1.8"/>
          <!-- Circuit division channels -->
          <line x1="0" y1="28" x2="115" y2="28" stroke="#713f12" stroke-width="1.5"/>
          <line x1="0" y1="57" x2="115" y2="57" stroke="#713f12" stroke-width="1.5"/>
          <line x1="38" y1="0" x2="38" y2="85" stroke="#713f12" stroke-width="1.5"/>
          <line x1="77" y1="0" x2="77" y2="85" stroke="#713f12" stroke-width="1.5"/>
          <rect x="42" y="32" width="31" height="21" rx="4" fill="#ca8a04" stroke="#713f12" stroke-width="1"/>
        </g>

        <!-- Identification & Characteristics -->
        <text x="185" y="65" font-family="Arial, sans-serif" font-size="13" font-weight="900" fill="#0f2b48">ĐẶC ĐIỂM NHẬN DẠNG / PERSONAL IDENTIFICATION</text>
        <text x="185" y="86" font-family="Arial, sans-serif" font-size="12" font-weight="700" fill="#334155">Nốt ruồi C.1cm sau đuôi mắt trái / Mole 1cm behind left eye corner</text>

        <!-- QR Code Simulation -->
        <g transform="translate(710, 40)">
          <rect width="95" height="95" rx="6" fill="#ffffff" stroke="#0f172a" stroke-width="1.5"/>
          <rect x="10" y="10" width="22" height="22" fill="#0f172a"/>
          <rect x="14" y="14" width="14" height="14" fill="#ffffff"/>
          <rect x="17" y="17" width="8" height="8" fill="#0f172a"/>

          <rect x="63" y="10" width="22" height="22" fill="#0f172a"/>
          <rect x="67" y="14" width="14" height="14" fill="#ffffff"/>
          <rect x="70" y="17" width="8" height="8" fill="#0f172a"/>

          <rect x="10" y="63" width="22" height="22" fill="#0f172a"/>
          <rect x="14" y="67" width="14" height="14" fill="#ffffff"/>
          <rect x="17" y="70" width="8" height="8" fill="#0f172a"/>
          <rect x="40" y="40" width="15" height="15" fill="#0f172a"/>
        </g>

        <!-- Date & Issuing Authority -->
        <text x="185" y="130" font-family="Arial, sans-serif" font-size="11" font-weight="700" fill="#475569">Ngày, tháng, năm / Date: 15/05/2021</text>
        <text x="185" y="152" font-family="Arial, sans-serif" font-size="13" font-weight="900" fill="#0f2b48">CỤC TRƯỞNG CỤC CẢNH SÁT QUẢN LÝ HÀNH CHÍNH VỀ TRẬT TỰ XÃ HỘI</text>
        <text x="185" y="170" font-family="Arial, sans-serif" font-size="11" font-weight="600" fill="#64748b" font-style="italic">DIRECTOR GENERAL OF POLICE DEPT. FOR ADMINISTRATIVE MANAGEMENT OF SOCIAL ORDER</text>

        <!-- Official Police Red Stamp & Signature -->
        <g transform="translate(630, 210)">
          <!-- Circular Red Stamp -->
          <circle cx="50" cy="50" r="44" fill="none" stroke="#dc2626" stroke-width="2.5" opacity="0.85"/>
          <circle cx="50" cy="50" r="32" fill="none" stroke="#dc2626" stroke-width="1.2" opacity="0.85"/>
          <polygon points="50,42 52,47 57,47 53,50 55,55 50,52 45,55 47,50 43,47 48,47" fill="#dc2626" opacity="0.9"/>
          <text x="50" y="32" font-family="Arial, sans-serif" font-size="7" font-weight="bold" fill="#dc2626" text-anchor="middle" opacity="0.9">BỘ CÔNG AN</text>
          <text x="50" y="72" font-family="Arial, sans-serif" font-size="6" font-weight="bold" fill="#dc2626" text-anchor="middle" opacity="0.9">CỤC CẢNH SÁT QLHC VỀ TTXH</text>
          <!-- Blue Signature -->
          <path d="M 20 65 Q 40 30 65 60 T 95 45" fill="none" stroke="#1d4ed8" stroke-width="2.5" opacity="0.85"/>
        </g>

        <!-- Machine Readable Zone (MRZ 3 lines) -->
        <rect x="35" y="385" width="${width - 70}" height="125" rx="10" fill="#0f172a"/>
        <text x="55" y="420" font-family="Courier New, monospace" font-size="20" font-weight="900" fill="#38bdf8" letter-spacing="4">${escapeXml(mrzLine1)}</text>
        <text x="55" y="455" font-family="Courier New, monospace" font-size="20" font-weight="900" fill="#38bdf8" letter-spacing="4">${escapeXml(mrzLine2)}</text>
        <text x="55" y="490" font-family="Courier New, monospace" font-size="20" font-weight="900" fill="#38bdf8" letter-spacing="4">${escapeXml(mrzLine3)}</text>

        <!-- Watermark for test environment -->
        <g transform="rotate(-18 428 270)">
          <rect x="180" y="246" width="510" height="42" rx="6" fill="rgba(239, 68, 68, 0.12)"/>
          <text x="435" y="275" font-family="Arial, sans-serif" font-size="22" font-weight="900" fill="rgba(220, 38, 38, 0.45)" letter-spacing="3" text-anchor="middle">MẪU THỬ NGHIỆM - TEST SAMPLE</text>
        </g>
      </svg>
    `;

    const svgBuf = await sharp(Buffer.from(svgBack)).jpeg({ quality: 92 }).toBuffer();
    const filename = `${personaKey}_back.jpg`;
    const filePath = path.join(SAMPLES_DIR, filename);

    const targetSize = 200 * 1024;
    if (svgBuf.length < targetSize) {
      const padding = Buffer.alloc(targetSize - svgBuf.length, 0x20);
      fs.writeFileSync(filePath, Buffer.concat([svgBuf, padding]));
    } else {
      fs.writeFileSync(filePath, svgBuf);
    }
  }
}

/**
 * Generate Real Smartphone Selfie for eKYC Liveness Check
 */
async function generateRealSelfie(
  name: string,
  photoId: string,
  title: string,
  scoreLabel: string,
  isLivenessFail: boolean = false
) {
  const width = 480;
  const height = 640;

  // 1. Download base realistic portrait
  const portraitUrl = `https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=${width}&h=${height}&q=88`;
  let portraitBuf: Buffer;
  try {
    portraitBuf = await downloadImage(portraitUrl);
    portraitBuf = await sharp(portraitBuf).resize(width, height, { fit: 'cover' }).toBuffer();
  } catch {
    portraitBuf = await sharp({
      create: { width, height, channels: 3, background: { r: 15, g: 23, b: 42 } },
    }).jpeg().toBuffer();
  }

  // If liveness fail: apply blur, tilt or screen moiré overlay
  if (isLivenessFail) {
    portraitBuf = await sharp(portraitBuf)
      .modulate({ brightness: 0.85, saturation: 0.7 })
      .blur(2)
      .toBuffer();
  }

  // 2. Camera Overlay (UI guides, Biometric Oval, Face Check UI)
  const ovalColor = isLivenessFail ? '#ef4444' : '#10b981';
  const overlaySvg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <!-- Vignette shade -->
      <rect width="100%" height="80" fill="rgba(15, 23, 42, 0.6)"/>
      <rect y="${height - 100}" width="100%" height="100" fill="rgba(15, 23, 42, 0.7)"/>

      <!-- Biometric Face Oval Guide -->
      <ellipse cx="240" cy="270" rx="140" ry="180" fill="none" stroke="${ovalColor}" stroke-width="3.5" stroke-dasharray="10 6"/>
      <circle cx="240" cy="270" r="4" fill="${ovalColor}"/>

      <!-- Corner Marks -->
      <path d="M 40 100 L 40 80 L 60 80" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>
      <path d="M 440 100 L 440 80 L 420 80" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>
      <path d="M 40 480 L 40 500 L 60 500" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>
      <path d="M 440 480 L 440 500 L 420 500" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>

      <!-- Top Status Header -->
      <text x="240" y="45" font-family="-apple-system, Arial, sans-serif" font-size="15" font-weight="bold" fill="#ffffff" text-anchor="middle">XÁC THỰC SINH TRẮC HỌC eKYC</text>
      <text x="240" y="66" font-family="-apple-system, Arial, sans-serif" font-size="12" fill="#cbd5e1" text-anchor="middle">${scoreLabel}</text>

      <!-- Bottom Guidance Banner -->
      <rect x="25" y="${height - 85}" width="${width - 50}" height="65" rx="12" fill="rgba(15, 23, 42, 0.85)" stroke="#334155" stroke-width="1"/>
      <text x="240" y="${height - 52}" font-family="-apple-system, Arial, sans-serif" font-size="14" font-weight="bold" fill="#ffffff" text-anchor="middle">${title}</text>
      <text x="240" y="${height - 32}" font-family="-apple-system, Arial, sans-serif" font-size="11" fill="${ovalColor}" font-weight="bold" text-anchor="middle">${isLivenessFail ? 'CẢNH BÁO: PHÁT HIỆN GIAN LẬN / SPOOF' : 'MÔ PHỎNG CAMERA CHÍNH DIỆN'}</text>
    </svg>
  `;

  const overlayBuf = await sharp(Buffer.from(overlaySvg)).png().toBuffer();

  const finalBuf = await sharp(portraitBuf)
    .composite([{ input: overlayBuf, top: 0, left: 0 }])
    .jpeg({ quality: 90 })
    .toBuffer();

  const filePath = path.join(SAMPLES_DIR, `${name}.jpg`);
  const targetSize = 150 * 1024;
  if (finalBuf.length < targetSize) {
    const padding = Buffer.alloc(targetSize - finalBuf.length, 0x20);
    fs.writeFileSync(filePath, Buffer.concat([finalBuf, padding]));
  } else {
    fs.writeFileSync(filePath, finalBuf);
  }
}

async function createPaddedFile(filepath: string, exactTargetBytes: number) {
  const baseImg = await sharp({
    create: {
      width: 400,
      height: 300,
      channels: 3,
      background: { r: 248, g: 250, b: 252 },
    },
  })
    .jpeg({ quality: 80 })
    .toBuffer();

  if (baseImg.length > exactTargetBytes) {
    fs.writeFileSync(filepath, baseImg.subarray(0, exactTargetBytes));
    return;
  }

  const diff = exactTargetBytes - baseImg.length;
  const padding = Buffer.alloc(diff, 0x20);
  const finalBuf = Buffer.concat([baseImg, padding]);
  fs.writeFileSync(filepath, finalBuf);
}

async function main() {
  console.log('Generating authentic Vietnamese CCCD cards & realistic eKYC selfies...');
  await ensureDirs();

  // 1. Generate Authentic Vietnamese CCCD Cards for Personas P01 - P09
  for (const [key, pData] of Object.entries(PERSONAS)) {
    console.log(`- Generating CCCD card for ${key} (${pData.fullName})...`);
    await generateCard(key, 'front', pData);
    await generateCard(key, 'back', pData);
  }

  // 2. Generate Real Smartphone Selfies for Face Matching
  console.log('- Generating realistic portrait selfies...');
  // Same young man as P01 (Nguyen Van An) -> score 95.0, perfect match
  await generateRealSelfie(
    'S_score_95',
    'photo-1507003211169-0a1dd7228f2d',
    'Khớp khuôn mặt hoàn hảo (P01)',
    'Điểm khớp: 95.0% - Đạt chuẩn eKYC'
  );
  // Standard selfie -> score 85.0 (BR-103 boundary)
  await generateRealSelfie(
    'S_score_85',
    'photo-1500648767791-00dcc994a43e',
    'Ảnh selfie phòng chuẩn sáng',
    'Điểm khớp: 85.0% - Ngưỡng tối thiểu'
  );
  // Slightly tilted selfie -> score 84.9
  await generateRealSelfie(
    'S_score_84_9',
    'photo-1492562080023-ab3db95bfbce',
    'Ảnh nghiêng góc nhẹ (15 độ)',
    'Điểm khớp: 84.9% - Dưới ngưỡng chuẩn'
  );
  // Warm side lighting -> score 80.0
  await generateRealSelfie(
    'S_score_80',
    'photo-1506794778202-cad84cf45f1d',
    'Góc nghiêng ánh sáng bên',
    'Điểm khớp: 80.0% - Ngưỡng Training'
  );
  // Dim light -> score 79.9
  await generateRealSelfie(
    'S_score_79_9',
    'photo-1519085360753-af0119f7cbe7',
    'Ảnh thiếu sáng hoặc mờ',
    'Điểm khớp: 79.9% - Không đạt'
  );
  // Spoof / screen photo / fake liveness
  await generateRealSelfie(
    'S_liveness_fail',
    'photo-1534528741775-53994a69daeb',
    'Ảnh chụp lại qua màn hình máy tính',
    'Liveness: FALSE (Phát hiện giả mạo)',
    true
  );

  // 3. Exact Boundary Files for BVA (BR-102)
  console.log('- Generating BVA byte boundary files...');
  await createPaddedFile(path.join(SIZE_DIR, '99KB.jpg'), 99 * 1024);
  await createPaddedFile(path.join(SIZE_DIR, '100KB.jpg'), 100 * 1024);
  await createPaddedFile(path.join(SIZE_DIR, '101KB.jpg'), 101 * 1024);
  await createPaddedFile(path.join(SIZE_DIR, '5MB.jpg'), 5 * 1024 * 1024);
  await createPaddedFile(path.join(SIZE_DIR, '5_1MB.jpg'), Math.floor(5.1 * 1024 * 1024));

  console.log('✓ All authentic CCCD cards and real eKYC sample assets generated successfully!');
}

main().catch((err) => {
  console.error('Failed to generate sample assets:', err);
  process.exit(1);
});
