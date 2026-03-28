import { Card, CardContent } from '@/components/ui/card';
import { Landmark } from 'lucide-react';

export default function RatesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">금리 동향</h1>
        <p className="text-muted-foreground">기준금리, 주담대, CD금리 등 부동산 관련 금리를 추적합니다.</p>
      </div>
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center gap-2 py-12">
          <Landmark className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium">준비 중입니다</p>
          <p className="text-xs text-muted-foreground">한국은행 ECOS API 연동 후 금리 차트가 표시됩니다.</p>
        </CardContent>
      </Card>
    </div>
  );
}
