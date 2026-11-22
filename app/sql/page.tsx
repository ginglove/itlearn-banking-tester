'use client';

import React, { useState, useEffect } from 'react';
import { Database, Play, AlertCircle, Clock, Table, CheckCircle2 } from 'lucide-react';

export default function SqlPlaygroundPage() {
  const [sandboxId, setSandboxId] = useState<string>('DEMO01');
  const [sql, setSql] = useState<string>('SELECT * FROM customers;');
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const match = document.cookie.match(/(?:^|;\s*)sbx=([^;]+)/);
      if (match && match[1]) {
        setSandboxId(decodeURIComponent(match[1]));
      }
    }
  }, []);

  const handleRunQuery = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/v1/sql/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Sandbox-Id': sandboxId,
        },
        body: JSON.stringify({ sql }),
      });

      const data = await res.json();
      if (!res.ok || data.responseCode !== '00') {
        setError(data.message || 'Lỗi thực thi truy vấn');
      } else {
        setResult(data.data);
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi mạng khi kết nối cơ sở dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const sampleQueries = [
    { label: 'Khách hàng (customers)', query: 'SELECT * FROM customers;' },
    { label: 'Tài khoản (accounts)', query: 'SELECT * FROM accounts;' },
    { label: 'Phiên eKYC (onboarding_sessions)', query: 'SELECT id, phone_number, status, face_score, cif_number, created_at FROM onboarding_sessions;' },
    { label: 'Hộp thư SMS (sms_outbox)', query: 'SELECT * FROM sms_outbox ORDER BY sent_at DESC;' },
    { label: 'Nhật ký API (api_logs)', query: 'SELECT request_id, method, path, status, at FROM api_logs ORDER BY at DESC;' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#090d16', color: '#f8fafc', padding: '24px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Database color="#38bdf8" />
              SQL Tra Cứu Dữ Liệu (Học viên)
            </h1>
            <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
              Truy vấn cơ sở dữ liệu môi trường SIT dành cho Buổi 2 • Chỉ cho phép lệnh <code>SELECT</code> trên schema <code>learner</code>
            </p>
          </div>
          <div>
            <span
              style={{
                fontSize: '12px',
                padding: '4px 10px',
                background: '#1e293b',
                borderRadius: '6px',
                border: '1px solid #334155',
                color: '#38bdf8',
                fontWeight: 600,
              }}
            >
              Sandbox: {sandboxId}
            </span>
          </div>
        </div>

        {/* Quick Sample Buttons */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
          {sampleQueries.map((q, idx) => (
            <button
              key={idx}
              onClick={() => setSql(q.query)}
              style={{
                background: '#1e293b',
                border: '1px solid #334155',
                color: '#cbd5e1',
                borderRadius: '6px',
                padding: '6px 10px',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              {q.label}
            </button>
          ))}
        </div>

        {/* Editor Box */}
        <div
          style={{
            background: '#0f172a',
            border: '1px solid #334155',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '16px',
          }}
        >
          <textarea
            rows={4}
            value={sql}
            onChange={(e) => setSql(e.target.value)}
            placeholder="SELECT * FROM customers WHERE cif_number = '88001001';"
            style={{
              width: '100%',
              background: '#020617',
              border: '1px solid #1e293b',
              borderRadius: '8px',
              padding: '12px',
              fontFamily: 'monospace',
              fontSize: '14px',
              color: '#38bdf8',
              outline: 'none',
              resize: 'vertical',
            }}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
            <div style={{ fontSize: '11px', color: '#64748b' }}>
              Quy tắc bảo mật: Timeout 3 giây • Tối đa 200 dòng • Tự động lọc theo sandbox của bạn • Không xem được hash mật khẩu
            </div>
            <button
              onClick={handleRunQuery}
              disabled={loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                background: '#0284c7',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '13px',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              <Play size={14} />
              {loading ? 'Đang thực thi...' : 'Chạy truy vấn'}
            </button>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid #ef4444',
              borderRadius: '8px',
              padding: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#fca5a5',
              fontSize: '13px',
              marginBottom: '16px',
            }}
          >
            <AlertCircle size={18} color="#ef4444" />
            <span>{error}</span>
          </div>
        )}

        {/* Result table */}
        {result && (
          <div
            style={{
              background: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '12px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '12px 16px',
                background: '#1e293b',
                borderBottom: '1px solid #334155',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '12px',
                color: '#94a3b8',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Table size={14} color="#38bdf8" />
                Kết quả: <b>{result.rowCount} dòng</b>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={14} />
                Thời gian: <b>{result.durationMs} ms</b>
              </span>
            </div>

            <div style={{ overflowX: 'auto', maxHeight: '450px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#020617', borderBottom: '1px solid #334155' }}>
                    {result.columns.map((col: string, idx: number) => (
                      <th
                        key={idx}
                        style={{
                          padding: '10px 14px',
                          textAlign: 'left',
                          color: '#38bdf8',
                          fontWeight: 600,
                          fontSize: '12px',
                          borderRight: '1px solid #1e293b',
                        }}
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={result.columns.length}
                        style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}
                      >
                        Không có dữ liệu thỏa mãn điều kiện.
                      </td>
                    </tr>
                  ) : (
                    result.rows.map((row: any, rIdx: number) => (
                      <tr
                        key={rIdx}
                        style={{
                          borderBottom: '1px solid #1e293b',
                          background: rIdx % 2 === 0 ? '#0f172a' : '#0b1329',
                        }}
                      >
                        {result.columns.map((col: string, cIdx: number) => (
                          <td
                            key={cIdx}
                            style={{
                              padding: '8px 14px',
                              color: '#cbd5e1',
                              fontSize: '12px',
                              borderRight: '1px solid #1e293b',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {row[col] !== null && row[col] !== undefined ? String(row[col]) : (
                              <span style={{ color: '#475569' }}>NULL</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
