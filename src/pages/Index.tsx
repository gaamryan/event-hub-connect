import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Calendar, Sparkles } from "lucide-react";
import { startOfWeek, endOfWeek, nextSaturday, nextSunday, isSameDay, startOfDay, endOfDay } from "date-fns";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/header";
import { EventCard } from "@/components/events/EventCard";
import { EventListSkeleton } from "@/components/events/EventCardSkeleton";
import { FeaturedEvents } from "@/components/events/FeaturedEvents";
import { FilterDrawer, type EventFilters } from "@/components/events/FilterDrawer";
import { SortSelect, type SortOption } from "@/components/events/SortSelect";
import { useApprovedEvents, Event } from "@/hooks/useEvents";
import { useCategories } from "@/hooks/useCategories";
import { useSettings } from "@/hooks/useSettings";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type QuickFilter = "this_week" | "this_weekend" | "free" | null;

const Index = () => {
  const { data: settings } = useSettings();
  const PAGE_LIMIT = settings?.pagination_limit?.value || 20;

  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<EventFilters>({});
  const [sortBy, setSortBy] = useState<SortOption>("date_asc");
  const [activeQuickFilter, setActiveQuickFilter] = useState<QuickFilter>(null);

  // Pagination
  const [page, setPage] = useState(0);
  const [allEvents, setAllEvents] = useState<Event[]>([]);

  const { data: eventsData, isLoading: eventsLoading } = useApprovedEvents({
    categoryIds: filters.categoryIds,
    filters,
    sortBy,
    page,
    limit: PAGE_LIMIT
  });

  // Reset pagination when filters change
  useEffect(() => {
    setPage(0);
    setAllEvents([]);
  }, [filters, sortBy, searchQuery, activeQuickFilter]);

  // Append new events when data arrives
  useEffect(() => {
    if (eventsData?.data) {
      if (page === 0) {
        setAllEvents(eventsData.data as Event[]);
      } else {
        setAllEvents(prev => [...prev, ...(eventsData.data as Event[])]);
      }
    }
  }, [eventsData, page]);

  const hasMore = eventsData?.count ? allEvents.length < eventsData.count : false;
  const events = allEvents;

  const { data: categories } = useCategories();

  // Quick filter handlers
  const getThisWeekDates = () => {
    const now = new Date();
    const weekStart = startOfDay(now);
    const weekEnd = endOfWeek(now, { weekStartsOn: 0 }); // Sunday end
    return { from: weekStart, to: endOfDay(weekEnd) };
  };

  const getThisWeekendDates = () => {
    const now = new Date();
    const dayOfWeek = now.getDay();

    let saturday: Date;
    let sunday: Date;

    // If today is Saturday (6) or Sunday (0), use this weekend
    if (dayOfWeek === 6) {
      saturday = startOfDay(now);
      sunday = endOfDay(new Date(now.getTime() + 24 * 60 * 60 * 1000));
    } else if (dayOfWeek === 0) {
      saturday = startOfDay(new Date(now.getTime() - 24 * 60 * 60 * 1000));
      sunday = endOfDay(now);
    } else {
      // Find next Saturday
      saturday = startOfDay(nextSaturday(now));
      sunday = endOfDay(nextSunday(now));
    }

    return { from: saturday, to: sunday };
  };

  const handleQuickFilter = (filter: QuickFilter) => {
    if (activeQuickFilter === filter) {
      // Toggle off
      setActiveQuickFilter(null);
      setFilters(prev => {
        const newFilters = { ...prev };
        delete newFilters.dateFrom;
        delete newFilters.dateTo;
        if (filter === "free") delete newFilters.isFree;
        return newFilters;
      });
    } else {
      // Apply filter
      setActiveQuickFilter(filter);
      if (filter === "this_week") {
        const { from, to } = getThisWeekDates();
        setFilters(prev => ({ ...prev, dateFrom: from, dateTo: to, isFree: undefined }));
      } else if (filter === "this_weekend") {
        const { from, to } = getThisWeekendDates();
        setFilters(prev => ({ ...prev, dateFrom: from, dateTo: to, isFree: undefined }));
      } else if (filter === "free") {
        setFilters(prev => ({ ...prev, isFree: true, dateFrom: undefined, dateTo: undefined }));
      }
    }
  };

  // Count active filters (excluding search and quick filters)
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.dateFrom || filters.dateTo) count++;
    if (filters.isFree) count++;
    if (filters.priceMin || filters.priceMax) count++;
    if (filters.location) count++;
    if (filters.categoryIds && filters.categoryIds.length > 0) count++;
    return count;
  }, [filters]);

  // Client-side search filtering
  const filteredEvents = useMemo(() => {
    if (!events) return [];
    if (!searchQuery) return events;
    return events.filter((event) =>
      event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [events, searchQuery]);

  // Get active filter tags for display
  const activeFilterTags = useMemo(() => {
    const tags: { key: string; label: string }[] = [];
    if (searchQuery) {
      tags.push({ key: "search", label: `"${searchQuery}"` });
    }
    if (filters.categoryIds && filters.categoryIds.length > 0) {
      const categoryNames = filters.categoryIds
        .map(id => categories?.find(c => c.id === id)?.name)
        .filter(Boolean)
        .join(", ");
      tags.push({ key: "categories", label: categoryNames || "Categories" });
    }
    // Only show date tag if not using a quick filter
    if (!activeQuickFilter || (activeQuickFilter !== "this_week" && activeQuickFilter !== "this_weekend")) {
      if (filters.dateFrom && filters.dateTo) {
        tags.push({ key: "date", label: `${filters.dateFrom.toLocaleDateString()} - ${filters.dateTo.toLocaleDateString()}` });
      } else if (filters.dateFrom) {
        tags.push({ key: "date", label: `From ${filters.dateFrom.toLocaleDateString()}` });
      } else if (filters.dateTo) {
        tags.push({ key: "date", label: `Until ${filters.dateTo.toLocaleDateString()}` });
      }
    }
    // Only show free tag if not using quick filter
    if (filters.isFree && activeQuickFilter !== "free") {
      tags.push({ key: "free", label: "Free events" });
    }
    if (filters.location) {
      tags.push({ key: "location", label: filters.location });
    }
    return tags;
  }, [filters, searchQuery, categories, activeQuickFilter]);

  const removeFilter = (key: string) => {
    if (key === "search") {
      setSearchQuery("");
      return;
    }
    const newFilters = { ...filters };
    if (key === "date") {
      delete newFilters.dateFrom;
      delete newFilters.dateTo;
      if (activeQuickFilter === "this_week" || activeQuickFilter === "this_weekend") {
        setActiveQuickFilter(null);
      }
    } else if (key === "free") {
      delete newFilters.isFree;
      if (activeQuickFilter === "free") {
        setActiveQuickFilter(null);
      }
    } else if (key === "location") {
      delete newFilters.location;
    } else if (key === "categories") {
      delete newFilters.categoryIds;
    }
    setFilters(newFilters);
  };

  return (
    <AppLayout>
      <PageHeader
        title="ILoveGAAM"
        subtitle="Discover events near you"
      />

      {/* Search & Filter Bar */}
      <div className="sticky top-[73px] bg-background/95 backdrop-blur-md z-30 border-b border-border">
        <div className="px-4 py-3">
          <div className="flex items-center gap-3">
            {/* Search Input with Filter Button Inside */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-12 h-11"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-10 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setSearchQuery("")}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
              {/* Filter Button Inside Search Bar */}
              <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
                <FilterDrawer
                  filters={filters}
                  onFiltersChange={setFilters}
                  activeFilterCount={activeFilterCount}
                  categories={categories || []}
                />
              </div>
            </div>
            <SortSelect value={sortBy} onChange={setSortBy} />
          </div>

          {/* Quick Filters */}
          <div className="flex gap-2 pt-2 overflow-x-auto scrollbar-hide">
            <Button
              variant={activeQuickFilter === "this_week" ? "default" : "outline"}
              size="sm"
              className="rounded-full whitespace-nowrap gap-1.5 flex-shrink-0"
              onClick={() => handleQuickFilter("this_week")}
            >
              <Calendar className="h-3.5 w-3.5" />
              This Week
            </Button>
            <Button
              variant={activeQuickFilter === "this_weekend" ? "default" : "outline"}
              size="sm"
              className="rounded-full whitespace-nowrap gap-1.5 flex-shrink-0"
              onClick={() => handleQuickFilter("this_weekend")}
            >
              <Sparkles className="h-3.5 w-3.5" />
              This Weekend
            </Button>
            <Button
              variant={activeQuickFilter === "free" ? "default" : "outline"}
              size="sm"
              className="rounded-full whitespace-nowrap flex-shrink-0"
              onClick={() => handleQuickFilter("free")}
            >
              🎉 Free
            </Button>
          </div>
        </div>

        {/* Active Filter Tags */}
        <AnimatePresence>
          {activeFilterTags.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex gap-2 px-4 pb-3 flex-wrap"
            >
              {activeFilterTags.map((tag) => (
                <Badge
                  key={tag.key}
                  variant="secondary"
                  className="gap-1 pr-1"
                >
                  <span className="truncate max-w-[150px]">{tag.label}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 p-0 hover:bg-transparent"
                    onClick={() => removeFilter(tag.key)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Featured Events Section */}
      <FeaturedEvents />

      {/* Event List */}
      <div className="p-4 space-y-4">
        {eventsLoading && page === 0 ? (
          <EventListSkeleton count={4} />
        ) : filteredEvents && filteredEvents.length > 0 ? (
          <>
            {filteredEvents.map((event, index) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <EventCard
                  id={event.id}
                  title={event.title}
                  description={event.description || undefined}
                  imageUrl={event.image_url || undefined}
                  startTime={new Date(event.start_time)}
                  venueName={event.venue?.name}
                  categories={event.event_categories?.map(ec => ec.category)}
                  isFree={event.is_free || false}
                  priceMin={event.price_min || undefined}
                  priceMax={event.price_max || undefined}
                />
              </motion.div>
            ))}

            {/* Load More Trigger */}
            {hasMore && (
              <div className="flex justify-center pt-4 pb-8">
                <Button
                  variant="outline"
                  onClick={() => setPage(p => p + 1)}
                  disabled={eventsLoading}
                >
                  {eventsLoading ? "Loading..." : "Load More Events"}
                </Button>
              </div>
            )}
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <div className="text-6xl mb-4">🎉</div>
            <h3 className="text-lg font-semibold mb-2">No events found</h3>
            <p className="text-muted-foreground text-sm">
              {activeFilterCount > 0 || searchQuery
                ? "Try adjusting your filters to see more events."
                : "Events will appear here once approved."}
            </p>
            {(activeFilterCount > 0 || searchQuery) && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => {
                  setFilters({});
                  setSearchQuery("");
                }}
              >
                Clear all filters
              </Button>
            )}
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
};

export default Index;
