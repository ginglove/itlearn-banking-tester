export interface PersonaData {
  id: string;
  idNumber: string;
  fullName: string;
  dob: string;
  expiryDate: string;
  address: string;
  description: string;
}

export const PERSONAS: Record<string, PersonaData> = {
  P01: {
    id: 'P01',
    idNumber: '001098001234',
    fullName: 'NGUYEN VAN AN',
    dob: '1998-05-15',
    expiryDate: '2038-05-15',
    address: 'So 10 Pho Hang Gai, Quan Hoan Kiem, Ha Noi',
    description: 'Happy path (khớp ví dụ SRS)',
  },
  P02: {
    id: 'P02',
    idNumber: '079200004567',
    fullName: 'TRAN THI BINH',
    dob: '2000-01-01',
    expiryDate: '2040-01-01',
    address: 'So 45/2 Duong Le Loi, Phuo`ng Ben Nghe, Q1, TP.HCM', // Address contains special characters for 3A
    description: 'Happy path 2 (Địa chỉ cần sửa tay)',
  },
  P03: {
    id: 'P03',
    idNumber: '001208001111',
    fullName: 'LE MINH CUONG',
    dob: '2008-11-23',
    expiryDate: '2048-11-23',
    address: 'So 88 Duong Tran Phu, Quan Ba Dinh, Ha Noi',
    description: 'Đúng 18 tuổi hôm nay (hợp lệ)',
  },
  P04: {
    id: 'P04',
    idNumber: '001208002222',
    fullName: 'PHAM THU DUNG',
    dob: '2008-11-24',
    expiryDate: '2048-11-24',
    address: 'So 12 Ngo Quyen, Quan Hai Ba Trung, Ha Noi',
    description: 'Ngày mai mới đủ 18 tuổi',
  },
  P05: {
    id: 'P05',
    idNumber: '001210003333',
    fullName: 'VO HOANG EM',
    dob: '2010-06-01',
    expiryDate: '2050-06-01',
    address: 'So 34 Hung Vuong, Thanh pho Hue',
    description: 'Khách hàng 16 tuổi',
  },
  P06: {
    id: 'P06',
    idNumber: '001090000003',
    fullName: 'HOANG VAN GIANG',
    dob: '1990-03-03',
    expiryDate: '2030-03-03',
    address: 'So 456 Le Duan, Thanh pho Da Nang',
    description: 'CCCD đã có CIF trong hệ thống',
  },
  P07: {
    id: 'P07',
    idNumber: '001095004444',
    fullName: 'DANG THI HANH',
    dob: '1995-07-07',
    expiryDate: '2026-11-23',
    address: 'So 20 Nguyen Tri Phuong, Quan 5, TP.HCM',
    description: 'CCCD hết hạn đúng ngày hôm nay',
  },
  P08: {
    id: 'P08',
    idNumber: '001055005555',
    fullName: 'BUI VAN KHOA',
    dob: '1955-02-02',
    expiryDate: 'KHONG THOI HAN',
    address: 'So 56 Pham Hong Thai, Thanh pho Da Lat',
    description: 'CCCD không thời hạn',
  },
  P09: {
    id: 'P09',
    idNumber: '001099006666',
    fullName: 'NGO THI LAN',
    dob: '1999-09-09',
    expiryDate: '2025-09-09',
    address: 'So 99 Phan Chu Trinh, Quan Hai Chau, Da Nang',
    description: 'CCCD đã hết hạn sử dụng',
  },
};

/**
 * Identify persona from URL or filename
 */
export function resolvePersonaFromUrl(imageUrl: string): PersonaData {
  for (const pKey of Object.keys(PERSONAS)) {
    if (imageUrl.includes(pKey)) {
      return PERSONAS[pKey];
    }
  }
  // Default to P01 if custom uploaded or unrecognized
  return PERSONAS.P01;
}

export interface SelfieResult {
  livenessPassed: boolean;
  faceMatchScore: number;
}

/**
 * Resolve liveness and face match score from selfie filename or URL
 */
export function resolveSelfieResult(selfieUrl: string): SelfieResult {
  if (selfieUrl.includes('S_liveness_fail')) {
    return { livenessPassed: false, faceMatchScore: 90.0 };
  }
  if (selfieUrl.includes('S_score_95')) {
    return { livenessPassed: true, faceMatchScore: 95.0 };
  }
  if (selfieUrl.includes('S_score_85')) {
    return { livenessPassed: true, faceMatchScore: 85.0 };
  }
  if (selfieUrl.includes('S_score_84_9')) {
    return { livenessPassed: true, faceMatchScore: 84.9 };
  }
  if (selfieUrl.includes('S_score_80')) {
    return { livenessPassed: true, faceMatchScore: 80.0 };
  }
  if (selfieUrl.includes('S_score_79_9')) {
    return { livenessPassed: true, faceMatchScore: 79.9 };
  }

  // Default for user uploads: pass with 92.5 score
  return { livenessPassed: true, faceMatchScore: 92.5 };
}
