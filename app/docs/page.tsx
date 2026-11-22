'use client';

import dynamic from 'next/dynamic';
import 'swagger-ui-react/swagger-ui.css';

const SwaggerUI = dynamic(() => import('swagger-ui-react'), { ssr: false });

export default function DocsPage() {
  return (
    <div style={{ background: '#fff', minHeight: '100vh', padding: '16px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <header style={{ marginBottom: '24px', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a' }}>
            NeoBank eKYC Onboarding — API Documentation
          </h1>
          <p style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>
            Môi trường kiểm thử SIT • Chuẩn OpenAPI 3.0 • Dành cho học viên khóa Banking Tester
          </p>
        </header>
        <SwaggerUI url="/openapi.yaml" />
      </div>
    </div>
  );
}
