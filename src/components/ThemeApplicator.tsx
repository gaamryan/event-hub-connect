import { useEffect } from "react";
import { useSettings, DEFAULT_STYLES } from "@/hooks/useSettings";

export function ThemeApplicator() {
    const { data: settings } = useSettings();

    useEffect(() => {
        const root = document.documentElement;

        // Apply color theme
        if (settings?.site_theme?.colors) {
            const { colors } = settings.site_theme;
            const map: Record<string, string> = {
                primary: '--primary',
                secondary: '--secondary',
                background: '--background',
                foreground: '--foreground',
                card: '--card',
                accent: '--accent',
                border: '--border',
            };
            Object.entries(map).forEach(([key, cssVar]) => {
                if (colors[key as keyof typeof colors]) {
                    root.style.setProperty(cssVar, colors[key as keyof typeof colors]);
                }
            });
        }

        if (settings?.site_theme?.radius) {
            root.style.setProperty('--radius', settings.site_theme.radius);
        }

        // Apply style settings
        const styles = settings?.site_styles ?? DEFAULT_STYLES;
        
        root.style.setProperty('--nav-blur', `${styles.navBlur}px`);
        root.style.setProperty('--nav-opacity', `${styles.navOpacity}`);
        root.style.setProperty('--card-darkness', `${styles.cardDarkness}%`);
        root.style.setProperty('--card-opacity', `${styles.cardOpacity}`);
        root.style.setProperty('--card-blur', `${styles.cardBlur}px`);

        // Apply background mode
        if (styles.backgroundMode === "gradient") {
            root.style.setProperty(
                '--background',
                styles.backgroundGradientFrom || DEFAULT_STYLES.backgroundGradientFrom
            );
            document.body.style.background = `linear-gradient(${styles.backgroundGradientAngle}deg, hsl(${styles.backgroundGradientFrom}), hsl(${styles.backgroundGradientTo}))`;
            document.body.style.backgroundAttachment = 'fixed';
        } else if (styles.backgroundMode === "parallax-icons") {
            root.style.setProperty('--background', styles.backgroundSolidColor || DEFAULT_STYLES.backgroundSolidColor);
            document.body.style.background = '';
            document.body.style.backgroundAttachment = '';
        } else {
            // solid
            root.style.setProperty('--background', styles.backgroundSolidColor || DEFAULT_STYLES.backgroundSolidColor);
            document.body.style.background = '';
            document.body.style.backgroundAttachment = '';
        }

        return () => {
            document.body.style.background = '';
            document.body.style.backgroundAttachment = '';
        };
    }, [settings]);

    // Parallax game icons background
    const styles = settings?.site_styles;
    if (styles?.backgroundMode === "parallax-icons") {
        return (
            <div 
                className="fixed inset-0 -z-10 overflow-hidden pointer-events-none"
                style={{ background: `hsl(${styles.backgroundSolidColor || DEFAULT_STYLES.backgroundSolidColor})` }}
            >
                <div 
                    className="absolute inset-0 opacity-[0.06] text-foreground"
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Ctext x='10' y='25' font-size='20'%3E🎮%3C/text%3E%3Ctext x='35' y='50' font-size='16'%3E🕹️%3C/text%3E%3C/svg%3E")`,
                        backgroundSize: '80px 80px',
                        animation: 'parallax-scroll 40s linear infinite',
                    }}
                />
                <style>{`
                    @keyframes parallax-scroll {
                        0% { transform: translateY(0); }
                        100% { transform: translateY(-80px); }
                    }
                `}</style>
            </div>
        );
    }

    return null;
}