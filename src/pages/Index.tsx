import { useState } from "react";
import { motion } from "framer-motion";
import { Search, SlidersHorizontal } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/header";
import { EventCard } from "@/components/events/EventCard";
import { EventListSkeleton } from "@/components/events/EventCardSkeleton";
import { CategoryFilter } from "@/components/events/CategoryFilter";
import { useApprovedEvents } from "@/hooks/useEvents";
import { useCategories } from "@/hooks/useCategories";
import { Input } from "@/components/ui/input";

const Index = () => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  
  const { data: events, isLoading: eventsLoading } = useApprovedEvents(selectedCategory);
  const { data: categories, isLoading: categoriesLoading } = useCategories();

  const filteredEvents = events?.filter((event) =>
    event.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

      {/* Category Filter */}
      <div className="sticky top-[73px] bg-background/95 backdrop-blur-md z-30 border-b border-border">
        <CategoryFilter
          categories={categories || []}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          isLoading={categoriesLoading}
        />
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
            <h3 className="text-lg font-semibold mb-2">No events yet</h3>
            <p className="text-muted-foreground text-sm">
              {selectedCategory
                ? "No events in this category. Try another!"
                : "Events will appear here once approved."}
            </p>
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
};

export default Index;
