import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "https://esm.sh/web-push@3.6.7";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WebPushError extends Error {
    statusCode?: number;
}

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { user_id, title, body, url } = await req.json();

        if (!user_id || !title) {
            throw new Error("Missing user_id or title");
        }

        // Configure VAPID
        const vapidEmail = Deno.env.get("VAPID_EMAIL") || "mailto:admin@example.com";
        const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
        const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");

        if (!vapidPublicKey || !vapidPrivateKey) {
            throw new Error("Missing VAPID keys configuration");
        }

        webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);

        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Note: push_subscriptions table would need to be created for this to work
        // For now, return a message indicating setup is needed
        return new Response(JSON.stringify({ 
            message: "Push notifications require push_subscriptions table setup",
            user_id,
            title
        }), {
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
