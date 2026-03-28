import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';

export default function IndicesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">가격지수</h1>
        <p className="text-muted-foreground">한국부동산원 매매·전세 가격지수로 시장 흐름을 파악합니다.</p>
      </div>
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center gap-2 py-12">
          <TrendingUp className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium">준비 중입니다</p>
          <p className="text-xs text-muted-foreground">한국부동산원 API 연동 후 가격지수 차트가 표시됩니다.</p>
        </CardContent>
      </Card>
    </div>
  );
}
