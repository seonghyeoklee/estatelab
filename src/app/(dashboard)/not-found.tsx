import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { MapPin } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <MapPin className="h-12 w-12 text-muted-foreground" />
      <h2 className="text-xl font-bold">페이지를 찾을 수 없습니다</h2>
      <p className="text-sm text-muted-foreground">요청하신 페이지가 존재하지 않거나 이동되었습니다.</p>
      <div className="flex gap-2">
        <Button asChild>
          <Link href="/dashboard/map">지도로 이동</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/dashboard/apartments">아파트 검색</Link>
        </Button>
      </div>
    </div>
  );
}
