'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { User, LogOut } from 'lucide-react';

export function UserMenu() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />;
  }

  if (!session?.user) {
    return (
      <Button variant="outline" size="sm" asChild>
        <Link href="/login">로그인</Link>
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="hidden md:flex items-center gap-2 text-sm">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
          <User className="h-3.5 w-3.5 text-primary" />
        </div>
        <span className="text-muted-foreground text-xs">
          {session.user.name || session.user.email}
        </span>
      </div>
      <button
        onClick={() => signOut({ callbackUrl: '/' })}
        className="rounded-md p-1.5 hover:bg-accent transition-colors"
        title="로그아웃"
      >
        <LogOut className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
    </div>
  );
}
