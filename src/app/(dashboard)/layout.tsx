import { TooltipProvider } from '@/components/ui/tooltip';
import { DashboardShell } from './_components/dashboard-shell';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <DashboardShell>{children}</DashboardShell>
    </TooltipProvider>
  );
}
