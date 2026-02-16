import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface StyleSettings {
    backgroundMode: "solid" | "gradient" | "parallax-icons";
    backgroundSolidColor: string;
    backgroundGradientFrom: string;
    backgroundGradientTo: string;
    backgroundGradientAngle: number;
    navBlur: number;         // px 0–24
    navOpacity: number;      // 0–1
    cardDarkness: number;    // 0–100 (%)
    cardOpacity: number;     // 0–1
    cardBlur: number;        // px 0–24
}

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
    site_styles?: StyleSettings;
    [key: string]: any;
}

export const DEFAULT_STYLES: StyleSettings = {
    backgroundMode: "solid",
    backgroundSolidColor: "220 20% 97%",
    backgroundGradientFrom: "220 30% 8%",
    backgroundGradientTo: "217 91% 50%",
    backgroundGradientAngle: 135,
    navBlur: 12,
    navOpacity: 0.85,
    cardDarkness: 0,
    cardOpacity: 1,
    cardBlur: 0,
};

export function useSettings() {
    return useQuery({
        queryKey: ["settings"],
        queryFn: async () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data, error } = await (supabase as any).from("settings").select("*");
            if (error) throw error;

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