import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Event } from "./useEvents";

export function useSingleEvent(eventId: string | undefined) {
  return useQuery({
    queryKey: ["event", eventId],
    queryFn: async () => {
      if (!eventId) throw new Error("Event ID is required");

      const { data, error } = await supabase
        .from("events")
        .select(`
          *,
          venue:venues(id, name, city, address_line_1, address_line_2, state, postal_code, latitude, longitude),
          host:hosts(id, name, logo_url, website_url),
          category:categories(id, name, slug, icon, color)
        `)
        .eq("id", eventId)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("Event not found");

      return data as Event & {
        venue: {
          id: string;
          name: string;
          city: string | null;
          address_line_1: string | null;
          address_line_2: string | null;
          state: string | null;
          postal_code: string | null;
          latitude: number | null;
          longitude: number | null;
        } | null;
        host: {
          id: string;
          name: string;
          logo_url: string | null;
          website_url: string | null;
        } | null;
      };
    },
    enabled: !!eventId,
  });
}
