import { ReactNode, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  children?: ReactNode;
  className?: string;
  sticky?: boolean;
}

export function PageHeader({ title, subtitle, children, className, sticky = true }: PageHeaderProps) {
  const isMobile = useIsMobile();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!isMobile) return;
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [isMobile]);

  const hideSubtitle = isMobile && scrolled;

  return (
    <header
      className={cn(
        "px-4 border-b border-border z-40 transition-all duration-200",
        sticky && "sticky top-0",
        hideSubtitle ? "py-2" : "py-4",
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
          <h1 className={cn("font-bold tracking-tight transition-all duration-200", hideSubtitle ? "text-lg" : "text-2xl")}>{title}</h1>
          {subtitle && (
            <p className={cn("text-sm opacity-70 transition-all duration-200 overflow-hidden", hideSubtitle ? "max-h-0 mt-0 opacity-0" : "max-h-10 mt-0.5")}>{subtitle}</p>
          )}
        </div>
        {children}
      </div>
    </header>
  );
}