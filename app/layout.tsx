import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tavitax Portal | Cổng quản trị nội bộ",
  description: "Hệ thống quản trị nội bộ Tavitax - Quản lý công việc, CRM, tài liệu và giao tiếp nhóm.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className="h-full antialiased"
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
