import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSettings, useUpdateSetting } from "@/hooks/useSettings";
import { Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";

const DEFAULT_THEME = {
    colors: {
        primary: "12 100% 62%",
        secondary: "220 14% 96%",
        background: "0 0% 98%",
        foreground: "220 20% 10%",
        card: "0 0% 100%",
        accent: "173 80% 40%",
        border: "220 13% 91%"
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

    useEffect(() => {
        if (settings?.site_theme) {
            setTheme(settings.site_theme);
        } else if (!isLoading && settings) {
            // If loaded but no theme found, use defaults
            setTheme(DEFAULT_THEME);
        }
    }, [settings, isLoading]);

    const handleColorChange = (key: string, value: string) => {
        setTheme((prev: any) => ({
            ...prev,
            colors: {
                ...prev.colors,
                [key]: value
            }
        }));
    };

    const handleRadiusChange = (value: string) => {
        setTheme((prev: any) => ({ ...prev, radius: value }));
    };

    const saveTheme = () => {
        updateSetting.mutate({
            key: "site_theme",
            value: theme
        });
    };

    const resetDefaults = () => {
        setTheme(DEFAULT_THEME);
        toast.info("Defaults restored (unsaved). Click Save to apply.");
    };

    if (isLoading || !theme) {
        return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-muted-foreground" /></div>;
    }

    return (
        <div className="max-w-2xl space-y-8 p-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Theme Editor</h3>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={resetDefaults}>
                        <RotateCcw className="w-4 h-4 mr-2" /> Reset
                    </Button>
                    <Button onClick={saveTheme} disabled={updateSetting.isPending}>
                        {updateSetting.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                </div>
            </div>

            <div className="grid gap-6">
                <div className="space-y-4 border p-4 rounded-lg bg-card">
                    <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Colors (HSL)</h4>
                    <p className="text-xs text-muted-foreground">Enter HSL values like <code>220 10% 20%</code></p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Primary (Brand)</Label>
                            <div className="flex gap-2">
                                <div className="w-8 h-8 rounded border" style={{ backgroundColor: `hsl(${theme.colors.primary})` }} />
                                <Input value={theme.colors.primary} onChange={(e) => handleColorChange('primary', e.target.value)} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Background</Label>
                            <div className="flex gap-2">
                                <div className="w-8 h-8 rounded border" style={{ backgroundColor: `hsl(${theme.colors.background})` }} />
                                <Input value={theme.colors.background} onChange={(e) => handleColorChange('background', e.target.value)} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Card Background</Label>
                            <div className="flex gap-2">
                                <div className="w-8 h-8 rounded border" style={{ backgroundColor: `hsl(${theme.colors.card})` }} />
                                <Input value={theme.colors.card} onChange={(e) => handleColorChange('card', e.target.value)} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Accent</Label>
                            <div className="flex gap-2">
                                <div className="w-8 h-8 rounded border" style={{ backgroundColor: `hsl(${theme.colors.accent})` }} />
                                <Input value={theme.colors.accent} onChange={(e) => handleColorChange('accent', e.target.value)} />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-4 border p-4 rounded-lg bg-card">
                    <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Shape & Layout</h4>

                    <div className="space-y-2">
                        <Label>Border Radius</Label>
                        <div className="flex gap-2 items-center">
                            <Input
                                value={theme.radius}
                                onChange={(e) => handleRadiusChange(e.target.value)}
                                placeholder="1rem"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
