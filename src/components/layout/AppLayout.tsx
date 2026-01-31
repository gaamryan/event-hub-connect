import { ReactNode } from "react";
import { BottomNav } from "./BottomNav";

export interface AppLayoutProps {
  children: ReactNode;
  hideBottomNav?: boolean;
}

export function AppLayout({ children, hideBottomNav = false }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <main className="page-container">
        {children}
      </main>
      {!hideBottomNav && <BottomNav />}
    </div>
  );
}
