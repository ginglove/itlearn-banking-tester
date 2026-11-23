'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CreditCard,
  Camera,
  CheckCircle2,
  AlertCircle,
  Lock,
  RefreshCw,
  Mail,
  Phone,
  User,
  Calendar,
  MapPin,
  ChevronRight,
  ExternalLink,
  MessageSquare,
  X,
  Eye,
  EyeOff,
  Copy,
  Database,
  FileCode,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

interface HealthData {
  status: string;
  today: string;
  profile: string;
  version: string;
}

interface SmsMessage {
  id: number;
  phoneNumber: string;
  content: string;
  sentAt: string;
}

export default function StudentOnboardingApp() {
  // Navigation & Step state: S00 - S08
  const [currentStep, setCurrentStep] = useState<string>('S00');
  const [sandboxId, setSandboxId] = useState<string>('DEMO01');
  const [systemDate, setSystemDate] = useState<string>('2026-11-23');

  // Form data
  const [phoneNumber, setPhoneNumber] = useState<string>('0912345678');
  const [email, setEmail] = useState<string>('khachhang@example.com');
  const [onboardingId, setOnboardingId] = useState<string>('');
  const [onboardingToken, setOnboardingToken] = useState<string>('');

  // OTP State (S02)
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [otpCountdown, setOtpCountdown] = useState<number>(60);
  const [resendRemaining, setResendRemaining] = useState<number>(3);
  const [smsDrawerOpen, setSmsDrawerOpen] = useState<boolean>(false);
  const [smsList, setSmsList] = useState<SmsMessage[]>([]);

  // CCCD & OCR State (S03 & S04)
  const [selectedPersona, setSelectedPersona] = useState<string>('P01');
  const [frontImageUrl, setFrontImageUrl] = useState<string>('/samples/P01_front.jpg');
  const [backImageUrl, setBackImageUrl] = useState<string>('/samples/P01_back.jpg');
  const [ocrData, setOcrData] = useState<{
    idNumber: string;
    fullName: string;
    dob: string;
    expiryDate: string;
    address: string;
  }>({
    idNumber: '',
    fullName: '',
    dob: '',
    expiryDate: '',
    address: '',
  });
  const [editableAddress, setEditableAddress] = useState<string>('');

  // Face Check State (S05)
  const [selectedSelfie, setSelectedSelfie] = useState<string>('S_score_95');
  const [faceAttemptsRemaining, setFaceAttemptsRemaining] = useState<number>(3);
  const [faceLockUntil, setFaceLockUntil] = useState<number | null>(null);
  const [faceScore, setFaceScore] = useState<number>(95.0);

  // Submit & Password State (S06)
  const [password, setPassword] = useState<string>('NeoBank@2026');
  const [confirmPassword, setConfirmPassword] = useState<string>('NeoBank@2026');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [termsAccepted, setTermsAccepted] = useState<boolean>(true);

  // Success Result (S07)
  const [creationResult, setCreationResult] = useState<{
    cifNumber: string;
    accountNumber: string;
    status: string;
  } | null>(null);

  // Global Error Banner (S09)
  const [apiError, setApiError] = useState<{ code: string; message: string } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Initialize sandbox from URL query ?s=CODE
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const s = params.get('s');
      if (s) {
        const clean = s.trim().toUpperCase();
        setSandboxId(clean);
        document.cookie = `sbx=${clean}; path=/; max-age=86400`;
      }
    }

    // Fetch system health & date
    fetch('/api/dev/health')
      .then((res) => res.json())
      .then((data: HealthData) => {
        if (data.today) setSystemDate(data.today);
      })
      .catch(() => {});
  }, []);

  // OTP Countdown Timer
  useEffect(() => {
    if (currentStep === 'S02' && otpCountdown > 0) {
      const timer = setTimeout(() => setOtpCountdown(otpCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [currentStep, otpCountdown]);

  // Load SMS messages when drawer opens
  const fetchSmsMessages = async () => {
    try {
      const res = await fetch(`/api/dev/sms?phone=${phoneNumber}`, {
        headers: { 'X-Sandbox-Id': sandboxId },
      });
      const data = await res.json();
      if (data.messages) {
        setSmsList(data.messages);
      }
    } catch {}
  };

  useEffect(() => {
    if (smsDrawerOpen) {
      fetchSmsMessages();
      const interval = setInterval(fetchSmsMessages, 3000);
      return () => clearInterval(interval);
    }
  }, [smsDrawerOpen, phoneNumber, sandboxId]);

  // Helper for API calls with common headers
  const callApi = async (url: string, method: string, body?: any, token?: string) => {
    setLoading(true);
    setApiError(null);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Sandbox-Id': sandboxId,
      };
      if (token || onboardingToken) {
        headers['Authorization'] = `Bearer ${token || onboardingToken}`;
      }

      const res = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      const data = await res.json();
      if (!res.ok && res.status !== 200) {
        if (res.status === 409 && data.responseCode === 'EKYC-05') {
          setCurrentStep('S08');
        } else {
          setApiError({
            code: data.responseCode || `HTTP-${res.status}`,
            message: data.message || 'Yêu cầu không thể thực hiện.',
          });
        }
        return { ok: false, status: res.status, data };
      }

      if (data.responseCode && data.responseCode !== '00') {
        setApiError({
          code: data.responseCode,
          message: data.message || 'Lỗi xử lý từ hệ thống.',
        });
        return { ok: false, status: res.status, data };
      }

      return { ok: true, status: res.status, data };
    } catch (err: any) {
      setApiError({
        code: 'NETWORK-ERR',
        message: err.message || 'Lỗi kết nối mạng, vui lòng thử lại sau.',
      });
      return { ok: false, status: 500, data: null };
    } finally {
      setLoading(false);
    }
  };

  // STEP 1: Request OTP (B1)
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^(03|05|07|08|09)\d{8}$/.test(phoneNumber)) {
      setApiError({
        code: 'VAL-400',
        message: 'Số điện thoại không hợp lệ (yêu cầu 10 chữ số với đầu số 03, 05, 07, 08, 09)',
      });
      return;
    }

    const res = await callApi('/api/v1/onboarding/otp/request', 'POST', {
      phoneNumber,
      email: email || undefined,
    });

    if (res.ok && res.data) {
      setOnboardingId(res.data.onboardingId);
      setOtpCountdown(res.data.otpExpiresIn || 60);
      setResendRemaining(res.data.resendRemaining ?? 3);
      setCurrentStep('S02');
      setSmsDrawerOpen(true);
    }
  };

  // STEP 2: Resend OTP (BR-104)
  const handleResendOtp = async () => {
    if (resendRemaining <= 0) return;
    const res = await callApi('/api/v1/onboarding/otp/resend', 'POST', { onboardingId });
    if (res.ok && res.data) {
      setOtpCountdown(res.data.otpExpiresIn || 60);
      setResendRemaining(res.data.resendRemaining);
      fetchSmsMessages();
    }
  };

  // STEP 2: Verify OTP (B2)
  const handleVerifyOtp = async () => {
    const otp = otpDigits.join('');
    if (otp.length < 6) {
      setApiError({ code: 'VAL-400', message: 'Vui lòng nhập đủ 6 chữ số mã OTP' });
      return;
    }

    const res = await callApi('/api/v1/onboarding/otp/verify', 'POST', {
      onboardingId,
      otp,
    });

    if (res.ok && res.data) {
      setOnboardingToken(res.data.onboardingToken);
      setSmsDrawerOpen(false);
      setCurrentStep('S03');
    }
  };

  // STEP 3: Process OCR (B3)
  const handleProcessOcr = async () => {
    const res = await callApi(
      '/api/v1/onboarding/ocr',
      'POST',
      {
        frontImageUrl,
        backImageUrl,
      },
      onboardingToken
    );

    if (res.ok && res.data) {
      setOcrData(res.data);
      setEditableAddress(res.data.address || '');
      setCurrentStep('S04');
    }
  };

  // STEP 4: Confirm OCR and move to Face Check (3A)
  const handleConfirmOcr = () => {
    setCurrentStep('S05');
  };

  // STEP 5: Face Check (B4 & 4A)
  const handleFaceCheck = async () => {
    if (faceLockUntil && Date.now() < faceLockUntil) {
      const remainingMinutes = Math.ceil((faceLockUntil - Date.now()) / (60 * 1000));
      setApiError({
        code: 'SES-01',
        message: `Phiên eKYC tạm khóa ${remainingMinutes} phút do xác thực khuôn mặt không thành công 3 lần.`,
      });
      return;
    }

    const selfieUrl = `/samples/${selectedSelfie}.jpg`;
    const res = await callApi('/api/v1/onboarding/face-check', 'POST', { selfieUrl }, onboardingToken);

    if (res.ok && res.data) {
      setFaceScore(res.data.faceMatchScore);
      setFaceAttemptsRemaining(3);
      setCurrentStep('S06');
    } else if (res.data) {
      const details = res.data.details?.[0] || {};
      const remaining = details.attemptsRemaining !== undefined ? details.attemptsRemaining : 0;
      setFaceAttemptsRemaining(remaining);
      if (remaining === 0) {
        setFaceLockUntil(Date.now() + 30 * 60 * 1000);
      }
    }
  };

  // STEP 6: Final Submit (B5 & B6)
  const handleSubmitEkyc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!termsAccepted) {
      setApiError({
        code: 'VAL-400',
        message: 'Vui lòng đọc và đồng ý với Điều khoản dịch vụ để tiếp tục.',
      });
      return;
    }

    if (password !== confirmPassword) {
      setApiError({ code: 'VAL-400', message: 'Mật khẩu xác nhận không trùng khớp' });
      return;
    }

    const submitPayload = {
      phoneNumber,
      idNumber: ocrData.idNumber,
      fullName: ocrData.fullName,
      dob: ocrData.dob,
      expiryDate: ocrData.expiryDate,
      faceMatchScore: faceScore,
      email: email || undefined,
      address: editableAddress,
      password,
      onboardingId,
    };

    const res = await callApi(
      '/api/v1/onboarding/ekyc-submit',
      'POST',
      submitPayload,
      onboardingToken
    );

    if (res.ok && res.data) {
      setCreationResult(res.data.data);
      setCurrentStep('S07');
    }
  };

  const formatDisplayDate = (dStr: string) => {
    if (!dStr) return '';
    const parts = dStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dStr;
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#f1f5f9',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px 12px',
        position: 'relative',
        color: '#0f172a',
      }}
    >
      {/* Top Navbar / Student Quick Tools */}
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '14px',
          padding: '0 4px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              fontSize: '11px',
              padding: '3px 10px',
              borderRadius: '9999px',
              background: '#ffffff',
              color: '#0284c7',
              fontWeight: 700,
              border: '1px solid #cbd5e1',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }}></span>
            SANDBOX: {sandboxId}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <a
            href="/sql"
            target="_blank"
            rel="noreferrer"
            style={{
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '5px 12px',
              borderRadius: '8px',
              background: '#ffffff',
              color: '#334155',
              border: '1px solid #cbd5e1',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              fontWeight: 600,
            }}
          >
            <Database size={13} color="#0284c7" />
            SQL Tra cứu
          </a>
          <a
            href="/docs"
            target="_blank"
            rel="noreferrer"
            style={{
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '5px 12px',
              borderRadius: '8px',
              background: '#ffffff',
              color: '#334155',
              border: '1px solid #cbd5e1',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              fontWeight: 600,
            }}
          >
            <FileCode size={13} color="#0284c7" />
            Swagger API
          </a>
        </div>
      </div>

      {/* Mobile Device Frame (390px viewport standard - Light Theme) */}
      <div
        style={{
          width: '100%',
          maxWidth: '390px',
          minHeight: '740px',
          background: '#ffffff',
          borderRadius: '36px',
          border: '10px solid #0f172a',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.18), 0 0 0 1px rgba(15, 23, 42, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Device Notch & Status bar */}
        <div
          style={{
            height: '34px',
            background: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 20px',
            fontSize: '11px',
            color: '#64748b',
            borderBottom: '1px solid #f1f5f9',
            fontWeight: 600,
          }}
        >
          <span>9:41</span>
          <div
            style={{
              width: '84px',
              height: '14px',
              background: '#0f172a',
              borderRadius: '9999px',
            }}
          />
          <span>5G • 100%</span>
        </div>

        {/* Header Branding */}
        <div
          style={{
            padding: '14px 18px',
            background: '#ffffff',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: 900,
                fontSize: '17px',
                boxShadow: '0 2px 6px rgba(2, 132, 199, 0.3)',
              }}
            >
              N
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '15px', color: '#0f172a', letterSpacing: '0.4px' }}>
                NeoBank
              </div>
              <div style={{ fontSize: '10px', color: '#0284c7', fontWeight: 700 }}>DIGITAL BANKING</div>
            </div>
          </div>

          {currentStep !== 'S00' && (
            <button
              onClick={() => setSmsDrawerOpen(true)}
              style={{
                background: '#f0f9ff',
                border: '1px solid #bae6fd',
                color: '#0284c7',
                borderRadius: '8px',
                padding: '6px 10px',
                fontSize: '11px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                cursor: 'pointer',
              }}
            >
              <MessageSquare size={13} />
              Hộp thư SMS
            </button>
          )}
        </div>

        {/* Global Error Banner (S09) */}
        {apiError && (
          <div
            style={{
              background: '#fff1f2',
              borderBottom: '1px solid #fecdd3',
              padding: '10px 16px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              color: '#9f1239',
              fontSize: '12px',
              animation: 'fadeIn 0.2s ease',
            }}
          >
            <AlertCircle size={16} style={{ color: '#e11d48', flexShrink: 0, marginTop: '2px' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, color: '#be123c', marginBottom: '2px' }}>
                Lỗi {apiError.code}
              </div>
              <div style={{ lineHeight: 1.4 }}>{apiError.message}</div>
            </div>
            <button
              onClick={() => setApiError(null)}
              style={{
                background: 'none',
                border: 'none',
                color: '#be123c',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              <X size={15} />
            </button>
          </div>
        )}

        {/* Body content based on step */}
        <div style={{ flex: 1, padding: '18px', overflowY: 'auto', background: '#ffffff' }}>
          {/* S00: Chào mừng */}
          {currentStep === 'S00' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
              <div style={{ textAlign: 'center', marginTop: '16px' }}>
                <div
                  style={{
                    width: '74px',
                    height: '74px',
                    borderRadius: '22px',
                    background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 18px',
                    boxShadow: '0 10px 25px -5px rgba(2, 132, 199, 0.4)',
                  }}
                >
                  <ShieldCheck size={40} color="#fff" />
                </div>
                <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '8px', color: '#0f172a' }}>
                  Mở Tài Khoản Trực Tuyến
                </h1>
                <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5, marginBottom: '22px' }}>
                  Định danh điện tử eKYC 100% trong 3 phút. Miễn phí mở tài khoản thanh toán CASA và phát hành thẻ số.
                </p>

                <div
                  style={{
                    background: '#f8fafc',
                    borderRadius: '14px',
                    padding: '16px',
                    textAlign: 'left',
                    border: '1px solid #e2e8f0',
                    marginBottom: '20px',
                  }}
                >
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#0284c7', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Quy trình eKYC 3 bước nhanh chóng:
                  </div>
                  <div style={{ fontSize: '13px', color: '#334155', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#e0f2fe', color: '#0284c7', fontSize: '11px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>1</span>
                      <span>Xác thực số điện thoại qua SMS OTP</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#e0f2fe', color: '#0284c7', fontSize: '11px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>2</span>
                      <span>Chụp 2 mặt CCCD gắn chip (OCR tự động)</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#e0f2fe', color: '#0284c7', fontSize: '11px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>3</span>
                      <span>Nhận diện khuôn mặt &amp; kiểm tra sinh trắc</span>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 'auto', paddingTop: '16px' }}>
                <button
                  onClick={() => setCurrentStep('S01')}
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '15px',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(2, 132, 199, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  Bắt đầu mở tài khoản ngay
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}

          {/* S01: Số điện thoại & Email (B1) */}
          {currentStep === 'S01' && (
            <div>
              <div style={{ marginBottom: '20px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
                  Thông tin đăng ký
                </h2>
                <p style={{ fontSize: '12px', color: '#64748b' }}>
                  Bước 1/6 • Vui lòng nhập số điện thoại chính chủ của bạn
                </p>
              </div>

              <form onSubmit={handleRequestOtp} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: '#334155', marginBottom: '6px', fontWeight: 700 }}>
                    Số điện thoại <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Phone
                      size={16}
                      style={{ position: 'absolute', left: '12px', top: '14px', color: '#64748b' }}
                    />
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value.trim())}
                      placeholder="0912345678"
                      maxLength={10}
                      style={{
                        width: '100%',
                        padding: '12px 12px 12px 38px',
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '10px',
                        color: '#0f172a',
                        fontSize: '15px',
                        outline: 'none',
                        fontWeight: 600,
                      }}
                      required
                    />
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '5px' }}>
                    Gồm 10 chữ số, đầu số hợp lệ: 03, 05, 07, 08, 09
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: '#334155', marginBottom: '6px', fontWeight: 700 }}>
                    Địa chỉ Email (Không bắt buộc)
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Mail
                      size={16}
                      style={{ position: 'absolute', left: '12px', top: '14px', color: '#64748b' }}
                    />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value.trim())}
                      placeholder="name@example.com"
                      style={{
                        width: '100%',
                        padding: '12px 12px 12px 38px',
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '10px',
                        color: '#0f172a',
                        fontSize: '15px',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>

                <div style={{ marginTop: '20px' }}>
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      width: '100%',
                      padding: '14px',
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: '15px',
                      border: 'none',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      opacity: loading ? 0.7 : 1,
                      boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)',
                    }}
                  >
                    {loading ? 'Đang gửi mã...' : 'Gửi mã OTP'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* S02: Nhập OTP (B2) */}
          {currentStep === 'S02' && (
            <div>
              <div style={{ marginBottom: '20px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
                  Xác thực mã OTP
                </h2>
                <p style={{ fontSize: '12px', color: '#64748b' }}>
                  Mã 6 chữ số đã gửi tới số điện thoại <b>{phoneNumber}</b>
                </p>
              </div>

              {/* 6-box input */}
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', margin: '24px 0' }}>
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    id={`otp-box-${idx}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      const newArr = [...otpDigits];
                      newArr[idx] = val;
                      setOtpDigits(newArr);
                      if (val && idx < 5) {
                        const nextBox = document.getElementById(`otp-box-${idx + 1}`);
                        nextBox?.focus();
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Backspace' && !digit && idx > 0) {
                        const prevBox = document.getElementById(`otp-box-${idx - 1}`);
                        prevBox?.focus();
                      }
                    }}
                    style={{
                      width: '46px',
                      height: '52px',
                      textAlign: 'center',
                      fontSize: '20px',
                      fontWeight: 800,
                      background: '#ffffff',
                      border: digit ? '2px solid #0284c7' : '1px solid #cbd5e1',
                      borderRadius: '10px',
                      color: '#0f172a',
                      outline: 'none',
                      boxShadow: digit ? '0 0 0 3px rgba(2, 132, 199, 0.15)' : 'none',
                    }}
                  />
                ))}
              </div>

              {/* Countdown & Resend */}
              <div style={{ textAlign: 'center', fontSize: '13px', color: '#64748b', marginBottom: '24px' }}>
                {otpCountdown > 0 ? (
                  <span>Mã hiệu lực trong <b>{otpCountdown} giây</b></span>
                ) : (
                  <span style={{ color: '#ef4444', fontWeight: 700 }}>Mã OTP đã hết hiệu lực</span>
                )}
                <div style={{ marginTop: '8px' }}>
                  <button
                    onClick={handleResendOtp}
                    disabled={resendRemaining <= 0 || loading}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: resendRemaining > 0 ? '#0284c7' : '#94a3b8',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: resendRemaining > 0 ? 'pointer' : 'not-allowed',
                      textDecoration: 'underline',
                    }}
                  >
                    Gửi lại mã OTP ({resendRemaining} lần còn lại)
                  </button>
                </div>
              </div>

              <button
                onClick={handleVerifyOtp}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '15px',
                  border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)',
                }}
              >
                {loading ? 'Đang kiểm tra...' : 'Xác nhận OTP'}
              </button>
            </div>
          )}

          {/* S03: Chụp CCCD (B3) */}
          {currentStep === 'S03' && (
            <div>
              <div style={{ marginBottom: '16px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
                  Chụp ảnh CCCD gắn chip
                </h2>
                <p style={{ fontSize: '12px', color: '#64748b' }}>
                  Bước 2/6 • Thẻ Căn cước công dân gắn chip chuẩn Việt Nam (100KB - 5MB)
                </p>
              </div>

              {/* Persona Sample Selector */}
              <div
                style={{
                  background: '#f8fafc',
                  borderRadius: '14px',
                  padding: '12px',
                  border: '1px solid #e2e8f0',
                  marginBottom: '16px',
                }}
              >
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#0284c7', marginBottom: '8px' }}>
                  Thư viện CCCD gắn chip thực nghiệm:
                </div>
                <select
                  value={selectedPersona}
                  onChange={(e) => {
                    const p = e.target.value;
                    setSelectedPersona(p);
                    setFrontImageUrl(`/samples/${p}_front.jpg`);
                    setBackImageUrl(`/samples/${p}_back.jpg`);
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: '#ffffff',
                    color: '#0f172a',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    fontWeight: 600,
                    outline: 'none',
                  }}
                >
                  <option value="P01">Mẫu P01: NGUYỄN VĂN AN (Chuẩn Happy Path - 1998)</option>
                  <option value="P02">Mẫu P02: TRẦN THỊ BÌNH (Địa chỉ có ký tự lạ - Luồng 3A)</option>
                  <option value="P03">Mẫu P03: LÊ MINH CƯỜNG (Đúng 18 tuổi hôm nay)</option>
                  <option value="P04">Mẫu P04: PHẠM THU DUNG (Ngày mai mới đủ 18 tuổi)</option>
                  <option value="P05">Mẫu P05: VÕ HOÀNG EM (Khách hàng 16 tuổi)</option>
                  <option value="P06">Mẫu P06: HOÀNG VĂN GIANG (Đã có CIF)</option>
                  <option value="P07">Mẫu P07: ĐẶNG THỊ HẠNH (Hết hạn đúng hôm nay)</option>
                  <option value="P08">Mẫu P08: BÙI VĂN KHOA (Không thời hạn)</option>
                  <option value="P09">Mẫu P09: NGÔ THỊ LAN (Đã hết hạn sử dụng)</option>
                </select>
              </div>

              {/* Real Card Previews */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
                <div
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: '14px',
                    padding: '10px',
                    background: '#f8fafc',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                  }}
                >
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Mặt trước CCCD gắn chip</span>
                    <span style={{ color: '#0284c7' }}>Ảnh thật 100%</span>
                  </div>
                  <img
                    src={frontImageUrl}
                    alt="CCCD Front"
                    style={{ width: '100%', height: 'auto', borderRadius: '10px', border: '1px solid #cbd5e1', objectFit: 'contain' }}
                  />
                </div>

                <div
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: '14px',
                    padding: '10px',
                    background: '#f8fafc',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                  }}
                >
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Mặt sau CCCD gắn chip (Microchip &amp; MRZ)</span>
                    <span style={{ color: '#0284c7' }}>Ảnh thật 100%</span>
                  </div>
                  <img
                    src={backImageUrl}
                    alt="CCCD Back"
                    style={{ width: '100%', height: 'auto', borderRadius: '10px', border: '1px solid #cbd5e1', objectFit: 'contain' }}
                  />
                </div>
              </div>

              <button
                onClick={handleProcessOcr}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '15px',
                  border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)',
                }}
              >
                {loading ? 'Đang trích xuất OCR...' : 'Trích xuất thông tin OCR'}
              </button>
            </div>
          )}

          {/* S04: Xác nhận thông tin OCR (3A) */}
          {currentStep === 'S04' && (
            <div>
              <div style={{ marginBottom: '16px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
                  Xác nhận thông tin CCCD
                </h2>
                <p style={{ fontSize: '12px', color: '#64748b' }}>
                  Bước 3/6 • Chỉ được phép sửa trường Địa chỉ nếu OCR nhận diện sai (Luồng 3A)
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                {/* Locked Số CCCD */}
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#64748b', marginBottom: '4px', fontWeight: 700 }}>
                    <Lock size={12} color="#f59e0b" /> Số CCCD (Bị khóa theo SRS)
                  </label>
                  <input
                    type="text"
                    value={ocrData.idNumber}
                    disabled
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: '#f1f5f9',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      color: '#475569',
                      fontSize: '14px',
                      cursor: 'not-allowed',
                      fontWeight: 700,
                    }}
                  />
                </div>

                {/* Locked Họ và tên */}
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#64748b', marginBottom: '4px', fontWeight: 700 }}>
                    <Lock size={12} color="#f59e0b" /> Họ và tên (Bị khóa theo SRS)
                  </label>
                  <input
                    type="text"
                    value={ocrData.fullName}
                    disabled
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: '#f1f5f9',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      color: '#475569',
                      fontSize: '14px',
                      cursor: 'not-allowed',
                      fontWeight: 700,
                    }}
                  />
                </div>

                {/* Locked Ngày sinh & Hết hạn */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#64748b', marginBottom: '4px', fontWeight: 700 }}>
                      <Lock size={12} color="#f59e0b" /> Ngày sinh
                    </label>
                    <input
                      type="text"
                      value={formatDisplayDate(ocrData.dob)}
                      disabled
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        background: '#f1f5f9',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        color: '#475569',
                        fontSize: '14px',
                        cursor: 'not-allowed',
                        fontWeight: 700,
                      }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#64748b', marginBottom: '4px', fontWeight: 700 }}>
                      <Lock size={12} color="#f59e0b" /> Hết hạn
                    </label>
                    <input
                      type="text"
                      value={ocrData.expiryDate}
                      disabled
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        background: '#f1f5f9',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        color: '#475569',
                        fontSize: '14px',
                        cursor: 'not-allowed',
                        fontWeight: 700,
                      }}
                    />
                  </div>
                </div>

                {/* Editable Nơi thường trú (Luồng 3A) */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#0284c7', marginBottom: '4px', fontWeight: 800 }}>
                    Nơi thường trú (Có thể sửa tay nếu OCR sai)
                  </label>
                  <textarea
                    rows={2}
                    value={editableAddress}
                    onChange={(e) => setEditableAddress(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: '#ffffff',
                      border: '2px solid #0284c7',
                      borderRadius: '8px',
                      color: '#0f172a',
                      fontSize: '13px',
                      fontWeight: 600,
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setCurrentStep('S03')}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '10px',
                    background: '#f1f5f9',
                    color: '#334155',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Chụp lại CCCD
                </button>
                <button
                  type="button"
                  onClick={handleConfirmOcr}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                    color: '#fff',
                    border: 'none',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)',
                  }}
                >
                  Xác nhận &amp; Tiếp tục
                </button>
              </div>
            </div>
          )}

          {/* S05: Xác thực khuôn mặt (B4 & 4A) */}
          {currentStep === 'S05' && (
            <div>
              <div style={{ marginBottom: '16px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
                  Xác thực khuôn mặt (Liveness)
                </h2>
                <p style={{ fontSize: '12px', color: '#64748b' }}>
                  Bước 4/6 • So khớp chân dung người thật với ảnh trên CCCD (Ngưỡng đạt ≥ 85%)
                </p>
              </div>

              {/* Sample Selfie Selector */}
              <div
                style={{
                  background: '#f8fafc',
                  borderRadius: '14px',
                  padding: '12px',
                  border: '1px solid #e2e8f0',
                  marginBottom: '16px',
                }}
              >
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#0284c7', marginBottom: '8px' }}>
                  Chọn mẫu ảnh chụp selfie chân thực:
                </div>
                <select
                  value={selectedSelfie}
                  onChange={(e) => setSelectedSelfie(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: '#ffffff',
                    color: '#0f172a',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    fontWeight: 600,
                    outline: 'none',
                  }}
                >
                  <option value="S_score_95">Mẫu 1: Trực diện sắc nét (Khớp P01 - 95.0%)</option>
                  <option value="S_score_85">Mẫu 2: Ảnh selfie phòng chuẩn (85.0% - Ngưỡng)</option>
                  <option value="S_score_84_9">Mẫu 3: Nghiêng góc nhẹ (84.9%)</option>
                  <option value="S_score_80">Mẫu 4: Ánh sáng góc nghiêng (80.0%)</option>
                  <option value="S_score_79_9">Mẫu 5: Ảnh tối / thiếu sáng (79.9%)</option>
                  <option value="S_score_liveness_fail">Mẫu 6: Ảnh chụp qua màn hình (Liveness FAIL)</option>
                </select>
              </div>

              {/* Face Guide Video Box */}
              <div
                style={{
                  width: '100%',
                  height: '260px',
                  background: '#0f172a',
                  borderRadius: '16px',
                  border: '3px solid #0284c7',
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '16px',
                  boxShadow: '0 8px 20px rgba(2, 132, 199, 0.25)',
                }}
              >
                <img
                  src={`/samples/${selectedSelfie}.jpg`}
                  alt="Selfie Check"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>

              <div style={{ textAlign: 'center', fontSize: '12px', color: '#64748b', marginBottom: '16px', fontWeight: 600 }}>
                Số lần thử còn lại: <b style={{ color: faceAttemptsRemaining < 2 ? '#ef4444' : '#10b981' }}>{faceAttemptsRemaining} / 3</b>
              </div>

              <button
                onClick={handleFaceCheck}
                disabled={loading || (faceLockUntil !== null && Date.now() < faceLockUntil)}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '15px',
                  border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)',
                }}
              >
                {loading ? 'Đang so khớp sinh trắc học...' : 'Bắt đầu xác thực khuôn mặt'}
              </button>
            </div>
          )}

          {/* S06: Hoàn tất thông tin & Mật khẩu (B5) */}
          {currentStep === 'S06' && (
            <div>
              <div style={{ marginBottom: '16px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
                  Tạo mật khẩu &amp; Hoàn tất
                </h2>
                <p style={{ fontSize: '12px', color: '#64748b' }}>
                  Bước 5/6 • Thiết lập mật khẩu bảo mật cho tài khoản ngân hàng
                </p>
              </div>

              <form onSubmit={handleSubmitEkyc} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Account Package Card */}
                <div
                  style={{
                    background: '#f0f9ff',
                    border: '1px solid #bae6fd',
                    borderRadius: '14px',
                    padding: '14px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '14px', fontWeight: 800, color: '#0369a1' }}>
                      Gói tài khoản NeoStandard
                    </span>
                    <span style={{ fontSize: '11px', background: '#0284c7', color: '#fff', padding: '3px 8px', borderRadius: '6px', fontWeight: 700 }}>
                      Miễn phí
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#0284c7', marginTop: '4px', fontWeight: 500 }}>
                    Số tài khoản ngẫu nhiên • Hạn mức chuyển khoản 100.000.000đ/tháng
                  </div>
                </div>

                {/* Password field */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#334155', marginBottom: '4px', fontWeight: 700 }}>
                    Mật khẩu đăng nhập <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="NeoBank@2026"
                      style={{
                        width: '100%',
                        padding: '10px 38px 10px 12px',
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        color: '#0f172a',
                        fontSize: '14px',
                        outline: 'none',
                        fontWeight: 600,
                      }}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '12px',
                        background: 'none',
                        border: 'none',
                        color: '#64748b',
                        cursor: 'pointer',
                      }}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#334155', marginBottom: '4px', fontWeight: 700 }}>
                    Xác nhận mật khẩu <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="NeoBank@2026"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      color: '#0f172a',
                      fontSize: '14px',
                      outline: 'none',
                      fontWeight: 600,
                    }}
                    required
                  />
                </div>

                {/* Terms and conditions */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginTop: '6px' }}>
                  <input
                    type="checkbox"
                    id="terms-check"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    style={{ marginTop: '3px' }}
                  />
                  <label htmlFor="terms-check" style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.4 }}>
                    Tôi đồng ý với{' '}
                    <span style={{ color: '#0284c7', textDecoration: 'underline', fontWeight: 600 }}>
                      Điều khoản &amp; Điều kiện dịch vụ ngân hàng số NeoBank
                    </span>
                  </label>
                </div>

                <div style={{ marginTop: '14px' }}>
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      width: '100%',
                      padding: '14px',
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: '15px',
                      border: 'none',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)',
                    }}
                  >
                    {loading ? 'Đang khởi tạo tài khoản...' : 'Xác nhận mở tài khoản'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* S07: Chúc mừng thành công (B6) */}
          {currentStep === 'S07' && creationResult && (
            <div style={{ textAlign: 'center', paddingTop: '16px' }}>
              <div
                style={{
                  width: '68px',
                  height: '68px',
                  borderRadius: '50%',
                  background: '#ecfdf5',
                  border: '2px solid #10b981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                  boxShadow: '0 8px 20px rgba(16, 185, 129, 0.25)',
                }}
              >
                <CheckCircle2 size={40} color="#10b981" />
              </div>

              <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>
                Chúc Mừng Quý Khách!
              </h2>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '24px' }}>
                Tài khoản thanh toán CASA đã được kích hoạt thành công trên hệ thống Core Banking.
              </p>

              {/* Account summary card */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '16px',
                  textAlign: 'left',
                  marginBottom: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Mã khách hàng (CIF):</span>
                  <span style={{ fontSize: '15px', fontWeight: 800, color: '#0284c7' }}>
                    {creationResult.cifNumber}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Số tài khoản CASA:</span>
                  <span style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                    {creationResult.accountNumber}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Trạng thái tài khoản:</span>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      color: '#065f46',
                      background: '#ecfdf5',
                      border: '1px solid #a7f3d0',
                      padding: '3px 8px',
                      borderRadius: '6px',
                    }}
                  >
                    {creationResult.status}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button
                  onClick={() => alert('Màn hình Đăng nhập (Stub)')}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '14px',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)',
                  }}
                >
                  Đăng nhập ứng dụng
                </button>
                <button
                  onClick={() => {
                    setCurrentStep('S00');
                    setCreationResult(null);
                  }}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '10px',
                    background: '#f1f5f9',
                    color: '#475569',
                    fontWeight: 700,
                    fontSize: '13px',
                    border: '1px solid #cbd5e1',
                    cursor: 'pointer',
                  }}
                >
                  Mở tài khoản khác
                </button>
              </div>
            </div>
          )}

          {/* S08: Đã có tài khoản (BR-105) */}
          {currentStep === 'S08' && (
            <div style={{ textAlign: 'center', paddingTop: '32px' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: '#fffbeb',
                  border: '2px solid #f59e0b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}
              >
                <User size={36} color="#f59e0b" />
              </div>

              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
                Bạn Đã Có Tài Khoản
              </h2>
              <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.5, marginBottom: '28px' }}>
                Số CCCD này đã được cấp mã CIF tại NeoBank. Vui lòng đăng nhập hoặc sử dụng chức năng Quên mật khẩu để lấy lại quyền truy cập.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button
                  onClick={() => alert('Chức năng Quên mật khẩu (Stub)')}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '14px',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)',
                  }}
                >
                  Quên mật khẩu
                </button>
                <button
                  onClick={() => setCurrentStep('S00')}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '10px',
                    background: '#f1f5f9',
                    color: '#475569',
                    fontWeight: 700,
                    fontSize: '13px',
                    border: '1px solid #cbd5e1',
                    cursor: 'pointer',
                  }}
                >
                  Quay lại trang chủ
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer: Date and SIT environment */}
        <div
          style={{
            padding: '10px 16px',
            background: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '11px',
            color: '#64748b',
          }}
        >
          <span>Môi trường: <b style={{ color: '#0284c7' }}>SIT</b></span>
          <span>Ngày hệ thống: <b>{formatDisplayDate(systemDate)}</b></span>
        </div>

        {/* SMS Drawer Slide-over (S02) */}
        {smsDrawerOpen && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(15, 23, 42, 0.45)',
              zIndex: 50,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
            }}
          >
            <div
              style={{
                background: '#ffffff',
                borderTopLeftRadius: '24px',
                borderTopRightRadius: '24px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 -10px 25px rgba(0,0,0,0.1)',
                maxHeight: '75%',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  padding: '14px 18px',
                  borderBottom: '1px solid #e2e8f0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: '#f8fafc',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MessageSquare size={16} color="#0284c7" />
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
                    Hộp thư SMS Giả lập
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={fetchSmsMessages}
                    style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
                  >
                    <RefreshCw size={14} />
                  </button>
                  <button
                    onClick={() => setSmsDrawerOpen(false)}
                    style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div style={{ padding: '14px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {smsList.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '12px', padding: '20px' }}>
                    Chưa có tin nhắn SMS nào được gửi.
                  </div>
                ) : (
                  smsList.map((msg) => {
                    const match = msg.content.match(/\b\d{6}\b/);
                    const foundOtp = match ? match[0] : null;

                    return (
                      <div
                        key={msg.id}
                        style={{
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '10px',
                          padding: '10px',
                          fontSize: '12px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '10px', marginBottom: '4px' }}>
                          <span>Gửi tới: <b>{msg.phoneNumber}</b></span>
                          <span>{new Date(msg.sentAt).toLocaleTimeString()}</span>
                        </div>
                        <div style={{ color: '#0f172a', lineHeight: 1.4, fontWeight: 500 }}>{msg.content}</div>

                        {foundOtp && (
                          <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => {
                                setOtpDigits(foundOtp.split(''));
                                setSmsDrawerOpen(false);
                              }}
                              style={{
                                background: '#0284c7',
                                border: 'none',
                                color: '#fff',
                                borderRadius: '6px',
                                padding: '5px 10px',
                                fontSize: '11px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                boxShadow: '0 2px 4px rgba(2, 132, 199, 0.25)',
                              }}
                            >
                              <Copy size={11} /> Điền mã OTP {foundOtp}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
