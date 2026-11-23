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
    <div style={{ minHeight: '100vh', background: '#f8fafc', color: '#0f172a', padding: '28px 16px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a' }}>
              <Database color="#0284c7" />
              SQL Tra Cứu Dữ Liệu (Học viên)
            </h1>
            <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
              Truy vấn cơ sở dữ liệu môi trường SIT dành cho Buổi 2 • Chỉ cho phép lệnh <code>SELECT</code> trên schema <code>learner</code>
            </p>
          </div>
          <div>
            <span
              style={{
                fontSize: '12px',
                padding: '5px 12px',
                background: '#ffffff',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                color: '#0284c7',
                fontWeight: 700,
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
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
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#334155',
                borderRadius: '8px',
                padding: '7px 12px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
              }}
            >
              {q.label}
            </button>
          ))}
        </div>

        {/* Editor Box */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '18px',
            marginBottom: '18px',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.04)',
          }}
        >
          <textarea
            rows={4}
            value={sql}
            onChange={(e) => setSql(e.target.value)}
            placeholder="SELECT * FROM customers WHERE cif_number = '88001001';"
            style={{
              width: '100%',
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '10px',
              padding: '12px 14px',
              fontFamily: 'Consolas, Monaco, monospace',
              fontSize: '14px',
              color: '#0f172a',
              outline: 'none',
              resize: 'vertical',
              fontWeight: 600,
            }}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
            <div style={{ fontSize: '12px', color: '#64748b' }}>
              Quy tắc bảo mật: Timeout 3 giây • Tối đa 200 dòng • Tự động lọc theo sandbox của bạn • Không xem được hash mật khẩu
            </div>
            <button
              onClick={handleRunQuery}
              disabled={loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 18px',
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '13px',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 4px rgba(2, 132, 199, 0.25)',
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
              background: '#fff1f2',
              border: '1px solid #fecdd3',
              borderRadius: '10px',
              padding: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              color: '#be123c',
              fontSize: '13px',
              fontWeight: 600,
              marginBottom: '16px',
            }}
          >
            <AlertCircle size={18} color="#e11d48" />
            <span>{error}</span>
          </div>
        )}

        {/* Result table */}
        {result && (
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              overflow: 'hidden',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.04)',
            }}
          >
            <div
              style={{
                padding: '12px 18px',
                background: '#f8fafc',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '12px',
                color: '#64748b',
                fontWeight: 600,
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Table size={14} color="#0284c7" />
                Kết quả: <b style={{ color: '#0f172a' }}>{result.rowCount} dòng</b>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={14} />
                Thời gian: <b style={{ color: '#0f172a' }}>{result.durationMs} ms</b>
              </span>
            </div>

            <div style={{ overflowX: 'auto', maxHeight: '450px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                    {result.columns.map((col: string, idx: number) => (
                      <th
                        key={idx}
                        style={{
                          padding: '10px 14px',
                          textAlign: 'left',
                          color: '#0f172a',
                          fontWeight: 700,
                          fontSize: '12px',
                          borderRight: '1px solid #e2e8f0',
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
                          borderBottom: '1px solid #f1f5f9',
                          background: rIdx % 2 === 0 ? '#ffffff' : '#f8fafc',
                        }}
                      >
                        {result.columns.map((col: string, cIdx: number) => (
                          <td
                            key={cIdx}
                            style={{
                              padding: '9px 14px',
                              color: '#334155',
                              fontSize: '12px',
                              borderRight: '1px solid #f1f5f9',
                              whiteSpace: 'nowrap',
                              fontWeight: 500,
                            }}
                          >
                            {row[col] !== null && row[col] !== undefined ? String(row[col]) : (
                              <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>NULL</span>
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
