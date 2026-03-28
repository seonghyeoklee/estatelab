'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Trade {
  id: string;
  dealDate: string;
  area: number;
  floor: number;
  price: number;
  pricePerPyeong: number | null;
  dealType: string | null;
}

interface TradeTableProps {
  trades: Trade[];
}

export function TradeTable({ trades }: TradeTableProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">거래 내역</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 font-medium">거래일</th>
                <th className="pb-2 font-medium">면적</th>
                <th className="pb-2 font-medium">층</th>
                <th className="pb-2 font-medium text-right">거래가</th>
                <th className="pb-2 font-medium text-right">평당가</th>
                <th className="pb-2 font-medium">유형</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((trade) => (
                <tr key={trade.id} className="border-b last:border-0 hover:bg-accent/50 transition-colors">
                  <td className="py-2 text-muted-foreground">
                    {trade.dealDate.slice(0, 10)}
                  </td>
                  <td className="py-2">{trade.area}㎡</td>
                  <td className="py-2">{trade.floor}층</td>
                  <td className="py-2 text-right font-semibold text-primary">
                    {(trade.price / 10000).toFixed(1)}억
                  </td>
                  <td className="py-2 text-right text-muted-foreground">
                    {trade.pricePerPyeong ? `${trade.pricePerPyeong.toLocaleString()}만` : '—'}
                  </td>
                  <td className="py-2">
                    {trade.dealType && (
                      <Badge variant="outline" className="text-[10px]">
                        {trade.dealType}
                      </Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
