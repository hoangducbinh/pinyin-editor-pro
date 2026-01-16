import type React from "react"
import type { Metadata } from "next"
import { Geist } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

const geist = Geist({ subsets: ["latin"] })


export const metadata: Metadata = {
  title: "Pinyin editor pro",
  description: "Trình soạn thảo văn bản với hỗ trợ dấu Pinyin, xuất Word và PDF",
  generator: "hoangducbinh.prod",
  icons: {
    icon: [
      {
        url: "/icopinyin.svg",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icopinyin.svg",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icopinyin.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/icopinyin.svg",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="vi">
      <body className={`${geist.className} font-sans antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
