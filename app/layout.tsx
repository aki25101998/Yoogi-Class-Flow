import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Quản Lý Chấm Công HLV",
  description: "Hệ thống quản lý chấm công và tính lương cho huấn luyện viên",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <head>
        <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Round" rel="stylesheet" />
      </head>
      <body className={inter.className}>
        <div id="app">
          {children}
        </div>
        {/* Next.js equivalent of toast container, we might replace this with a React Toast provider later */}
        <div id="toastContainer" className="toast-container"></div>
      </body>
    </html>
  );
}
