'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  RotateCcw,
  Sliders,
  Calendar,
  Wifi,
  Database,
  List,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Copy,
  Lock,
  LogOut,
  RefreshCw,
} from 'lucide-react';

export default function TrainerPanel() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState<string>('');
  const [loginError, setLoginError] = useState<string | null>(null);

  // Sandboxes list & selected sandbox
  const [sandboxes, setSandboxes] = useState<any[]>([]);
  const [selectedSandboxId, setSelectedSandboxId] = useState<string>('DEMO01');
  const [loading, setLoading] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);

  // New sandbox form modal
  const [showNewModal, setShowNewModal] = useState<boolean>(false);
  const [newName, setNewName] = useState<string>('');
  const [newCode, setNewCode] = useState<string>('');

  // Table viewer state
  const [activeTab, setActiveTab] = useState<'settings' | 'tables' | 'logs'>('settings');
  const [selectedTable, setSelectedTable] = useState<string>('customers');
  const [tableData, setTableData] = useState<any[]>([]);
  const [logsData, setLogsData] = useState<any[]>([]);

  // Selected sandbox settings
  const currentSandbox = sandboxes.find((s) => s.id === selectedSandboxId) || sandboxes[0];
  const currentSettings = currentSandbox?.settings || {
    profile: 'training',
    today: '2026-11-23',
    dropAfterCoreCommit: false,
    coreDown: false,
  };

  const notify = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    try {
      const res = await fetch('/api/trainer/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinInput }),
      });
      const data = await res.json();
      if (res.ok) {
        setIsAuthenticated(true);
        loadSandboxes();
      } else {
        setLoginError(data.message || 'Mã PIN không đúng');
      }
    } catch {
      setLoginError('Lỗi kết nối máy chủ');
    }
  };

  const loadSandboxes = async () => {
    try {
      const res = await fetch('/api/trainer/sandboxes');
      if (res.ok) {
        const data = await res.json();
        setSandboxes(data.sandboxes || []);
        if (data.sandboxes?.length > 0 && !selectedSandboxId) {
          setSelectedSandboxId(data.sandboxes[0].id);
        }
      } else if (res.status === 401) {
        setIsAuthenticated(false);
      }
    } catch {}
  };

  useEffect(() => {
    loadSandboxes();
  }, []);

  const handleCreateSandbox = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/trainer/sandboxes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, code: newCode }),
      });
      const data = await res.json();
      if (res.ok) {
        notify(`Đã tạo sandbox ${newCode} thành công`);
        setShowNewModal(false);
        setNewName('');
        setNewCode('');
        loadSandboxes();
        setSelectedSandboxId(data.sandbox.id);
      } else {
        alert(data.message || 'Lỗi tạo sandbox');
      }
    } catch {
      alert('Lỗi mạng khi tạo sandbox');
    }
  };

  const handleResetSandbox = async () => {
    if (!confirm(`Bạn có chắc muốn khôi phục dữ liệu gốc cho sandbox ${selectedSandboxId}?`)) return;
    setLoading(true);
    try {
      const res = await fetch('/api/trainer/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sandboxId: selectedSandboxId }),
      });
      const data = await res.json();
      if (res.ok) {
        notify(`Khôi phục thành công (${data.durationMs}ms)`);
        loadSandboxes();
        if (activeTab === 'tables') loadTableData(selectedTable);
        if (activeTab === 'logs') loadLogs();
      } else {
        alert(data.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchProfile = async (profile: 'training' | 'reference') => {
    try {
      const res = await fetch('/api/trainer/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sandboxId: selectedSandboxId, profile }),
      });
      if (res.ok) {
        notify(`Đã chuyển profile sang "${profile}"`);
        loadSandboxes();
      }
    } catch {}
  };

  const handleUpdateDate = async (newDate: string) => {
    try {
      const res = await fetch('/api/trainer/clock', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sandboxId: selectedSandboxId, today: newDate }),
      });
      if (res.ok) {
        notify(`Đã đổi ngày hệ thống thành ${newDate}`);
        loadSandboxes();
      }
    } catch {}
  };

  const handleToggleNetwork = async (key: 'dropAfterCoreCommit' | 'coreDown', value: boolean) => {
    try {
      const res = await fetch('/api/trainer/network', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sandboxId: selectedSandboxId, [key]: value }),
      });
      if (res.ok) {
        notify(`Đã cập nhật ${key} = ${value}`);
        loadSandboxes();
      }
    } catch {}
  };

  const loadTableData = async (tblName: string) => {
    setSelectedTable(tblName);
    try {
      const res = await fetch(`/api/trainer/tables/${tblName}?sandboxId=${selectedSandboxId}`);
      if (res.ok) {
        const data = await res.json();
        setTableData(data.rows || []);
      }
    } catch {}
  };

  const loadLogs = async () => {
    try {
      const res = await fetch(`/api/trainer/logs?sandboxId=${selectedSandboxId}&limit=100`);
      if (res.ok) {
        const data = await res.json();
        setLogsData(data.logs || []);
      }
    } catch {}
  };

  useEffect(() => {
    if (activeTab === 'tables') {
      loadTableData(selectedTable);
    } else if (activeTab === 'logs') {
      loadLogs();
    }
  }, [activeTab, selectedSandboxId]);

  if (!isAuthenticated) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#f8fafc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
        }}
      >
        <div
          style={{
            maxWidth: '380px',
            width: '100%',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '20px',
            padding: '32px 24px',
            textAlign: 'center',
            boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.08)',
          }}
        >
          <div
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '16px',
              background: '#f0f9ff',
              border: '1px solid #bae6fd',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <Lock size={28} color="#0284c7" />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>
            Trainer Control Panel
          </h2>
          <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '22px' }}>
            Nhập mã PIN giảng viên để quản lý sandbox học viên và điều khiển giả lập
          </p>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <input
              type="password"
              placeholder="Nhập mã PIN..."
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                color: '#0f172a',
                fontSize: '18px',
                textAlign: 'center',
                letterSpacing: '6px',
                outline: 'none',
                fontWeight: 700,
              }}
              autoFocus
              required
            />

            {loginError && (
              <div style={{ color: '#e11d48', fontSize: '12px', textAlign: 'center', fontWeight: 600 }}>
                {loginError}
              </div>
            )}

            <button
              type="submit"
              style={{
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
              Mở khóa Quản trị
            </button>
          </form>
        </div>
      </div>
    );
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', color: '#0f172a', padding: '28px 16px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Toast notification */}
        {notification && (
          <div
            style={{
              position: 'fixed',
              top: '20px',
              right: '20px',
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              color: '#065f46',
              padding: '12px 20px',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: 700,
              zIndex: 100,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 10px 20px -5px rgba(0,0,0,0.1)',
            }}
          >
            <CheckCircle2 size={18} color="#10b981" />
            {notification}
          </div>
        )}

        {/* Top Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a' }}>
              <ShieldAlert color="#0284c7" />
              NeoBank Trainer Management Panel
            </h1>
            <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
              Quản trị sandbox học viên • Chuyển đổi Profile • Đổi ngày hệ thống • Giả lập ngoại lệ mạng
            </p>
          </div>
          <button
            onClick={() => setIsAuthenticated(false)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              color: '#64748b',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            }}
          >
            <LogOut size={14} /> Đăng xuất
          </button>
        </div>

        {/* Sandbox Selector Bar */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#475569' }}>Chọn Sandbox:</span>
            <select
              value={selectedSandboxId}
              onChange={(e) => setSelectedSandboxId(e.target.value)}
              style={{
                padding: '8px 14px',
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                color: '#0f172a',
                fontSize: '14px',
                fontWeight: 700,
                outline: 'none',
              }}
            >
              {sandboxes.map((sb) => (
                <option key={sb.id} value={sb.id}>
                  {sb.name} ({sb.code})
                </option>
              ))}
            </select>

            <button
              onClick={() => {
                const link = `${origin}/?s=${selectedSandboxId}`;
                navigator.clipboard.writeText(link);
                notify(`Đã sao chép link học viên: ${link}`);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 12px',
                background: '#f0f9ff',
                border: '1px solid #bae6fd',
                borderRadius: '8px',
                color: '#0284c7',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <Copy size={13} /> Copy link học viên (?s={selectedSandboxId})
            </button>
          </div>

          <button
            onClick={() => setShowNewModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(2, 132, 199, 0.25)',
            }}
          >
            <Plus size={15} /> Tạo Sandbox Mới
          </button>
        </div>

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
          <button
            onClick={() => setActiveTab('settings')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px',
              background: activeTab === 'settings' ? '#0284c7' : '#ffffff',
              color: activeTab === 'settings' ? '#fff' : '#475569',
              border: activeTab === 'settings' ? 'none' : '1px solid #cbd5e1',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              boxShadow: activeTab === 'settings' ? '0 2px 4px rgba(2, 132, 199, 0.25)' : 'none',
            }}
          >
            <Sliders size={14} /> Điều khiển &amp; Giả lập
          </button>
          <button
            onClick={() => setActiveTab('tables')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px',
              background: activeTab === 'tables' ? '#0284c7' : '#ffffff',
              color: activeTab === 'tables' ? '#fff' : '#475569',
              border: activeTab === 'tables' ? 'none' : '1px solid #cbd5e1',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              boxShadow: activeTab === 'tables' ? '0 2px 4px rgba(2, 132, 199, 0.25)' : 'none',
            }}
          >
            <Database size={14} /> Dữ liệu các Bảng (Table Viewer)
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px',
              background: activeTab === 'logs' ? '#0284c7' : '#ffffff',
              color: activeTab === 'logs' ? '#fff' : '#475569',
              border: activeTab === 'logs' ? 'none' : '1px solid #cbd5e1',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              boxShadow: activeTab === 'logs' ? '0 2px 4px rgba(2, 132, 199, 0.25)' : 'none',
            }}
          >
            <List size={14} /> Nhật ký API (API Logs)
          </button>
        </div>

        {/* TAB 1: Controls & Simulators */}
        {activeTab === 'settings' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
            {/* Box 1: Reset Database */}
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '20px',
                boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
              }}
            >
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <RotateCcw size={18} color="#0284c7" />
                Khôi phục Dữ liệu Sandbox
              </h3>
              <p style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.5, marginBottom: '16px' }}>
                Xóa các hồ sơ tạm, mở lại các số điện thoại bị khóa và nạp lại 3 khách hàng mẫu (1 khách hàng sở hữu SĐT 0911111111, 1 khách hàng sở hữu CCCD 001090000003). Thời gian thực thi &lt; 3 giây.
              </p>
              <button
                onClick={handleResetSandbox}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '10px',
                  background: '#ef4444',
                  color: '#fff',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 6px rgba(239, 68, 68, 0.25)',
                }}
              >
                {loading ? 'Đang khôi phục...' : `Reset Dữ liệu Sandbox ${selectedSandboxId}`}
              </button>
            </div>

            {/* Box 2: Profile Switcher */}
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '20px',
                boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
              }}
            >
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sliders size={18} color="#10b981" />
                Chế độ Hoạt động (Profile)
              </h3>
              <p style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.5, marginBottom: '16px' }}>
                Chuyển đổi giữa chế độ đào tạo (chứa 13 hành vi để học viên phát hiện) và chế độ chuẩn ngân hàng.
              </p>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => handleSwitchProfile('training')}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '10px',
                    background: currentSettings.profile === 'training' ? '#0284c7' : '#f8fafc',
                    border: currentSettings.profile === 'training' ? '2px solid #0284c7' : '1px solid #cbd5e1',
                    color: currentSettings.profile === 'training' ? '#fff' : '#475569',
                    fontWeight: 800,
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Training Mode
                </button>
                <button
                  onClick={() => handleSwitchProfile('reference')}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '10px',
                    background: currentSettings.profile === 'reference' ? '#10b981' : '#f8fafc',
                    border: currentSettings.profile === 'reference' ? '2px solid #10b981' : '1px solid #cbd5e1',
                    color: currentSettings.profile === 'reference' ? '#fff' : '#475569',
                    fontWeight: 800,
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Reference Mode
                </button>
              </div>
            </div>

            {/* Box 3: Simulated Date */}
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '20px',
                boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
              }}
            >
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={18} color="#f59e0b" />
                Ngày Hệ Thống Giả Lập
              </h3>
              <p style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.5, marginBottom: '16px' }}>
                Tác động trực tiếp đến logic tính tuổi (BR-101) và kiểm tra hạn sử dụng CCCD (BR-102) mà không ảnh hưởng OTP 60s.
              </p>

              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="date"
                  value={currentSettings.today}
                  onChange={(e) => handleUpdateDate(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    color: '#0f172a',
                    fontSize: '14px',
                    outline: 'none',
                    fontWeight: 700,
                  }}
                />
                <button
                  onClick={() => handleUpdateDate('2026-11-23')}
                  style={{
                    padding: '10px 14px',
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    color: '#475569',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Mặc định (23/11/2026)
                </button>
              </div>
            </div>

            {/* Box 4: Network & System Toggles */}
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '20px',
                boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
              }}
            >
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Wifi size={18} color="#8b5cf6" />
                Giả Lập Ngoại Lệ Mạng &amp; Core
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px', cursor: 'pointer' }}>
                  <div>
                    <div style={{ color: '#0f172a', fontWeight: 700 }}>Mất kết nối sau khi Core commit (6A / D06)</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Simulate timeout ngay sau khi Core tạo CIF</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={currentSettings.dropAfterCoreCommit}
                    onChange={(e) => handleToggleNetwork('dropAfterCoreCommit', e.target.checked)}
                    style={{ transform: 'scale(1.3)' }}
                  />
                </label>

                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px', cursor: 'pointer' }}>
                  <div>
                    <div style={{ color: '#0f172a', fontWeight: 700 }}>Core Banking ngừng phản hồi (EKYC-99)</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Trả về mã lỗi 500 EKYC-99 ở bước cuối</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={currentSettings.coreDown}
                    onChange={(e) => handleToggleNetwork('coreDown', e.target.checked)}
                    style={{ transform: 'scale(1.3)' }}
                  />
                </label>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Table Viewer */}
        {activeTab === 'tables' && (
          <div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
              {['customers', 'accounts', 'onboarding_sessions', 'sms_outbox', 'phone_locks', 'settings'].map((tName) => (
                <button
                  key={tName}
                  onClick={() => loadTableData(tName)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    background: selectedTable === tName ? '#0284c7' : '#ffffff',
                    color: selectedTable === tName ? '#fff' : '#334155',
                    border: selectedTable === tName ? 'none' : '1px solid #cbd5e1',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                  }}
                >
                  {tName}
                </button>
              ))}
            </div>

            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                overflow: 'hidden',
                boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
              }}
            >
              <div style={{ padding: '12px 18px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
                Bảng: <b style={{ color: '#0f172a' }}>{selectedTable}</b> • Tổng số bản ghi trong sandbox: <b style={{ color: '#0284c7' }}>{tableData.length}</b>
              </div>
              <div style={{ overflowX: 'auto', maxHeight: '500px' }}>
                <pre style={{ padding: '16px', fontSize: '12px', color: '#0284c7', lineHeight: 1.5, margin: 0, fontFamily: 'monospace' }}>
                  {JSON.stringify(tableData, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: API Logs */}
        {activeTab === 'logs' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
              <button
                onClick={loadLogs}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  color: '#475569',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <RefreshCw size={13} /> Làm mới nhật ký
              </button>
            </div>

            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                overflow: 'hidden',
                boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
              }}
            >
              <div style={{ overflowX: 'auto', maxHeight: '550px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', color: '#0f172a' }}>
                      <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700 }}>Thời gian</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700 }}>Method</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700 }}>Path</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700 }}>Status</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700 }}>Request ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logsData.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                          Chưa có nhật ký API trong sandbox này.
                        </td>
                      </tr>
                    ) : (
                      logsData.map((l: any, idx: number) => (
                        <tr key={l.id} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                          <td style={{ padding: '9px 14px', color: '#64748b', whiteSpace: 'nowrap' }}>
                            {new Date(l.at).toLocaleTimeString()}
                          </td>
                          <td style={{ padding: '9px 14px', fontWeight: 800, color: l.method === 'POST' ? '#0284c7' : '#10b981' }}>
                            {l.method}
                          </td>
                          <td style={{ padding: '9px 14px', color: '#334155', fontWeight: 600 }}>{l.path}</td>
                          <td style={{ padding: '9px 14px', fontWeight: 800, color: l.status >= 400 ? '#e11d48' : '#10b981' }}>
                            {l.status}
                          </td>
                          <td style={{ padding: '9px 14px', color: '#64748b', fontFamily: 'monospace' }}>
                            {l.requestId}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Modal: New Sandbox */}
        {showNewModal && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(15, 23, 42, 0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 100,
              padding: '16px',
            }}
          >
            <div
              style={{
                maxWidth: '400px',
                width: '100%',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '18px',
                padding: '24px',
                boxShadow: '0 20px 40px rgba(0,0,0,0.12)',
              }}
            >
              <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', marginBottom: '14px' }}>
                Tạo Sandbox Học Viên Mới
              </h3>
              <form onSubmit={handleCreateSandbox} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#334155', marginBottom: '4px', fontWeight: 700 }}>
                    Tên học viên / nhóm:
                  </label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="VD: Học viên Nguyễn Văn A"
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      color: '#0f172a',
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#334155', marginBottom: '4px', fontWeight: 700 }}>
                    Mã Sandbox (3-10 ký tự chữ và số):
                  </label>
                  <input
                    type="text"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                    placeholder="VD: HVA01"
                    maxLength={10}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      color: '#0284c7',
                      fontSize: '14px',
                      fontWeight: 800,
                      outline: 'none',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setShowNewModal(false)}
                    style={{
                      padding: '8px 14px',
                      background: '#f1f5f9',
                      color: '#475569',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    style={{
                      padding: '8px 16px',
                      background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      fontWeight: 700,
                      fontSize: '13px',
                      cursor: 'pointer',
                      boxShadow: '0 2px 4px rgba(2, 132, 199, 0.25)',
                    }}
                  >
                    Khởi tạo
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
