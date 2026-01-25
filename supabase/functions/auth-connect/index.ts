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

        let accessToken: string;
        let organizerId: string;

        if (source === "eventbrite") {
            const clientId = Deno.env.get("EVENTBRITE_CLIENT_ID");
            const clientSecret = Deno.env.get("EVENTBRITE_CLIENT_SECRET");

            if (!clientId || !clientSecret) {
                throw new Error("Missing Eventbrite OAuth credentials");
            }

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

            // Get User/Organizer Info
            const userRes = await fetch("https://www.eventbriteapi.com/v3/users/me/", {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            const userData = await userRes.json();
            organizerId = userData.id;

        } else if (source === "meetup") {
            throw new Error("Meetup implementation pending API keys");
        } else {
            throw new Error("Unsupported source");
        }

        // For now, just return success - data_sources table doesn't exist yet
        // This would be used when OAuth flow is fully implemented

        return new Response(JSON.stringify({ success: true, organizerId }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return new Response(JSON.stringify({ error: message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
