import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ColorOrGradient {
    mode: "solid" | "gradient";
    color: string;
    gradientFrom: string;
    gradientTo: string;
    gradientAngle: number;
}

export interface StyleSettings {
    backgroundMode: "solid" | "gradient" | "parallax-icons";
    backgroundSolidColor: string;
    backgroundGradientFrom: string;
    backgroundGradientTo: string;
    backgroundGradientAngle: number;
    // Nav
    navBlur: number;
    navOpacity: number;
    navBg: ColorOrGradient;
    navTextColor: string;
    // Cards
    cardDarkness: number;
    cardOpacity: number;
    cardBlur: number;
    cardBg: ColorOrGradient;
    cardTextColor: string;
    // Inputs
    inputBg: ColorOrGradient;
    inputTextColor: string;
    // Buttons
    btnDefaultBg: ColorOrGradient;
    btnDefaultText: string;
    btnDefaultHoverBg: string;
    btnOutlineBorder: string;
    btnOutlineText: string;
    btnOutlineHoverBg: string;
    btnDestructiveBg: string;
    btnDestructiveText: string;
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

const defaultCog = (color: string): ColorOrGradient => ({
    mode: "solid", color, gradientFrom: color, gradientTo: color, gradientAngle: 135,
});

export const DEFAULT_STYLES: StyleSettings = {
    backgroundMode: "solid",
    backgroundSolidColor: "210 25% 97%",
    backgroundGradientFrom: "210 30% 6%",
    backgroundGradientTo: "190 95% 32%",
    backgroundGradientAngle: 135,
    navBlur: 12,
    navOpacity: 0.85,
    navBg: defaultCog("0 0% 100%"),
    navTextColor: "210 12% 40%",
    cardDarkness: 0,
    cardOpacity: 1,
    cardBlur: 0,
    cardBg: defaultCog("0 0% 100%"),
    cardTextColor: "210 30% 8%",
    inputBg: defaultCog("0 0% 100%"),
    inputTextColor: "210 30% 8%",
    btnDefaultBg: defaultCog("190 95% 32%"),
    btnDefaultText: "0 0% 100%",
    btnDefaultHoverBg: "190 95% 28%",
    btnOutlineBorder: "210 16% 88%",
    btnOutlineText: "210 30% 8%",
    btnOutlineHoverBg: "210 20% 95%",
    btnDestructiveBg: "0 84% 60%",
    btnDestructiveText: "0 0% 100%",
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