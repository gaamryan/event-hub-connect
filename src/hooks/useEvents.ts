import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { EventFilters } from "@/components/events/FilterDrawer";
import type { SortOption } from "@/components/events/SortSelect";

export interface Event {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string | null;
  image_url: string | null;
  ticket_url: string | null;
  price_min: number | null;
  price_max: number | null;
  is_free: boolean | null;
  status: "draft" | "pending" | "approved" | "rejected";
  source: "manual" | "eventbrite" | "meetup" | "ticketspice" | "facebook";
  source_url: string | null;
  featured: boolean | null;
  created_at: string;
  venue: {
    id: string;
    name: string;
    city: string | null;
  } | null;
  host: {
    id: string;
    name: string;
  } | null;
  category: {
    id: string;
    name: string;
    slug: string;
    icon: string | null;
    color: string | null;
  } | null;
}

interface UseApprovedEventsOptions {
  categoryId?: string | null;
  categoryIds?: string[];
  filters?: EventFilters;
  sortBy?: SortOption;
}

export function useApprovedEvents(options: UseApprovedEventsOptions = {}) {
  const { categoryId, categoryIds, filters, sortBy = "date_asc" } = options;

  return useQuery({
    queryKey: ["events", "approved", categoryId, categoryIds, filters, sortBy],
    queryFn: async () => {
      let query = supabase
        .from("events")
        .select(`
          *,
          venue:venues(id, name, city),
          host:hosts(id, name),
          category:categories(id, name, slug, icon, color)
        `)
        .eq("status", "approved");

      // Category filter (single)
      if (categoryId) {
        query = query.eq("category_id", categoryId);
      }

      // Category filter (multiple)
      if (categoryIds && categoryIds.length > 0) {
        query = query.in("category_id", categoryIds);
      }

      // Date range filter
      if (filters?.dateFrom) {
        query = query.gte("start_time", filters.dateFrom.toISOString());
      }
      if (filters?.dateTo) {
        // Set to end of day
        const endOfDay = new Date(filters.dateTo);
        endOfDay.setHours(23, 59, 59, 999);
        query = query.lte("start_time", endOfDay.toISOString());
      }

      // Free events filter
      if (filters?.isFree) {
        query = query.eq("is_free", true);
      }

      // Price range filter (only if not filtering by free)
      if (!filters?.isFree) {
        if (filters?.priceMin !== undefined && filters.priceMin > 0) {
          query = query.gte("price_min", filters.priceMin);
        }
        if (filters?.priceMax !== undefined && filters.priceMax < 200) {
          query = query.lte("price_max", filters.priceMax);
        }
      }

      // Sorting
      switch (sortBy) {
        case "date_asc":
          query = query.order("start_time", { ascending: true });
          break;
        case "date_desc":
          query = query.order("start_time", { ascending: false });
          break;
        case "price_low":
          query = query.order("price_min", { ascending: true, nullsFirst: false });
          break;
        case "price_high":
          query = query.order("price_max", { ascending: false, nullsFirst: false });
          break;
      }

      const { data, error } = await query;
      if (error) throw error;

      // Client-side location filtering (venue name or city contains search term)
      let filteredData = data as Event[];
      if (filters?.location) {
        const locationLower = filters.location.toLowerCase();
        filteredData = filteredData.filter(
          (event) =>
            event.venue?.name?.toLowerCase().includes(locationLower) ||
            event.venue?.city?.toLowerCase().includes(locationLower)
        );
      }

      return filteredData;
    },
  });
}

export function useFeaturedEvents() {
  return useQuery({
    queryKey: ["events", "featured"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select(`
          *,
          venue:venues(id, name, city),
          host:hosts(id, name),
          category:categories(id, name, slug, icon, color)
        `)
        .eq("status", "approved")
        .eq("featured", true)
        .gte("start_time", new Date().toISOString())
        .order("start_time", { ascending: true })
        .limit(10);

      if (error) throw error;
      return data as Event[];
    },
  });
}

export function useAllEvents(filters?: {
  status?: "draft" | "pending" | "approved" | "rejected";
  source?: "manual" | "eventbrite" | "meetup" | "ticketspice" | "facebook";
  search?: string;
}) {
  return useQuery({
    queryKey: ["events", "all", filters],
    queryFn: async () => {
      let query = supabase
        .from("events")
        .select(`
          *,
          venue:venues(id, name, city),
          host:hosts(id, name),
          category:categories(id, name, slug, icon, color)
        `)
        .order("created_at", { ascending: false });

      if (filters?.status) {
        query = query.eq("status", filters.status);
      }
      if (filters?.source) {
        query = query.eq("source", filters.source);
      }
      if (filters?.search) {
        query = query.ilike("title", `%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Event[];
    },
  });
}

export function useUpdateEventStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      eventIds,
      status,
    }: {
      eventIds: string[];
      status: "approved" | "rejected" | "pending" | "draft";
    }) => {
      const { error } = await supabase
        .from("events")
        .update({
          status,
          approved_at: status === "approved" ? new Date().toISOString() : null,
        })
        .in("id", eventIds);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });
}

export function useToggleFeatured() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ eventId, featured }: { eventId: string; featured: boolean }) => {
      const { error } = await supabase
        .from("events")
        .update({ featured })
        .eq("id", eventId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });
}

export function useDeleteEvents() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventIds: string[]) => {
      const { error } = await supabase.from("events").delete().in("id", eventIds);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });
}
