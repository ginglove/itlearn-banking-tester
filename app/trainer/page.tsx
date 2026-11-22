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
          background: '#030712',
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
            background: '#0f172a',
            border: '1px solid #334155',
            borderRadius: '16px',
            padding: '28px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'rgba(2, 132, 199, 0.2)',
              border: '1px solid #0284c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <Lock size={28} color="#38bdf8" />
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#f8fafc', marginBottom: '6px' }}>
            Trainer Control Panel
          </h2>
          <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '20px' }}>
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
                background: '#020617',
                border: '1px solid #334155',
                borderRadius: '8px',
                color: '#f8fafc',
                fontSize: '16px',
                textAlign: 'center',
                letterSpacing: '4px',
                outline: 'none',
              }}
              autoFocus
              required
            />

            {loginError && (
              <div style={{ color: '#f43f5e', fontSize: '12px', textAlign: 'center' }}>
                {loginError}
              </div>
            )}

            <button
              type="submit"
              style={{
                padding: '12px',
                borderRadius: '8px',
                background: '#0284c7',
                color: '#fff',
                fontWeight: 700,
                fontSize: '14px',
                border: 'none',
                cursor: 'pointer',
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
    <div style={{ minHeight: '100vh', background: '#090d16', color: '#f8fafc', padding: '24px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Toast notification */}
        {notification && (
          <div
            style={{
              position: 'fixed',
              top: '20px',
              right: '20px',
              background: '#065f46',
              border: '1px solid #10b981',
              color: '#d1fae5',
              padding: '10px 18px',
              borderRadius: '8px',
              fontSize: '13px',
              zIndex: 100,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)',
            }}
          >
            <CheckCircle2 size={16} />
            {notification}
          </div>
        )}

        {/* Top Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldAlert color="#38bdf8" />
              NeoBank Trainer Management Panel
            </h1>
            <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
              Quản trị sandbox học viên • Chuyển đổi Profile • Đổi ngày hệ thống • Giả lập mạng
            </p>
          </div>
          <button
            onClick={() => setIsAuthenticated(false)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '6px',
              color: '#94a3b8',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            <LogOut size={13} /> Đăng xuất
          </button>
        </div>

        {/* Sandbox Selector Bar */}
        <div
          style={{
            background: '#0f172a',
            border: '1px solid #334155',
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8' }}>Chọn Sandbox:</span>
            <select
              value={selectedSandboxId}
              onChange={(e) => setSelectedSandboxId(e.target.value)}
              style={{
                padding: '8px 14px',
                background: '#1e293b',
                border: '1px solid #475569',
                borderRadius: '8px',
                color: '#f8fafc',
                fontSize: '14px',
                fontWeight: 600,
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
                padding: '6px 12px',
                background: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '6px',
                color: '#38bdf8',
                fontSize: '12px',
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
              padding: '8px 14px',
              background: '#0284c7',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Plus size={14} /> Tạo Sandbox Mới
          </button>
        </div>

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid #1e293b', paddingBottom: '8px' }}>
          <button
            onClick={() => setActiveTab('settings')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px',
              background: activeTab === 'settings' ? '#0284c7' : 'transparent',
              color: activeTab === 'settings' ? '#fff' : '#94a3b8',
              border: 'none',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
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
              background: activeTab === 'tables' ? '#0284c7' : 'transparent',
              color: activeTab === 'tables' ? '#fff' : '#94a3b8',
              border: 'none',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
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
              background: activeTab === 'logs' ? '#0284c7' : 'transparent',
              color: activeTab === 'logs' ? '#fff' : '#94a3b8',
              border: 'none',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
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
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '16px',
                padding: '20px',
              }}
            >
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#f8fafc', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <RotateCcw size={18} color="#38bdf8" />
                Khôi phục Dữ liệu Sandbox
              </h3>
              <p style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.5, marginBottom: '16px' }}>
                Xóa các hồ sơ tạm, mở lại các số điện thoại bị khóa và nạp lại 3 khách hàng mẫu (1 khách hàng sở hữu SĐT 0911111111, 1 khách hàng sở hữu CCCD 001090000003). Thời gian thực thi &lt; 3 giây.
              </p>
              <button
                onClick={handleResetSandbox}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  background: '#f43f5e',
                  color: '#fff',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? 'Đang khôi phục...' : `Reset Dữ liệu Sandbox ${selectedSandboxId}`}
              </button>
            </div>

            {/* Box 2: Profile Switcher */}
            <div
              style={{
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '16px',
                padding: '20px',
              }}
            >
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#f8fafc', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sliders size={18} color="#10b981" />
                Chế độ Hoạt động (Profile)
              </h3>
              <p style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.5, marginBottom: '16px' }}>
                Chuyển đổi giữa chế độ đào tạo (chứa 13 hành vi lỗi để học viên tìm) và chế độ chuẩn ngân hàng.
              </p>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => handleSwitchProfile('training')}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '8px',
                    background: currentSettings.profile === 'training' ? '#0284c7' : '#1e293b',
                    border: currentSettings.profile === 'training' ? '2px solid #38bdf8' : '1px solid #334155',
                    color: currentSettings.profile === 'training' ? '#fff' : '#94a3b8',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Training
                </button>
                <button
                  onClick={() => handleSwitchProfile('reference')}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '8px',
                    background: currentSettings.profile === 'reference' ? '#10b981' : '#1e293b',
                    border: currentSettings.profile === 'reference' ? '2px solid #34d399' : '1px solid #334155',
                    color: currentSettings.profile === 'reference' ? '#fff' : '#94a3b8',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Reference
                </button>
              </div>
            </div>

            {/* Box 3: Simulated Date */}
            <div
              style={{
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '16px',
                padding: '20px',
              }}
            >
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#f8fafc', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={18} color="#f59e0b" />
                Ngày Hệ Thống Giả Lập
              </h3>
              <p style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.5, marginBottom: '16px' }}>
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
                    background: '#020617',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                />
                <button
                  onClick={() => handleUpdateDate('2026-11-23')}
                  style={{
                    padding: '10px 14px',
                    background: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#94a3b8',
                    fontSize: '12px',
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
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '16px',
                padding: '20px',
              }}
            >
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#f8fafc', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Wifi size={18} color="#c084fc" />
                Giả Lập Ngoại Lệ Mạng &amp; Core
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px', cursor: 'pointer' }}>
                  <div>
                    <div style={{ color: '#cbd5e1', fontWeight: 600 }}>Mất kết nối sau khi Core commit (6A / D06)</div>
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
                    <div style={{ color: '#cbd5e1', fontWeight: 600 }}>Core Banking ngừng phản hồi (EKYC-99)</div>
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
                    padding: '6px 12px',
                    borderRadius: '6px',
                    background: selectedTable === tName ? '#0284c7' : '#1e293b',
                    color: selectedTable === tName ? '#fff' : '#cbd5e1',
                    border: '1px solid #334155',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  {tName}
                </button>
              ))}
            </div>

            <div
              style={{
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '12px',
                overflow: 'hidden',
              }}
            >
              <div style={{ padding: '12px 16px', background: '#1e293b', borderBottom: '1px solid #334155', fontSize: '12px', color: '#94a3b8' }}>
                Bảng: <b>{selectedTable}</b> • Tổng số bản ghi trong sandbox: <b>{tableData.length}</b>
              </div>
              <div style={{ overflowX: 'auto', maxHeight: '500px' }}>
                <pre style={{ padding: '16px', fontSize: '12px', color: '#38bdf8', lineHeight: 1.5, margin: 0 }}>
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
                  padding: '6px 12px',
                  background: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  color: '#94a3b8',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                <RefreshCw size={12} /> Làm mới nhật ký
              </button>
            </div>

            <div
              style={{
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '12px',
                overflow: 'hidden',
              }}
            >
              <div style={{ overflowX: 'auto', maxHeight: '550px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ background: '#020617', borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                      <th style={{ padding: '10px 14px', textAlign: 'left' }}>Thời gian</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left' }}>Method</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left' }}>Path</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left' }}>Status</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left' }}>Request ID</th>
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
                      logsData.map((l: any) => (
                        <tr key={l.id} style={{ borderBottom: '1px solid #1e293b' }}>
                          <td style={{ padding: '8px 14px', color: '#64748b', whiteSpace: 'nowrap' }}>
                            {new Date(l.at).toLocaleTimeString()}
                          </td>
                          <td style={{ padding: '8px 14px', fontWeight: 700, color: l.method === 'POST' ? '#38bdf8' : '#10b981' }}>
                            {l.method}
                          </td>
                          <td style={{ padding: '8px 14px', color: '#cbd5e1' }}>{l.path}</td>
                          <td style={{ padding: '8px 14px', fontWeight: 700, color: l.status >= 400 ? '#f43f5e' : '#10b981' }}>
                            {l.status}
                          </td>
                          <td style={{ padding: '8px 14px', color: '#94a3b8', fontFamily: 'monospace' }}>
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
              background: 'rgba(3, 7, 18, 0.8)',
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
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '16px',
                padding: '24px',
              }}
            >
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc', marginBottom: '14px' }}>
                Tạo Sandbox Học Viên Mới
              </h3>
              <form onSubmit={handleCreateSandbox} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '4px' }}>
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
                      background: '#020617',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#f8fafc',
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '4px' }}>
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
                      background: '#020617',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#38bdf8',
                      fontSize: '14px',
                      fontWeight: 700,
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
                      background: '#1e293b',
                      color: '#94a3b8',
                      border: '1px solid #334155',
                      borderRadius: '6px',
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    style={{
                      padding: '8px 16px',
                      background: '#0284c7',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      fontWeight: 600,
                      fontSize: '13px',
                      cursor: 'pointer',
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
