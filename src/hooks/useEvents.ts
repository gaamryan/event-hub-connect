import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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

export function useApprovedEvents(categoryId?: string | null) {
  return useQuery({
    queryKey: ["events", "approved", categoryId],
    queryFn: async () => {
      let query = supabase
        .from("events")
        .select(`
          *,
          venue:venues(id, name, city),
          host:hosts(id, name),
          category:categories(id, name, slug, icon, color)
        `)
        .eq("status", "approved")
        .order("start_time", { ascending: true });

      if (categoryId) {
        query = query.eq("category_id", categoryId);
      }

      const { data, error } = await query;
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
