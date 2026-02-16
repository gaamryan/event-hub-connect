import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  children?: ReactNode;
  className?: string;
  sticky?: boolean;
}

export function PageHeader({ title, subtitle, children, className, sticky = true }: PageHeaderProps) {
  return (
    <header
      className={cn(
        "px-4 py-4 border-b border-border z-40",
        sticky && "sticky top-0",
        className
      )}
      style={{
        background: 'var(--topbar-bg)',
        color: `hsl(var(--topbar-text))`,
        backdropFilter: `blur(var(--topbar-blur))`,
        WebkitBackdropFilter: `blur(var(--topbar-blur))`,
        opacity: 'var(--topbar-opacity)',
      }}
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {subtitle && (
            <p className="text-sm opacity-70 mt-0.5">{subtitle}</p>
          )}
        </div>
        {children}
      </div>
    </header>
  );
}