import { useRef } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Sparkles, Calendar, MapPin } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useFeaturedEvents } from "@/hooks/useEvents";
import { Skeleton } from "@/components/ui/skeleton";

export function FeaturedEvents() {
  const { data: events, isLoading } = useFeaturedEvents();
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = 340;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="relative py-8 px-4">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-accent/5 to-primary/10" />
        <div className="relative">
          <Skeleton className="h-7 w-48 mb-2" />
          <Skeleton className="h-4 w-64 mb-6" />
          <div className="flex gap-4 overflow-hidden">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="flex-shrink-0 w-80 h-64 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!events || events.length === 0) {
    return null;
  }

  return (
    <div className="relative py-8 overflow-hidden">
      {/* Unique background to differentiate from rest of page */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-background to-accent/8" />
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `radial-gradient(circle at 20% 50%, hsl(var(--primary)) 1px, transparent 1px),
                          radial-gradient(circle at 80% 20%, hsl(var(--primary)) 1px, transparent 1px)`,
        backgroundSize: '60px 60px'
      }} />

      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between px-4 mb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <h2 className="text-xl font-bold">Don't Miss</h2>
            </div>
            <p className="text-sm text-muted-foreground ml-10">Hand-picked events just for you</p>
          </div>
          <div className="hidden sm:flex gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => scroll("left")}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => scroll("right")}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Cards */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto px-4 pb-4 snap-x snap-mandatory scrollbar-hide"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {events.map((event, index) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.12, type: "spring", stiffness: 200 }}
              className="flex-shrink-0 w-80 snap-start"
              onClick={() => navigate(`/events/${event.id}`)}
            >
              <div className="relative rounded-2xl overflow-hidden cursor-pointer group shadow-lg hover:shadow-xl transition-shadow duration-300 bg-card border border-border/50">
                {/* Image */}
                <div className="relative h-44 overflow-hidden">
                  <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                    style={{
                      backgroundImage: event.image_url
                        ? `url(${event.image_url})`
                        : "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary)/0.7) 100%)",
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                  {/* Featured Badge */}
                  <div className="absolute top-3 left-3">
                    <span className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-full flex items-center gap-1.5 shadow-md">
                      <Sparkles className="h-3 w-3" />
                      Staff Pick
                    </span>
                  </div>

                  {/* Price */}
                  {event.is_free && (
                    <div className="absolute top-3 right-3">
                      <span className="px-2.5 py-1 bg-primary text-primary-foreground text-xs font-semibold rounded-full">
                        Free
                      </span>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-4 space-y-2.5">
                  {/* Categories */}
                  {event.event_categories && event.event_categories.length > 0 && (
                    <div className="flex gap-1.5 flex-wrap">
                      {event.event_categories.slice(0, 2).map((ec) => (
                        <span
                          key={ec.category.id}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: ec.category.color ? `${ec.category.color}20` : undefined,
                            color: ec.category.color || undefined,
                          }}
                        >
                          {ec.category.icon && <span className="text-xs">{ec.category.icon}</span>}
                          {ec.category.name}
                        </span>
                      ))}
                    </div>
                  )}

                  <h3 className="font-bold text-base line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                    {event.title}
                  </h3>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5 flex-shrink-0 text-primary/70" />
                      <span>{format(new Date(event.start_time), "EEE, MMM d • h:mm a")}</span>
                    </div>
                    {event.venue && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-primary/70" />
                        <span className="truncate">{event.venue.name}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
