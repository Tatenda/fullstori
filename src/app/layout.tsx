import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Madlanga - Interactive Network Visualization",
  description: "Interactive DAG visualization tool for mapping relationships in investigative journalism",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Toaster 
          position="top-right"
          containerStyle={{
            top: 80, // Position below header
          }}
          gutter={8}
          reverseOrder={false}
          toastOptions={{
            duration: 3000,
            style: {
              background: '#fff',
              color: '#1e293b',
              borderRadius: '8px',
              padding: '12px 16px',
              paddingRight: '44px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              border: '1px solid #e2e8f0',
              fontSize: '14px',
              maxWidth: '400px',
            },
            success: {
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
              },
              duration: 2500,
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
              duration: 4000,
            },
            className: 'toast-notification',
          }}
        />
      </body>
    </html>
  );
}
