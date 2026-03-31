/**
 * 텔레그램 Bot API 메시지 전송
 */
import { env } from '@/lib/env';

const TELEGRAM_API = 'https://api.telegram.org/bot';

interface SendMessageOptions {
  chatId?: string;
  parseMode?: 'HTML' | 'MarkdownV2';
  disableWebPagePreview?: boolean;
}

/**
 * 텔레그램 메시지를 전송합니다.
 * @returns 성공 여부
 */
export async function sendTelegramMessage(
  text: string,
  options: SendMessageOptions = {}
): Promise<boolean> {
  const token = env('TELEGRAM_BOT_TOKEN');
  const chatId = options.chatId || env('TELEGRAM_CHAT_ID');

  if (!token || !chatId) {
    console.warn('TELEGRAM_BOT_TOKEN 또는 TELEGRAM_CHAT_ID가 설정되지 않았습니다.');
    return false;
  }

  try {
    const res = await fetch(`${TELEGRAM_API}${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: options.parseMode ?? 'HTML',
        disable_web_page_preview: options.disableWebPagePreview ?? true,
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      console.error('텔레그램 전송 실패:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('텔레그램 전송 오류:', error);
    return false;
  }
}

/**
 * 가격을 억/만 단위로 포맷합니다 (HTML 태그 없이).
 */
function fmtPrice(price: number): string {
  if (price >= 100000) return `${(price / 10000).toFixed(0)}억`;
  if (price >= 10000) return `${(price / 10000).toFixed(1)}억`;
  return `${price.toLocaleString()}만`;
}

/**
 * 일일 리포트 메시지를 생성합니다.
 */
export function buildDailyReport(data: {
  date: string;
  totalTrades: number;
  totalRents: number;
  avgPrice: number | null;
  priceUp: { name: string; sigungu: string; changePct: number }[];
  priceDown: { name: string; sigungu: string; changePct: number }[];
  volumeTop: { sigungu: string; count: number; changePct: number }[];
  baseRate: { rate: number; change: number } | null;
}): string {
  const lines: string[] = [];

  lines.push(`📊 <b>EstateLab 일일 리포트</b>`);
  lines.push(`📅 ${data.date}\n`);

  // 거래 현황
  lines.push(`<b>▸ 거래 현황</b>`);
  lines.push(`  매매 ${data.totalTrades.toLocaleString()}건 · 전월세 ${data.totalRents.toLocaleString()}건`);
  if (data.avgPrice) {
    lines.push(`  평균 매매가 ${fmtPrice(data.avgPrice)}`);
  }

  // 기준금리
  if (data.baseRate) {
    const arrow = data.baseRate.change > 0 ? '↑' : data.baseRate.change < 0 ? '↓' : '';
    const changeTxt = data.baseRate.change !== 0 ? ` (${data.baseRate.change > 0 ? '+' : ''}${data.baseRate.change}bp)` : '';
    lines.push(`\n<b>▸ 기준금리</b>`);
    lines.push(`  ${data.baseRate.rate.toFixed(2)}% ${arrow}${changeTxt}`);
  }

  // 급등 단지
  if (data.priceUp.length > 0) {
    lines.push(`\n<b>▸ 가격 상승 TOP</b>`);
    data.priceUp.slice(0, 5).forEach((item, i) => {
      lines.push(`  ${i + 1}. ${item.name} (${item.sigungu}) <b>+${item.changePct}%</b>`);
    });
  }

  // 급락 단지
  if (data.priceDown.length > 0) {
    lines.push(`\n<b>▸ 가격 하락 TOP</b>`);
    data.priceDown.slice(0, 5).forEach((item, i) => {
      lines.push(`  ${i + 1}. ${item.name} (${item.sigungu}) <b>${item.changePct}%</b>`);
    });
  }

  // 거래량 TOP
  if (data.volumeTop.length > 0) {
    lines.push(`\n<b>▸ 거래량 TOP</b>`);
    data.volumeTop.slice(0, 5).forEach((item, i) => {
      const arrow = item.changePct > 0 ? '↑' : item.changePct < 0 ? '↓' : '';
      lines.push(`  ${i + 1}. ${item.sigungu} ${item.count}건 ${arrow}${item.changePct !== 0 ? Math.abs(item.changePct) + '%' : ''}`);
    });
  }

  lines.push(`\n🔗 <a href="https://estatelab.vercel.app/dashboard/overview">자세히 보기</a>`);

  return lines.join('\n');
}
