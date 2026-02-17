import { useSettings } from "@/hooks/useSettings";
import { BarChart3, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AnalyticsTab() {
    const { data: settings, isLoading } = useSettings();

    const lookerUrl = settings?.looker_studio_url;
    const gaId = settings?.ga_measurement_id;

    if (isLoading) {
        return <div className="p-8 flex justify-center"><div className="animate-pulse text-muted-foreground">Loading...</div></div>;
    }

    if (!lookerUrl) {
        return (
            <div className="p-4 text-center py-20">
                <div className="w-20 h-20 rounded-full bg-secondary mx-auto flex items-center justify-center mb-4">
                    <BarChart3 className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No Analytics Dashboard</h3>
                <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-4">
                    Set up a Looker Studio embed URL in the Settings tab to display your Google Analytics dashboard here.
                </p>
                {gaId && (
                    <Button variant="outline" asChild>
                        <a href={`https://analytics.google.com`} target="_blank" rel="noopener noreferrer">
                            Open Google Analytics <ExternalLink className="h-4 w-4 ml-2" />
                        </a>
                    </Button>
                )}
            </div>
        );
    }

    return (
        <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Analytics Dashboard</h3>
                <Button variant="outline" size="sm" asChild>
                    <a href="https://analytics.google.com" target="_blank" rel="noopener noreferrer">
                        Open GA4 <ExternalLink className="h-4 w-4 ml-1" />
                    </a>
                </Button>
            </div>
            <div className="rounded-xl border border-border overflow-hidden bg-card">
                <iframe
                    src={lookerUrl}
                    className="w-full border-0"
                    style={{ height: "calc(100vh - 240px)", minHeight: "500px" }}
                    allowFullScreen
                    sandbox="allow-storage-access-by-user-activation allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
                />
            </div>
        </div>
    );
}
