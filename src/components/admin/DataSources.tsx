
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Trash2, RefreshCw, CheckCircle2, AlertCircle, Plus } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

interface DataSource {
    id: string;
    type: "eventbrite" | "meetup";
    organizer_id: string;
    last_sync_at: string | null;
    is_active: boolean;
    sync_frequency: string;
}

export function DataSources() {
    const queryClient = useQueryClient();
    const [isConnecting, setIsConnecting] = useState<string | null>(null);

    const { data: sources, isLoading } = useQuery({
        queryKey: ["data-sources"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("data_sources")
                .select("*")
                .order("created_at", { ascending: false });
            if (error) throw error;
            return data as DataSource[];
        },
    });

    const syncMutation = useMutation({
        mutationFn: async () => {
            const { data, error } = await supabase.functions.invoke("sync-events");
            if (error) throw error;
            return data;
        },
        onSuccess: (data) => {
            toast.success(`Sync started. Results: ${JSON.stringify(data.results)}`);
            queryClient.invalidateQueries({ queryKey: ["data-sources"] });
            queryClient.invalidateQueries({ queryKey: ["events"] });
        },
        onError: (error) => {
            toast.error(`Sync failed: ${error.message}`);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from("data_sources").delete().eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success("Source disconnected");
            queryClient.invalidateQueries({ queryKey: ["data-sources"] });
        }
    });

    const handleConnect = async (type: "eventbrite" | "meetup") => {
        setIsConnecting(type);
        try {
            const redirectUri = window.location.origin + "/admin";

            if (type === "eventbrite") {
                // Placeholder for Oauth Redirect
                toast.info("OAuth flow requires Eventbrite Client ID configuration. See implementation plan.");
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
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => syncMutation.mutate()}
                    disabled={syncMutation.isPending}
                >
                    <RefreshCw className={`mr-2 h-4 w-4 ${syncMutation.isPending ? "animate-spin" : ""}`} />
                    Sync All Now
                </Button>
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
                            <Button onClick={() => handleConnect('eventbrite')} variant="outline">Connect Eventbrite</Button>
                            <Button onClick={() => handleConnect('meetup')} variant="outline" disabled>Connect Meetup (Coming Soon)</Button>
                        </div>
                    </div>
                </Card>

                {/* List Sources */}
                {isLoading ? (
                    <div className="col-span-full text-center py-10">Loading sources...</div>
                ) : sources?.map((source) => (
                    <Card key={source.id}>
                        <CardHeader className="pb-3">
                            <div className="flex justify-between items-start">
                                <CardTitle className="capitalize flex items-center gap-2">
                                    {source.type}
                                    {source.is_active ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <AlertCircle className="h-4 w-4 text-yellow-500" />}
                                </CardTitle>
                                <Badge variant="outline">{source.sync_frequency}</Badge>
                            </div>
                            <CardDescription className="font-mono text-xs truncate">
                                ID: {source.organizer_id}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pb-3 text-sm text-muted-foreground">
                            <p>Last Sync: {source.last_sync_at ? format(new Date(source.last_sync_at), "PP p") : "Never"}</p>
                        </CardContent>
                        <CardFooter className="justify-end pt-0">
                            <Button variant="ghost" size="sm" className="text-destructive h-8" onClick={() => deleteMutation.mutate(source.id)}>
                                <Trash2 className="h-4 w-4 mr-2" />
                                Disconnect
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </div>
    );
}
