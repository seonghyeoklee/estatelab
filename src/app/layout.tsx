import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'EstateLab - 부동산 데이터 분석 플랫폼',
    template: '%s | EstateLab',
  },
  description:
    '아파트 실거래가, 전세가, 청약 정보, 금리 동향을 한눈에. AI 기반 부동산 분석과 알림을 제공하는 종합 부동산 인텔리전스 플랫폼.',
  metadataBase: new URL('https://estatelab.dev'),
  alternates: { canonical: './' },
  openGraph: {
    siteName: 'EstateLab',
    locale: 'ko_KR',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
