import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { toast } from "sonner";

export function DataSources() {
    const [isConnecting, setIsConnecting] = useState<string | null>(null);

    const handleConnect = async (type: "eventbrite" | "meetup") => {
        setIsConnecting(type);
        try {
            if (type === "eventbrite") {
                toast.info("OAuth flow requires Eventbrite Client ID configuration. Use the Import button to import events via URL for now.");
            } else {
                toast.info("Meetup integration coming soon!");
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsConnecting(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold tracking-tight">Data Sources</h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {/* Connect New */}
                <Card className="flex flex-col justify-center items-center p-6 border-dashed border-2">
                    <div className="text-center space-y-4">
                        <div className="p-3 bg-secondary rounded-full w-12 h-12 flex items-center justify-center mx-auto">
                            <Plus className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <h3 className="font-semibold">Connect Source</h3>
                        <div className="flex flex-col gap-2 w-full">
                            <Button 
                                onClick={() => handleConnect('eventbrite')} 
                                variant="outline"
                                disabled={isConnecting === 'eventbrite'}
                            >
                                Connect Eventbrite
                            </Button>
                            <Button 
                                onClick={() => handleConnect('meetup')} 
                                variant="outline" 
                                disabled
                            >
                                Connect Meetup (Coming Soon)
                            </Button>
                        </div>
                    </div>
                </Card>

                {/* Info Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Import Events</CardTitle>
                        <CardDescription>
                            Use the Import button in the Events tab to import events from Eventbrite URLs. 
                            Full OAuth integration for automatic syncing coming soon.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        </div>
    );
}
