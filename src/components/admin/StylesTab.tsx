import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useSettings, useUpdateSetting, DEFAULT_STYLES, type StyleSettings } from "@/hooks/useSettings";
import { Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// HSL string "210 100% 45%" <-> hex conversion
function hslStringToHex(hslStr: string): string {
    try {
        const parts = hslStr.trim().split(/[\s,]+/);
        const h = parseFloat(parts[0]) / 360;
        const s = parseFloat(parts[1]) / 100;
        const l = parseFloat(parts[2]) / 100;
        const hue2rgb = (p: number, q: number, t: number) => {
            if (t < 0) t += 1; if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };
        let r, g, b;
        if (s === 0) { r = g = b = l; } else {
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }
        const toHex = (c: number) => Math.round(c * 255).toString(16).padStart(2, '0');
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    } catch { return "#3b82f6"; }
}

function hexToHslString(hex: string): string {
    try {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (!result) return "210 100% 45%";
        let r = parseInt(result[1], 16) / 255;
        let g = parseInt(result[2], 16) / 255;
        let b = parseInt(result[3], 16) / 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h = 0, s = 0;
        const l = (max + min) / 2;
        if (max !== min) {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
                case g: h = ((b - r) / d + 2) / 6; break;
                case b: h = ((r - g) / d + 4) / 6; break;
            }
        }
        return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
    } catch { return "210 100% 45%"; }
}

const DEFAULT_THEME = {
    colors: {
        primary: "190 95% 39%",
        secondary: "210 20% 93%",
        background: "210 25% 97%",
        foreground: "210 30% 8%",
        card: "0 0% 100%",
        accent: "200 100% 44%",
        border: "210 16% 88%"
    },
    radius: "1rem",
    fonts: {
        heading: "Inter, sans-serif",
        body: "Inter, sans-serif"
    }
};

export function StylesTab() {
    const { data: settings, isLoading } = useSettings();
    const updateSetting = useUpdateSetting();

    const [theme, setTheme] = useState<any>(null);
    const [styles, setStyles] = useState<StyleSettings>(DEFAULT_STYLES);

    useEffect(() => {
        if (settings?.site_theme) {
            setTheme(settings.site_theme);
        } else if (!isLoading && settings) {
            setTheme(DEFAULT_THEME);
        }
    }, [settings, isLoading]);

    useEffect(() => {
        if (settings?.site_styles) {
            setStyles(settings.site_styles);
        } else if (!isLoading && settings) {
            setStyles(DEFAULT_STYLES);
        }
    }, [settings, isLoading]);

    const handleColorChange = (key: string, value: string) => {
        setTheme((prev: any) => ({
            ...prev,
            colors: { ...prev.colors, [key]: value }
        }));
    };

    const handleRadiusChange = (value: string) => {
        setTheme((prev: any) => ({ ...prev, radius: value }));
    };

    const updateStyle = <K extends keyof StyleSettings>(key: K, value: StyleSettings[K]) => {
        setStyles(prev => ({ ...prev, [key]: value }));
    };

    const saveAll = async () => {
        try {
            await updateSetting.mutateAsync({ key: "site_theme", value: theme });
            await updateSetting.mutateAsync({ key: "site_styles", value: styles });
        } catch {}
    };

    const resetDefaults = () => {
        setTheme(DEFAULT_THEME);
        setStyles(DEFAULT_STYLES);
        toast.info("Defaults restored (unsaved). Click Save to apply.");
    };

    if (isLoading || !theme) {
        return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-muted-foreground" /></div>;
    }

    return (
        <div className="max-w-2xl space-y-8 p-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Theme & Styles</h3>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={resetDefaults}>
                        <RotateCcw className="w-4 h-4 mr-2" /> Reset
                    </Button>
                    <Button onClick={saveAll} disabled={updateSetting.isPending}>
                        {updateSetting.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                </div>
            </div>

            {/* Colors */}
            <div className="space-y-4 border p-4 rounded-lg bg-card">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Brand Colors (HSL)</h4>
                <p className="text-xs text-muted-foreground">Enter HSL values like <code>217 91% 50%</code></p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                        { key: "primary", label: "Primary (Brand)" },
                        { key: "background", label: "Background" },
                        { key: "card", label: "Card Background" },
                        { key: "accent", label: "Accent" },
                        { key: "foreground", label: "Text" },
                        { key: "border", label: "Border" },
                    ].map(({ key, label }) => (
                        <div key={key} className="space-y-2">
                            <Label>{label}</Label>
                            <div className="flex gap-2 items-center">
                                <label className="relative w-8 h-8 rounded border flex-shrink-0 cursor-pointer overflow-hidden">
                                    <input
                                        type="color"
                                        value={hslStringToHex(theme.colors[key])}
                                        onChange={(e) => handleColorChange(key, hexToHslString(e.target.value))}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                    <div className="w-full h-full" style={{ backgroundColor: `hsl(${theme.colors[key]})` }} />
                                </label>
                                <Input value={theme.colors[key]} onChange={(e) => handleColorChange(key, e.target.value)} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Border Radius */}
            <div className="space-y-4 border p-4 rounded-lg bg-card">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Shape</h4>
                <div className="space-y-2">
                    <Label>Border Radius</Label>
                    <Input value={theme.radius} onChange={(e) => handleRadiusChange(e.target.value)} placeholder="1rem" />
                </div>
            </div>

            {/* Background Mode */}
            <div className="space-y-4 border p-4 rounded-lg bg-card">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Background</h4>
                
                <div className="space-y-2">
                    <Label>Mode</Label>
                    <Select value={styles.backgroundMode} onValueChange={(v) => updateStyle("backgroundMode", v as StyleSettings["backgroundMode"])}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="solid">Solid Color</SelectItem>
                            <SelectItem value="gradient">Gradient</SelectItem>
                            <SelectItem value="parallax-icons">Parallax Game Icons</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {styles.backgroundMode === "solid" && (
                    <div className="space-y-2">
                        <Label>Background Color (HSL)</Label>
                        <div className="flex gap-2">
                            <div className="w-8 h-8 rounded border flex-shrink-0" style={{ backgroundColor: `hsl(${styles.backgroundSolidColor})` }} />
                            <Input value={styles.backgroundSolidColor} onChange={(e) => updateStyle("backgroundSolidColor", e.target.value)} />
                        </div>
                    </div>
                )}

                {styles.backgroundMode === "gradient" && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>From (HSL)</Label>
                                <div className="flex gap-2">
                                    <div className="w-8 h-8 rounded border flex-shrink-0" style={{ backgroundColor: `hsl(${styles.backgroundGradientFrom})` }} />
                                    <Input value={styles.backgroundGradientFrom} onChange={(e) => updateStyle("backgroundGradientFrom", e.target.value)} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>To (HSL)</Label>
                                <div className="flex gap-2">
                                    <div className="w-8 h-8 rounded border flex-shrink-0" style={{ backgroundColor: `hsl(${styles.backgroundGradientTo})` }} />
                                    <Input value={styles.backgroundGradientTo} onChange={(e) => updateStyle("backgroundGradientTo", e.target.value)} />
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Angle: {styles.backgroundGradientAngle}°</Label>
                            <Slider
                                value={[styles.backgroundGradientAngle]}
                                onValueChange={([v]) => updateStyle("backgroundGradientAngle", v)}
                                min={0} max={360} step={5}
                            />
                        </div>
                    </div>
                )}

                {styles.backgroundMode === "parallax-icons" && (
                    <div className="space-y-2">
                        <Label>Base Color (HSL)</Label>
                        <div className="flex gap-2">
                            <div className="w-8 h-8 rounded border flex-shrink-0" style={{ backgroundColor: `hsl(${styles.backgroundSolidColor})` }} />
                            <Input value={styles.backgroundSolidColor} onChange={(e) => updateStyle("backgroundSolidColor", e.target.value)} />
                        </div>
                        <p className="text-xs text-muted-foreground">Subtle game controller icons scroll in the background</p>
                    </div>
                )}
            </div>

            {/* Navigation Glass */}
            <div className="space-y-4 border p-4 rounded-lg bg-card">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Navigation Bar</h4>

                <div className="space-y-2">
                    <Label>Frosted Glass Blur: {styles.navBlur}px</Label>
                    <Slider value={[styles.navBlur]} onValueChange={([v]) => updateStyle("navBlur", v)} min={0} max={24} step={1} />
                </div>
                <div className="space-y-2">
                    <Label>Background Opacity: {Math.round(styles.navOpacity * 100)}%</Label>
                    <Slider value={[styles.navOpacity * 100]} onValueChange={([v]) => updateStyle("navOpacity", v / 100)} min={10} max={100} step={5} />
                </div>
            </div>

            {/* Card Styles */}
            <div className="space-y-4 border p-4 rounded-lg bg-card">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Event Cards</h4>

                <div className="space-y-2">
                    <Label>Dark Overlay: {styles.cardDarkness}%</Label>
                    <Slider value={[styles.cardDarkness]} onValueChange={([v]) => updateStyle("cardDarkness", v)} min={0} max={60} step={1} />
                </div>
                <div className="space-y-2">
                    <Label>Background Opacity: {Math.round(styles.cardOpacity * 100)}%</Label>
                    <Slider value={[styles.cardOpacity * 100]} onValueChange={([v]) => updateStyle("cardOpacity", v / 100)} min={10} max={100} step={5} />
                </div>
                <div className="space-y-2">
                    <Label>Frosted Glass Blur: {styles.cardBlur}px</Label>
                    <Slider value={[styles.cardBlur]} onValueChange={([v]) => updateStyle("cardBlur", v)} min={0} max={24} step={1} />
                </div>
            </div>

            {/* Preview bar */}
            <div className="border p-4 rounded-lg space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Live Preview</h4>
                <div 
                    className="rounded-xl p-4 border"
                    style={{
                        background: `hsl(var(--card) / ${styles.cardOpacity})`,
                        backdropFilter: `blur(${styles.cardBlur}px)`,
                    }}
                >
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-lg bg-primary" />
                        <div>
                            <div className="font-semibold text-card-foreground">Sample Event Card</div>
                            <div className="text-sm text-muted-foreground">Preview of card styling</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}