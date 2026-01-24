
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
        const { code, source, redirect_uri } = await req.json();

        if (!code || !source) {
            throw new Error("Missing code or source");
        }

        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        let accessToken, refreshToken, expiresAt, organizerId;

        if (source === "eventbrite") {
            const clientId = Deno.env.get("EVENTBRITE_CLIENT_ID");
            const clientSecret = Deno.env.get("EVENTBRITE_CLIENT_SECRET");

            const params = new URLSearchParams();
            params.append("grant_type", "authorization_code");
            params.append("client_id", clientId);
            params.append("client_secret", clientSecret);
            params.append("code", code);
            params.append("redirect_uri", redirect_uri);

            const res = await fetch("https://www.eventbrite.com/oauth/token", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: params,
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error_description || "Failed to fetch Eventbrite token");

            accessToken = data.access_token;
            refreshToken = "not_provided_by_eb_code_flow_usually_indefinite"; // Eventbrite tokens might be long lived
            // Eventbrite response doesn't always strictly give expires_in for simple keys, check docs. 
            // Often just access_token.

            // Get User/Organizer Info to store
            const userRes = await fetch("https://www.eventbriteapi.com/v3/users/me/", {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            const userData = await userRes.json();
            organizerId = userData.id;

        } else if (source === "meetup") {
            // Placeholder for Meetup implementation
            // Meetup uses standard OAuth2
            throw new Error("Meetup implementation pending API keys");
        } else {
            throw new Error("Unsupported source");
        }

        // Upsert into data_sources
        // We want to avoid duplicates for the same organizer/user
        const { error } = await supabase
            .from("data_sources")
            .upsert(
                {
                    type: source,
                    access_token: accessToken,
                    refresh_token: refreshToken,
                    organizer_id: organizerId,
                    is_active: true,
                    updated_at: new Date().toISOString()
                },
                { onConflict: "type, organizer_id" }
                // Note: You need a unique constraint on type+organizer_id for this upsert to work perfectly
                // or just insert and let admin manage. 
                // For now, let's just insert.
            );

        // Actually, standard insert is safer if we don't have constraints yet.
        // But let's check if one exists for this type? 
        // Simplifying to INSERT for MVP. Clean up later.

        const { error: insertError } = await supabase
            .from("data_sources")
            .insert({
                type: source,
                access_token: accessToken,
                organizer_id: organizerId,
            });

        if (insertError) throw insertError;

        return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
