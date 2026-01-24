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
        "px-4 py-4 bg-background/95 backdrop-blur-md border-b border-border z-40",
        sticky && "sticky top-0",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
        {children}
      </div>
    </header>
  );
}
