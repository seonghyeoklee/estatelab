import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendTelegramMessage } from '@/lib/telegram';
import { env } from '@/lib/env';
import { formatPrice } from '@/lib/format';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * POST /api/cron/watchlist-alert
 * 관심 단지에 최근 24시간 내 신규 거래가 있으면 텔레그램 알림
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = env('CRON_SECRET');
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const since = new Date();
    since.setHours(since.getHours() - 24);

    // 관심 단지 목록
    const watchlist = await prisma.userWatchlist.findMany({
      select: {
        complexId: true,
        complex: {
          select: {
            name: true,
            dong: true,
            region: { select: { sigungu: true } },
          },
        },
      },
    });

    if (watchlist.length === 0) {
      return NextResponse.json({ data: { sent: false, reason: '관심 단지 없음' } });
    }

    const complexIds = [...new Set(watchlist.map((w) => w.complexId))];

    // 최근 24시간 거래
    const newTrades = await prisma.apartmentTrade.findMany({
      where: {
        complexId: { in: complexIds },
        createdAt: { gte: since },
      },
      include: {
        complex: {
          select: {
            name: true,
            dong: true,
            region: { select: { sigungu: true } },
          },
        },
      },
      orderBy: { dealDate: 'desc' },
    });

    if (newTrades.length === 0) {
      return NextResponse.json({ data: { sent: false, reason: '신규 거래 없음' } });
    }

    // 메시지 구성
    const lines: string[] = [];
    lines.push('⭐ <b>관심 단지 신규 거래</b>\n');

    // 단지별 그룹핑
    const byComplex = new Map<string, typeof newTrades>();
    for (const trade of newTrades) {
      const arr = byComplex.get(trade.complexId) || [];
      arr.push(trade);
      byComplex.set(trade.complexId, arr);
    }

    for (const [, trades] of byComplex) {
      const c = trades[0].complex;
      lines.push(`<b>${c.name}</b> (${c.region.sigungu} ${c.dong})`);
      for (const t of trades.slice(0, 3)) {
        lines.push(`  · ${formatPrice(t.price)} / ${t.area}㎡ / ${t.floor}층 / ${t.dealDate.toISOString().slice(0, 10)}`);
      }
      if (trades.length > 3) {
        lines.push(`  · ... 외 ${trades.length - 3}건`);
      }
      lines.push('');
    }

    lines.push(`🔗 <a href="https://estatelab.vercel.app/dashboard/my">관심 단지 보기</a>`);

    const sent = await sendTelegramMessage(lines.join('\n'));

    await prisma.alert.create({
      data: {
        type: 'WATCHLIST_TRADE',
        title: `관심 단지 신규 거래 ${newTrades.length}건`,
        message: sent ? '전송 성공' : '전송 실패',
        metadata: { tradeCount: newTrades.length, complexCount: byComplex.size },
        sentAt: sent ? new Date() : null,
      },
    });

    return NextResponse.json({
      data: { sent, tradeCount: newTrades.length, complexCount: byComplex.size },
    });
  } catch (error) {
    console.error('관심 단지 알림 오류:', error);
    return NextResponse.json({ error: '알림 처리 실패' }, { status: 500 });
  }
}
