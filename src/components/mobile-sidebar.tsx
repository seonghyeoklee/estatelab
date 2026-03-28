'use client';

import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { VisuallyHidden } from '@/components/visually-hidden';
import { Sidebar } from '@/components/sidebar';

interface MobileSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobileSidebar({ open, onOpenChange }: MobileSidebarProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-64 p-0" style={{ backgroundColor: 'white' }}>
        <VisuallyHidden>
          <SheetTitle>내비게이션 메뉴</SheetTitle>
          <SheetDescription>대시보드 내비게이션</SheetDescription>
        </VisuallyHidden>
        <Sidebar onNavigate={() => onOpenChange(false)} />
      </SheetContent>
    </Sheet>
  );
}
