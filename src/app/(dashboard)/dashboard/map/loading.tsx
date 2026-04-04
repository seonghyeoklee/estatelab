import { Map } from 'lucide-react';

export default function MapLoading() {
  return (
    <div className="flex h-[calc(100vh-56px)] items-center justify-center bg-muted/30">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-pulse rounded-2xl bg-primary/10 p-4">
          <Map className="h-8 w-8 text-primary" />
        </div>
        <p className="text-sm text-muted-foreground">지도를 불러오는 중...</p>
      </div>
    </div>
  );
}
