import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ImportEventResponse {
  success: boolean;
  event?: any;
  message?: string;
  error?: string;
  existingId?: string;
}

export function useImportEventbrite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (url: string): Promise<ImportEventResponse> => {
      const { data, error } = await supabase.functions.invoke("import-eventbrite", {
        body: { url },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });
}
