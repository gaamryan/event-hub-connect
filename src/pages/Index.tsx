import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/header";
import { EventCard } from "@/components/events/EventCard";
import { EventListSkeleton } from "@/components/events/EventCardSkeleton";
import { CategoryFilter } from "@/components/events/CategoryFilter";
import { FeaturedEvents } from "@/components/events/FeaturedEvents";
import { FilterDrawer, type EventFilters } from "@/components/events/FilterDrawer";
import { SortSelect, type SortOption } from "@/components/events/SortSelect";
import { useApprovedEvents } from "@/hooks/useEvents";
import { useCategories } from "@/hooks/useCategories";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const Index = () => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [filters, setFilters] = useState<EventFilters>({});
  const [sortBy, setSortBy] = useState<SortOption>("date_asc");
  
  const { data: events, isLoading: eventsLoading } = useApprovedEvents({
    categoryId: selectedCategory,
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
  }, [filters]);

  const removeFilter = (key: string) => {
    const newFilters = { ...filters };
    if (key === "date") {
      delete newFilters.dateFrom;
      delete newFilters.dateTo;
    } else if (key === "free") {
      delete newFilters.isFree;
    } else if (key === "location") {
      delete newFilters.location;
    }
    setFilters(newFilters);
  };

  return (
    <AppLayout>
      <PageHeader 
        title="ILoveGAAM" 
        subtitle="Discover events near you"
      >
        <button
          onClick={() => setShowSearch(!showSearch)}
          className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center touch-feedback"
        >
          <Search className="h-5 w-5 text-muted-foreground" />
        </button>
      </PageHeader>

      {/* Search Bar */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 pb-3 bg-background border-b border-border"
          >
            <Input
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
              autoFocus
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Featured Events Section */}
      <FeaturedEvents />

      {/* Category Filter */}
      <div className="sticky top-[73px] bg-background/95 backdrop-blur-md z-30 border-b border-border">
        <CategoryFilter
          categories={categories || []}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          isLoading={categoriesLoading}
        />
        
        {/* Filter & Sort Row */}
        <div className="flex items-center justify-between px-4 py-3 gap-3">
          <FilterDrawer
            filters={filters}
            onFiltersChange={setFilters}
            activeFilterCount={activeFilterCount}
          />
          <SortSelect value={sortBy} onChange={setSortBy} />
        </div>

        {/* Active Filter Tags */}
        {activeFilterTags.length > 0 && (
          <div className="flex gap-2 px-4 pb-3 flex-wrap">
            {activeFilterTags.map((tag) => (
              <Badge
                key={tag.key}
                variant="secondary"
                className="gap-1 pr-1"
              >
                {tag.label}
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
          </div>
        )}
      </div>

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
                : selectedCategory
                ? "No events in this category. Try another!"
                : "Events will appear here once approved."}
            </p>
            {activeFilterCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => setFilters({})}
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
