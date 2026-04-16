import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  color: string | null;
  sort_order: number | null;
}

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, slug, icon, color, sort_order")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as Category[];
    },
    staleTime: 10 * 60 * 1000, // categories rarely change — 10 min
  });
}
