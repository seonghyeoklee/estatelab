'use client';

import { useState } from 'react';
import { Share2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  title: string;
  className?: string;
}

export function ShareButton({ title, className }: Props) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const url = window.location.href;

    // Web Share API 지원 시 네이티브 공유
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // 사용자 취소 — 무시
      }
    }

    // 폴백: 클립보드 복사
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 폴백의 폴백
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={handleShare}
      className={cn(
        'flex items-center justify-center rounded-full transition-all shrink-0 h-8 w-8',
        copied
          ? 'bg-emerald-50 text-emerald-500'
          : 'bg-muted/50 text-muted-foreground hover:bg-muted',
        className
      )}
      title={copied ? '복사됨' : '공유'}
      aria-label="공유"
    >
      {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
    </button>
  );
}
