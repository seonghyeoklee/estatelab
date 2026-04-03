import type { Metadata } from 'next';
import { Card, CardContent } from '@/components/ui/card';

export const metadata: Metadata = { title: '청약 정보' };
import { CalendarDays, ExternalLink, ArrowUpRight, Home, FileText } from 'lucide-react';
import Link from 'next/link';

const USEFUL_LINKS = [
  {
    title: '청약홈',
    desc: '아파트 청약 일정, 당첨 조회, 자격 확인',
    url: 'https://www.applyhome.co.kr',
    color: 'bg-emerald-500/10 text-emerald-600',
    icon: Home,
  },
  {
    title: '분양정보 (부동산114)',
    desc: '전국 분양 예정/진행 단지 정보',
    url: 'https://www.r114.com/z/parcel/parcel.asp',
    color: 'bg-blue-500/10 text-blue-600',
    icon: FileText,
  },
  {
    title: 'SH서울주택도시공사',
    desc: '서울 공공분양, 임대주택 정보',
    url: 'https://www.i-sh.co.kr',
    color: 'bg-violet-500/10 text-violet-600',
    icon: Home,
  },
  {
    title: 'LH 청약센터',
    desc: 'LH 공공분양, 임대 청약 정보',
    url: 'https://apply.lh.or.kr',
    color: 'bg-amber-500/10 text-amber-600',
    icon: FileText,
  },
];

export default function SubscriptionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">청약 정보</h1>
        <p className="text-muted-foreground">분양 일정, 청약 경쟁률, 당첨 정보를 확인합니다.</p>
      </div>

      {/* 준비 중 안내 */}
      <Card className="border-dashed border-primary/30 bg-primary/[0.02]">
        <CardContent className="flex items-start gap-4 py-6">
          <div className="rounded-xl bg-primary/10 p-3">
            <CalendarDays className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-[15px] font-semibold">청약 일정 연동 준비 중</h2>
            <p className="text-[13px] text-muted-foreground mt-1">
              청약홈 API 연동을 준비하고 있습니다.
              연동이 완료되면 분양 일정, 경쟁률, 당첨 정보를 한눈에 확인할 수 있습니다.
            </p>
            <div className="flex items-center gap-2 mt-3">
              <a
                href="https://www.applyhome.co.kr"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-[12px] font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                청약홈 바로가기
                <ExternalLink className="h-3 w-3" />
              </a>
              <Link
                href="/dashboard/apartments"
                className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-[12px] font-medium hover:bg-accent transition-colors"
              >
                아파트 검색
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 관련 사이트 */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">청약 관련 사이트</h2>
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
                    <link.icon className={`h-4 w-4 ${link.color.split(' ')[1]}`} />
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
