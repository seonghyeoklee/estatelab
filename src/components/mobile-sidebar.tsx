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
      <SheetContent side="left" className="w-72 p-0">
        <VisuallyHidden>
          <SheetTitle>내비게이션</SheetTitle>
          <SheetDescription>EstateLab 메뉴</SheetDescription>
        </VisuallyHidden>
        <Sidebar onNavigate={() => onOpenChange(false)} />
      </SheetContent>
    </Sheet>
  );
}
