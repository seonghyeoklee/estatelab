import { Card, CardContent } from '@/components/ui/card';
import { CalendarDays } from 'lucide-react';

export default function SubscriptionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">청약 정보</h1>
        <p className="text-muted-foreground">분양 일정, 청약 경쟁률, 당첨 정보를 확인합니다.</p>
      </div>
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center gap-2 py-12">
          <CalendarDays className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium">준비 중입니다</p>
          <p className="text-xs text-muted-foreground">청약홈 API 연동 후 청약 일정이 표시됩니다.</p>
        </CardContent>
      </Card>
    </div>
  );
}
