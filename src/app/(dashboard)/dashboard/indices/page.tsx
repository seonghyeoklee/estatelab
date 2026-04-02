import { Card, CardContent } from '@/components/ui/card';
import { ExternalLink, BarChart3, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

const USEFUL_LINKS = [
  {
    title: '한국부동산원 통계',
    desc: '매매/전세 가격지수, 거래량 통계',
    url: 'https://www.reb.or.kr/r-one/statistics.do',
    color: 'bg-emerald-500/10 text-emerald-600',
  },
  {
    title: 'KB부동산 시세',
    desc: 'KB국민은행 주간 아파트 시세',
    url: 'https://kbland.kr',
    color: 'bg-blue-500/10 text-blue-600',
  },
  {
    title: '서울부동산정보광장',
    desc: '서울시 부동산 실거래가 및 통계',
    url: 'https://land.seoul.go.kr',
    color: 'bg-violet-500/10 text-violet-600',
  },
  {
    title: '한국은행 경제통계',
    desc: '기준금리, 주택담보대출 금리 추이',
    url: 'https://ecos.bok.or.kr',
    color: 'bg-amber-500/10 text-amber-600',
  },
];

export default function IndicesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">가격지수</h1>
        <p className="text-muted-foreground">한국부동산원 매매·전세 가격지수로 시장 흐름을 파악합니다.</p>
      </div>

      {/* 준비 중 안내 */}
      <Card className="border-dashed border-primary/30 bg-primary/[0.02]">
        <CardContent className="flex items-start gap-4 py-6">
          <div className="rounded-xl bg-primary/10 p-3">
            <BarChart3 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-[15px] font-semibold">가격지수 차트 준비 중</h2>
            <p className="text-[13px] text-muted-foreground mt-1">
              한국부동산원 API 연동 작업을 진행하고 있습니다.
              연동이 완료되면 지역별 매매/전세 가격지수 추이를 차트로 확인할 수 있습니다.
            </p>
            <div className="flex items-center gap-2 mt-3">
              <Link
                href="/dashboard/overview"
                className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-[12px] font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                시장 개요 보기
                <ArrowUpRight className="h-3 w-3" />
              </Link>
              <Link
                href="/dashboard/rates"
                className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-[12px] font-medium hover:bg-accent transition-colors"
              >
                금리 동향 보기
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 관련 외부 사이트 */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">관련 통계 사이트</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {USEFUL_LINKS.map((link) => (
            <a
              key={link.title}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group"
            >
              <Card className="hover:shadow-md transition-all h-full">
                <CardContent className="p-4 flex items-start gap-3">
                  <div className={`rounded-lg p-2 ${link.color.split(' ')[0]}`}>
                    <ExternalLink className={`h-4 w-4 ${link.color.split(' ')[1]}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold group-hover:text-primary transition-colors">
                      {link.title}
                    </p>
                    <p className="text-[12px] text-muted-foreground mt-0.5">{link.desc}</p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </CardContent>
              </Card>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
