import { useEffect } from "react";
import { useSettings } from "@/hooks/useSettings";

export function ThemeApplicator() {
    const { data: settings } = useSettings();

    useEffect(() => {
        if (!settings?.site_theme) return;

        const theme = settings.site_theme;
        const root = document.documentElement;

        // Apply Colors
        if (theme.colors) {
            Object.entries(theme.colors).forEach(([key, value]) => {
                // Convert hex to HSL if necessary, or assume stored as usable value
                // Our system uses HSL values (without hsl() wrapper) for some vars
                // But let's assume the editor saves exact CSS values or we handle conversion here.
                // For simplicity, we'll assume the value stored is the direct CSS value (e.g. "12 100% 62%")

                // Map common keys to CSS vars
                switch (key) {
                    case 'primary': root.style.setProperty('--primary', value as string); break;
                    case 'secondary': root.style.setProperty('--secondary', value as string); break;
                    case 'background': root.style.setProperty('--background', value as string); break;
                    case 'foreground': root.style.setProperty('--foreground', value as string); break;
                    case 'card': root.style.setProperty('--card', value as string); break;
                    case 'accent': root.style.setProperty('--accent', value as string); break;
                    case 'border': root.style.setProperty('--border', value as string); break;
                }
            });
        }

        // Apply Radius
        if (theme.radius) {
            root.style.setProperty('--radius', theme.radius);
        }

        // Apply Fonts (conceptually, would need to load fonts or set family)
        if (theme.fonts?.heading) {
            // This might need more complex handling to load Google Fonts dynamically
            // root.style.setProperty('--font-heading', theme.fonts.heading);
        }

    }, [settings]);

    return null;
}
