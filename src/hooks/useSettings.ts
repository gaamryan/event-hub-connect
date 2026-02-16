import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Settings {
    pagination_limit?: { value: number };
    nav_visibility?: {
        saved: boolean;
        admin: boolean;
    };
    import_template?: string;
    site_theme?: {
        colors: {
            primary: string;
            secondary: string;
            background: string;
            foreground: string;
            card: string;
            accent: string;
            border: string;
        };
        radius: string;
        fonts: {
            heading: string;
            body: string;
        };
    };
    [key: string]: any;
}

export function useSettings() {
    return useQuery({
        queryKey: ["settings"],
        queryFn: async () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data, error } = await (supabase as any).from("settings").select("*");
            if (error) throw error;

            // Transform array to object
            const settingsObject: Settings = {};
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            data.forEach((item: any) => {
                settingsObject[item.key] = item.value;
            });
            return settingsObject;
        },
    });
}

export function useUpdateSetting() {
    const queryClient = useQueryClient();

    return useMutation({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mutationFn: async ({ key, value }: { key: string; value: any }) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error } = await (supabase as any).from("settings")
                .upsert({ key, value });
            if (error) throw error;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["settings"] });
            toast.success(`Updated ${variables.key.replace('_', ' ')}`);
        },
        onError: (error) => {
            console.error("Failed to update setting:", error);
            toast.error("Failed to update setting");
        },
    });
}
