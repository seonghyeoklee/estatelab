import { TooltipProvider } from '@/components/ui/tooltip';
import { SWRProvider } from '@/components/swr-provider';
import { Toaster } from '@/components/ui/sonner';
import { DashboardShell } from './_components/dashboard-shell';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SWRProvider>
      <TooltipProvider>
        <DashboardShell>{children}</DashboardShell>
      </TooltipProvider>
      <Toaster position="bottom-right" />
    </SWRProvider>
  );
}
