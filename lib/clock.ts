import { env } from './config';

/**
 * Normalizes and returns simulated business date in YYYY-MM-DD format.
 */
export function getSimulatedDate(overrideDate?: string | null): string {
  if (overrideDate && /^\d{4}-\d{2}-\d{2}$/.test(overrideDate)) {
    return overrideDate;
  }
  return env.DEFAULT_TODAY;
}

/**
 * Format YYYY-MM-DD to DD/MM/YYYY for Vietnamese UI display
 */
export function formatDateVN(isoDate: string): string {
  if (!isoDate || isoDate.length < 10) return isoDate;
  const parts = isoDate.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return isoDate;
}

/**
 * Compute precise age based on full date of birth and system date.
 * Exactly 18 today => age is 18.
 */
export function calculatePreciseAge(dobStr: string, todayStr: string): number {
  const [bYear, bMonth, bDay] = dobStr.split('-').map(Number);
  const [tYear, tMonth, tDay] = todayStr.split('-').map(Number);

  let age = tYear - bYear;
  if (tMonth < bMonth || (tMonth === bMonth && tDay < bDay)) {
    age--;
  }
  return age;
}

/**
 * Compute approximate age using year difference only.
 */
export function calculateYearOnlyAge(dobStr: string, todayStr: string): number {
  const bYear = parseInt(dobStr.split('-')[0], 10);
  const tYear = parseInt(todayStr.split('-')[0], 10);
  return tYear - bYear;
}

/**
 * Check if CCCD has expired given today's system date.
 * Expiry <= today means expired or expires today.
 */
export function isCCCDExpired(expiryDateStr: string, todayStr: string): boolean {
  if (isCCCDNoExpiry(expiryDateStr)) {
    return false;
  }
  return expiryDateStr <= todayStr;
}

/**
 * Check if card has no expiry date ("KHONG THOI HAN" / "KHÔNG THỜI HẠN")
 */
export function isCCCDNoExpiry(expiryDateStr: string): boolean {
  const normalized = expiryDateStr
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  return normalized === 'KHONG THOI HAN' || normalized === 'NO EXPIRY' || normalized === 'INDEFINITE';
}
