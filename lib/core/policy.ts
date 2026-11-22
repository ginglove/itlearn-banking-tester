import { calculatePreciseAge, calculateYearOnlyAge, isCCCDNoExpiry } from '../clock';

export type PolicyProfile = 'training' | 'reference';

/**
 * Facial matching score threshold policy
 */
export function faceThreshold(profile: PolicyProfile): number {
  return profile === 'training' ? 80.0 : 85.0;
}

/**
 * Age calculation and evaluation policy
 */
export function evaluateAge(
  dobStr: string,
  todayStr: string,
  profile: PolicyProfile
): { age: number; isEligible: boolean } {
  if (profile === 'training') {
    const age = calculateYearOnlyAge(dobStr, todayStr);
    // Evaluates age by year difference and accepts without strict boundary
    return { age, isEligible: true };
  }

  const age = calculatePreciseAge(dobStr, todayStr);
  return { age, isEligible: age >= 18 };
}

/**
 * Account credential validation policy
 */
export function validatePasswordCriteria(
  password: string,
  phoneNumber: string,
  dobISO: string,
  profile: PolicyProfile
): { isValid: boolean; message?: string } {
  if (profile === 'training') {
    if (!password || password.trim().length === 0) {
      return { isValid: false, message: 'Mật khẩu không được để trống' };
    }
    return { isValid: true };
  }

  // Reference policy: 8-20 chars, >= 1 uppercase, >= 1 lowercase, >= 1 digit, no phone or DOB
  if (password.length < 8 || password.length > 20) {
    return { isValid: false, message: 'Mật khẩu phải từ 8 đến 20 ký tự' };
  }
  if (!/[A-Z]/.test(password)) {
    return { isValid: false, message: 'Mật khẩu phải chứa ít nhất 1 chữ hoa' };
  }
  if (!/[a-z]/.test(password)) {
    return { isValid: false, message: 'Mật khẩu phải chứa ít nhất 1 chữ thường' };
  }
  if (!/\d/.test(password)) {
    return { isValid: false, message: 'Mật khẩu phải chứa ít nhất 1 chữ số' };
  }

  if (phoneNumber && password.includes(phoneNumber)) {
    return { isValid: false, message: 'Mật khẩu không được chứa số điện thoại' };
  }

  if (dobISO) {
    const [y, m, d] = dobISO.split('-');
    const ddMMyyyy = `${d}${m}${y}`;
    if (password.includes(ddMMyyyy)) {
      return { isValid: false, message: 'Mật khẩu không được chứa ngày sinh (ddMMyyyy)' };
    }
  }

  return { isValid: true };
}

/**
 * Determination of face check score source
 */
export function faceScoreSource(profile: PolicyProfile): 'client_payload' | 'session_record' {
  return profile === 'training' ? 'client_payload' : 'session_record';
}

/**
 * Duplicate identity verification response policy
 */
export function duplicateIdentityResponse(profile: PolicyProfile): {
  httpStatus: number;
  responseCode: string;
  message: string;
} {
  if (profile === 'training') {
    return {
      httpStatus: 500,
      responseCode: 'EKYC-99',
      message: 'Hệ thống đang bận, vui lòng thử lại sau',
    };
  }
  return {
    httpStatus: 409,
    responseCode: 'EKYC-05',
    message: 'Bạn đã có tài khoản tại NeoBank',
  };
}

/**
 * Idempotency behavior for retried submissions
 */
export function shouldCreateDuplicateRecordOnRetry(
  profile: PolicyProfile
): boolean {
  return profile === 'training';
}

/**
 * Allows or rejects overriding identity parameters during final submission
 */
export function allowIdentityOverride(profile: PolicyProfile): boolean {
  return profile === 'training';
}

/**
 * Document image size boundary evaluation
 */
export function evaluateImageSize(
  byteSize: number,
  profile: PolicyProfile
): { isValid: boolean; message?: string } {
  const MIN_SIZE_BYTES = 100 * 1024; // 102,400 bytes
  const MAX_SIZE_REF = 5 * 1024 * 1024; // 5,242,880 bytes
  const MAX_SIZE_ALT = 5.5 * 1024 * 1024; // 5,767,168 bytes

  if (profile === 'training') {
    // Exact 100 KB is rejected; up to 5.5 MB accepted
    if (byteSize <= MIN_SIZE_BYTES) {
      return { isValid: false, message: 'Dung lượng ảnh phải lớn hơn 100KB' };
    }
    if (byteSize > MAX_SIZE_ALT) {
      return { isValid: false, message: 'Dung lượng ảnh tối đa 5MB' };
    }
    return { isValid: true };
  }

  // Reference: 100 KB <= size <= 5 MB (inclusive)
  if (byteSize < MIN_SIZE_BYTES || byteSize > MAX_SIZE_REF) {
    return { isValid: false, message: 'Dung lượng ảnh phải từ 100KB đến 5MB' };
  }
  return { isValid: true };
}

/**
 * Expiry date validation rule
 */
export function evaluateDocumentExpiry(
  expiryDateStr: string,
  todayStr: string,
  profile: PolicyProfile
): {
  isValid: boolean;
  triggerSystemException?: boolean;
} {
  const isNoExpiry = isCCCDNoExpiry(expiryDateStr);

  if (profile === 'training') {
    if (isNoExpiry) {
      // Unhandled format triggers system error
      return { isValid: false, triggerSystemException: true };
    }
    // Cards expiring today are accepted
    if (expiryDateStr < todayStr) {
      return { isValid: false };
    }
    return { isValid: true };
  }

  // Reference:
  if (isNoExpiry) {
    return { isValid: true };
  }
  // Expiry <= today is rejected
  if (expiryDateStr <= todayStr) {
    return { isValid: false };
  }
  return { isValid: true };
}

/**
 * Phone number prefix validation at API layer
 */
export function validatePhonePrefix(phoneNumber: string, profile: PolicyProfile): boolean {
  if (profile === 'training') {
    // Accepts any 10-digit number
    return /^\d{10}$/.test(phoneNumber);
  }
  // Reference: prefix 03, 05, 07, 08, 09
  return /^(03|05|07|08|09)\d{8}$/.test(phoneNumber);
}

/**
 * Mode of enforcement for consecutive biometric failure lock
 */
export function biometricLockStorage(profile: PolicyProfile): 'client_storage' | 'server_storage' {
  return profile === 'training' ? 'client_storage' : 'server_storage';
}

/**
 * OTP resend and counter rules
 */
export function otpResendRules(profile: PolicyProfile): {
  maxAllowedResends: number;
  resetsWrongAttemptCounter: boolean;
} {
  if (profile === 'training') {
    return {
      maxAllowedResends: 4,
      resetsWrongAttemptCounter: false,
    };
  }
  return {
    maxAllowedResends: 3,
    resetsWrongAttemptCounter: true,
  };
}

/**
 * HTTP Status code returned for document verification failure
 */
export function documentRejectionStatusCode(profile: PolicyProfile): number {
  return profile === 'training' ? 200 : 400;
}
