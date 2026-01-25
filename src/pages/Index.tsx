import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/header";
import { EventCard } from "@/components/events/EventCard";
import { EventListSkeleton } from "@/components/events/EventCardSkeleton";
import { FeaturedEvents } from "@/components/events/FeaturedEvents";
import { FilterDrawer, type EventFilters } from "@/components/events/FilterDrawer";
import { SortSelect, type SortOption } from "@/components/events/SortSelect";
import { useApprovedEvents } from "@/hooks/useEvents";
import { useCategories } from "@/hooks/useCategories";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<EventFilters>({});
  const [sortBy, setSortBy] = useState<SortOption>("date_asc");
  
  const { data: events, isLoading: eventsLoading } = useApprovedEvents({
    categoryIds: filters.categoryIds,
    filters,
    sortBy,
  });
  const { data: categories, isLoading: categoriesLoading } = useCategories();

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.dateFrom || filters.dateTo) count++;
    if (filters.isFree) count++;
    if (filters.priceMin || filters.priceMax) count++;
    if (filters.location) count++;
    if (filters.categoryIds && filters.categoryIds.length > 0) count++;
    if (searchQuery) count++;
    return count;
  }, [filters, searchQuery]);

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
    if (filters.dateFrom && filters.dateTo) {
      tags.push({ key: "date", label: `${filters.dateFrom.toLocaleDateString()} - ${filters.dateTo.toLocaleDateString()}` });
    } else if (filters.dateFrom) {
      tags.push({ key: "date", label: `From ${filters.dateFrom.toLocaleDateString()}` });
    } else if (filters.dateTo) {
      tags.push({ key: "date", label: `Until ${filters.dateTo.toLocaleDateString()}` });
    }
    if (filters.isFree) {
      tags.push({ key: "free", label: "Free events" });
    }
    if (filters.location) {
      tags.push({ key: "location", label: filters.location });
    }
    return tags;
  }, [filters, searchQuery, categories]);

  const removeFilter = (key: string) => {
    if (key === "search") {
      setSearchQuery("");
      return;
    }
    const newFilters = { ...filters };
    if (key === "date") {
      delete newFilters.dateFrom;
      delete newFilters.dateTo;
    } else if (key === "free") {
      delete newFilters.isFree;
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
            <div className="flex-1">
              <FilterDrawer
                filters={filters}
                onFiltersChange={setFilters}
                activeFilterCount={activeFilterCount}
                categories={categories || []}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
              />
            </div>
            <SortSelect value={sortBy} onChange={setSortBy} />
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
        {eventsLoading ? (
          <EventListSkeleton count={4} />
        ) : filteredEvents && filteredEvents.length > 0 ? (
          filteredEvents.map((event, index) => (
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
                categoryName={event.category?.name}
                categoryIcon={event.category?.icon || undefined}
                categoryColor={event.category?.color || undefined}
                isFree={event.is_free || false}
                priceMin={event.price_min || undefined}
                priceMax={event.price_max || undefined}
              />
            </motion.div>
          ))
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <div className="text-6xl mb-4">🎉</div>
            <h3 className="text-lg font-semibold mb-2">No events found</h3>
            <p className="text-muted-foreground text-sm">
              {activeFilterCount > 0
                ? "Try adjusting your filters to see more events."
                : "Events will appear here once approved."}
            </p>
            {activeFilterCount > 0 && (
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
