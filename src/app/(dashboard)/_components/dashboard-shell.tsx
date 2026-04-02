'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/sidebar';
import { Header } from '@/components/header';
import { MobileSidebar } from '@/components/mobile-sidebar';
import { MobileBottomNav } from '@/components/mobile-bottom-nav';
import { CommandPalette } from '@/components/command-palette';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden md:flex shrink-0">
        <Sidebar onCommandOpen={() => setCmdOpen(true)} />
      </div>

      {/* Mobile sidebar */}
      <MobileSidebar open={mobileOpen} onOpenChange={setMobileOpen} />

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <Header onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto bg-background p-4 md:p-6 pb-20 md:pb-6">
          {children}
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <MobileBottomNav />

      {/* Command Palette */}
      <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
    </div>
  );
}
