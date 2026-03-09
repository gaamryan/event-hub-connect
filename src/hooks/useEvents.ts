import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { EventFilters } from "@/components/events/FilterDrawer";
import type { SortOption } from "@/components/events/SortSelect";
import { startOfDay } from "date-fns";



// Pagination response wrapper
export interface PaginatedResult<T> {
  data: T[];
  count: number | null;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  color: string | null;
}

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
  is_recurring: boolean | null;
  recurrence_frequency: string | null;
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
  // JOIN table structure
  event_categories: {
    category: Category;
  }[];
}

interface UseApprovedEventsOptions {
  categoryId?: string | null;
  categoryIds?: string[];
  filters?: EventFilters;
  sortBy?: SortOption;
  page?: number;     // 0-indexed
  limit?: number;    // items per page
}

export function useApprovedEvents(options: UseApprovedEventsOptions = {}) {
  const { categoryId, categoryIds, filters, sortBy = "date_asc", page = 0, limit = 20 } = options;

  const hasCategoryFilter = !!(categoryId || (categoryIds && categoryIds.length > 0));

  return useQuery({
    queryKey: ["events", "approved", categoryId, categoryIds, filters, sortBy, page, limit],
    queryFn: async () => {
      const result = await fetchApprovedEvents({ categoryId, categoryIds, filters, sortBy, page, limit });
      return result;
    },
  });
}

async function fetchApprovedEvents({
  categoryId,
  categoryIds,
  filters,
  sortBy = "date_asc",
  page = 0,
  limit = 20,
}: {
  categoryId?: string | null;
  categoryIds?: string[];
  filters?: EventFilters;
  sortBy?: SortOption;
  page?: number;
  limit?: number;
}) {
  const hasCategoryFilter = !!(categoryId || (categoryIds && categoryIds.length > 0));

  const selectQuery = hasCategoryFilter
    ? `*, venue:venues(*), host:hosts(*), event_categories!inner(category:categories(*))`
    : `*, venue:venues(*), host:hosts(*), event_categories(category:categories(*))`;

  let query = supabase
    .from("events")
    .select(selectQuery, { count: 'exact' })
    .eq("status", "approved");

  // Apply Pagination
  const from = page * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  if (categoryId) {
    query = query.eq("event_categories.category_id", categoryId);
  }
  if (categoryIds && categoryIds.length > 0) {
    query = query.in("event_categories.category_id", categoryIds);
  }

  if (filters?.dateFrom) {
    query = query.gte("start_time", filters.dateFrom.toISOString());
  } else {
    query = query.gte("start_time", startOfDay(new Date()).toISOString());
  }
  if (filters?.dateTo) {
    const endOfDay = new Date(filters.dateTo);
    endOfDay.setHours(23, 59, 59, 999);
    query = query.lte("start_time", endOfDay.toISOString());
  }

  if (filters?.isFree) {
    query = query.eq("is_free", true);
  }
  if (!filters?.isFree) {
    if (filters?.priceMin !== undefined && filters.priceMin > 0) {
      query = query.gte("price_min", filters.priceMin);
    }
    if (filters?.priceMax !== undefined && filters.priceMax < 200) {
      query = query.lte("price_max", filters.priceMax);
    }
  }

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

  const { data, error, count } = await query;
  if (error) throw error;

  let filteredData = data as any[];

  if (filters?.location) {
    const locationLower = filters.location.toLowerCase();
    filteredData = filteredData.filter(
      (event) =>
        event.venue?.name?.toLowerCase().includes(locationLower) ||
        event.venue?.city?.toLowerCase().includes(locationLower)
    );
  }

  return { data: filteredData as Event[], count };
}

export function useInfiniteApprovedEvents(options: Omit<UseApprovedEventsOptions, 'page'> = {}) {
  const { categoryId, categoryIds, filters, sortBy = "date_asc", limit = 20 } = options;

  return useInfiniteQuery({
    queryKey: ["events", "approved", "infinite", categoryId, categoryIds, filters, sortBy, limit],
    queryFn: async ({ pageParam = 0 }) => {
      return fetchApprovedEvents({ categoryId, categoryIds, filters, sortBy, page: pageParam, limit });
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const totalLoaded = allPages.reduce((sum, p) => sum + p.data.length, 0);
      if (lastPage.count && totalLoaded < lastPage.count) {
        return allPages.length;
      }
      return undefined;
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
          venue:venues(*),
          host:hosts(*),
          event_categories(
            category:categories(*)
          )
        `)
        .eq("status", "approved")
        .eq("featured", true)
        .gte("start_time", new Date().toISOString())
        .order("start_time", { ascending: true })
        .limit(3);

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
          venue:venues(*),
          host:hosts(*),
          event_categories(
            category:categories(*)
          )
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

export function useBulkUpdateEvents() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      eventIds,
      updates,
      categoryIds,
    }: {
      eventIds: string[];
      updates: {
        price_min?: number | null;
        price_max?: number | null;
        is_free?: boolean;
      };
      categoryIds?: string[];
    }) => {
      // 1. Update basic fields
      if (Object.keys(updates).length > 0) {
        const { error } = await supabase
          .from("events")
          .update(updates)
          .in("id", eventIds);
        if (error) throw error;
      }

      // 2. Update Categories (if provided)
      if (categoryIds) {
        // Remove existing associations for these events
        const { error: deleteError } = await supabase
          .from("event_categories")
          .delete()
          .in("event_id", eventIds);

        if (deleteError) throw deleteError;

        // Insert new associations
        if (categoryIds.length > 0) {
          const associations = [];
          for (const eventId of eventIds) {
            for (const catId of categoryIds) {
              associations.push({ event_id: eventId, category_id: catId });
            }
          }
          const { error: insertError } = await supabase.from("event_categories").insert(associations);
          if (insertError) throw insertError;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });
}
