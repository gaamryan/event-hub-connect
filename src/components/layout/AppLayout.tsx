import { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { ThemeApplicator } from "@/components/ThemeApplicator";

export interface AppLayoutProps {
  children: ReactNode;
  hideBottomNav?: boolean;
}

export function AppLayout({ children, hideBottomNav = false }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <ThemeApplicator />
      <main className="page-container">
        {children}
      </main>
      {!hideBottomNav && <BottomNav />}
    </div>
  );
}
