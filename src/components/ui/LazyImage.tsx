import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface LazyImageProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
  fallback?: React.ReactNode;
  objectFit?: "cover" | "contain";
}

/**
 * LazyImage — uses IntersectionObserver to defer loading until the image
 * enters the viewport, then fades in once loaded. Falls back to `fallback`
 * on error or when no src is provided.
 */
export function LazyImage({
  src,
  alt,
  className,
  fallback,
  objectFit = "cover",
}: LazyImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [inView, setInView] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const showFallback = !src || error;

  return (
    <div ref={containerRef} className={cn("relative overflow-hidden", className)}>
      {/* Shimmer placeholder while loading */}
      {!loaded && !showFallback && (
        <div className="absolute inset-0 animate-pulse bg-muted" />
      )}

      {showFallback ? (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          {fallback}
        </div>
      ) : inView ? (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          className={cn(
            "w-full h-full transition-opacity duration-500",
            objectFit === "cover" ? "object-cover" : "object-contain",
            loaded ? "opacity-100" : "opacity-0"
          )}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
        />
      ) : null}
    </div>
  );
}
