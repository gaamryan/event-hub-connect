import { useEffect } from "react";
import { useSettings, DEFAULT_STYLES, type ColorOrGradient } from "@/hooks/useSettings";

function cogToCSS(cog: ColorOrGradient): string {
    if (cog.mode === "gradient") {
        return `linear-gradient(${cog.gradientAngle}deg, hsl(${cog.gradientFrom}), hsl(${cog.gradientTo}))`;
    }
    return `hsl(${cog.color})`;
}

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
        const s = { ...DEFAULT_STYLES, ...(settings?.site_styles ?? {}) };

        // Top Bar
        root.style.setProperty('--topbar-bg', cogToCSS(s.topBarBg));
        root.style.setProperty('--topbar-text', s.topBarTextColor);
        root.style.setProperty('--topbar-blur', `${s.topBarBlur}px`);
        root.style.setProperty('--topbar-opacity', `${s.topBarOpacity}`);

        // Bottom Nav
        root.style.setProperty('--nav-blur', `${s.navBlur}px`);
        root.style.setProperty('--nav-opacity', `${s.navOpacity}`);
        root.style.setProperty('--nav-bg', cogToCSS(s.navBg));
        root.style.setProperty('--nav-text', s.navTextColor);

        // Cards
        root.style.setProperty('--card-darkness', `${s.cardDarkness}%`);
        root.style.setProperty('--card-opacity', `${s.cardOpacity}`);
        root.style.setProperty('--card-blur', `${s.cardBlur}px`);
        root.style.setProperty('--card-bg-custom', cogToCSS(s.cardBg));
        root.style.setProperty('--card-text-custom', s.cardTextColor);

        // Inputs
        root.style.setProperty('--input-bg-custom', cogToCSS(s.inputBg));
        root.style.setProperty('--input-text-custom', s.inputTextColor);

        // Buttons
        root.style.setProperty('--btn-default-bg', cogToCSS(s.btnDefaultBg));
        root.style.setProperty('--btn-default-text', s.btnDefaultText);
        root.style.setProperty('--btn-default-hover-bg', s.btnDefaultHoverBg);
        root.style.setProperty('--btn-outline-border', s.btnOutlineBorder);
        root.style.setProperty('--btn-outline-text', s.btnOutlineText);
        root.style.setProperty('--btn-outline-hover-bg', s.btnOutlineHoverBg);
        root.style.setProperty('--btn-destructive-bg', s.btnDestructiveBg);
        root.style.setProperty('--btn-destructive-text', s.btnDestructiveText);

        // Page background
        if (s.backgroundMode === "gradient") {
            root.style.setProperty('--background', s.backgroundGradientFrom || DEFAULT_STYLES.backgroundGradientFrom);
            document.body.style.background = `linear-gradient(${s.backgroundGradientAngle}deg, hsl(${s.backgroundGradientFrom}), hsl(${s.backgroundGradientTo}))`;
            document.body.style.backgroundAttachment = 'fixed';
        } else if (s.backgroundMode === "parallax-icons") {
            root.style.setProperty('--background', s.backgroundSolidColor || DEFAULT_STYLES.backgroundSolidColor);
            document.body.style.background = '';
            document.body.style.backgroundAttachment = '';
        } else {
            root.style.setProperty('--background', s.backgroundSolidColor || DEFAULT_STYLES.backgroundSolidColor);
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