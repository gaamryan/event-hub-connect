
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // 1. Get active data sources
        const { data: sources, error: sourceError } = await supabase
            .from("data_sources")
            .select("*")
            .eq("is_active", true);

        if (sourceError) throw sourceError;

        const results = [];

        for (const source of sources) {
            if (source.type === "eventbrite") {
                try {
                    // Fetch events from Eventbrite
                    const ebRes = await fetch(
                        `https://www.eventbriteapi.com/v3/organizations/${source.organizer_id}/events/?status=live&order_by=start_asc`,
                        {
                            headers: { Authorization: `Bearer ${source.access_token}` },
                        }
                    );

                    if (!ebRes.ok) {
                        console.error(`Failed to sync source ${source.id}: ${ebRes.statusText}`);
                        continue;
                    }

                    const ebData = await ebRes.json();
                    const events = ebData.events || [];

                    for (const ev of events) {
                        // Upsert event
                        const { error: upsertError } = await supabase.from("events").upsert(
                            {
                                title: ev.name.text,
                                description: ev.description.text,
                                start_time: ev.start.utc,
                                end_time: ev.end.utc,
                                source: "eventbrite",
                                source_url: ev.url,
                                image_url: ev.logo?.url || null,
                                status: "approved", // Auto-approve trusted sources? Or keep 'pending'
                                // We'd store the external ID to avoid dupes, but schema doesn't have it yet.
                                // Using source_url as unique key might work if constrained?
                                // For now, let's just insert/update based on title+date or similar if we had a constraint
                                // Or simply rely on source_url if we add a unique constraint there.
                            },
                            { onConflict: "source_url" } // Assuming we add this constraint or use a different unique key
                        );
                        if (upsertError) console.error("Error upserting event", upsertError);
                    }

                    results.push({ source: source.id, eventsSynced: events.length });

                    // Update last_sync_at
                    await supabase
                        .from("data_sources")
                        .update({ last_sync_at: new Date().toISOString() })
                        .eq("id", source.id);

                } catch (err) {
                    console.error(`Error processing source ${source.id}`, err);
                }
            }
        }

        return new Response(JSON.stringify({ results }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
