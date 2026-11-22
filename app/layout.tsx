import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'NeoBank Digital Banking — Mở tài khoản trực tuyến (eKYC)',
  description: 'Hệ thống giả lập mở tài khoản và định danh eKYC phục vụ khóa đào tạo Banking Tester',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
