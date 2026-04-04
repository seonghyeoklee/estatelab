'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GitCompareArrows, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Props {
  complexId: string;
  complexName: string;
}

function getCompareList(): string[] {
  try {
    return JSON.parse(localStorage.getItem('estatelab_compare') || '[]');
  } catch { return []; }
}

function setCompareList(ids: string[]) {
  try { localStorage.setItem('estatelab_compare', JSON.stringify(ids.slice(0, 2))); } catch {}
}

export function CompareButton({ complexId, complexName }: Props) {
  const router = useRouter();
  const [added, setAdded] = useState(() => getCompareList().includes(complexId));

  const handleClick = () => {
    const list = getCompareList();

    if (added) {
      // 이미 추가됨 → 비교 페이지로 이동
      const other = list.find((id) => id !== complexId);
      if (other) {
        router.push(`/dashboard/compare?a=${complexId}&b=${other}`);
      } else {
        toast('비교할 단지를 하나 더 추가해주세요');
      }
      return;
    }

    if (list.length >= 2) {
      // 2개 찼으면 비교 페이지로 바로 이동
      router.push(`/dashboard/compare?a=${list[0]}&b=${complexId}`);
      return;
    }

    // 추가
    const updated = [...list, complexId];
    setCompareList(updated);
    setAdded(true);

    if (updated.length === 2) {
      toast.success('비교 준비 완료', {
        action: {
          label: '비교하기',
          onClick: () => router.push(`/dashboard/compare?a=${updated[0]}&b=${updated[1]}`),
        },
      });
    } else {
      toast(`${complexName} 비교에 추가됨 (1/2)`);
    }
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        'flex items-center justify-center rounded-full transition-all shrink-0 h-8 w-8',
        added
          ? 'bg-primary/10 text-primary'
          : 'bg-muted/50 text-muted-foreground hover:bg-muted'
      )}
      title={added ? '비교하기' : '비교에 추가'}
      aria-label={added ? '비교하기' : '비교에 추가'}
    >
      {added ? <Check className="h-4 w-4" /> : <GitCompareArrows className="h-4 w-4" />}
    </button>
  );
}
