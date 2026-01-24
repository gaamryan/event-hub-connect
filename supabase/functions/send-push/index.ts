
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "https://esm.sh/web-push@3.6.7";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
        const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
        const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;

        webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);

        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Get active subscriptions for user
        const { data: subs, error } = await supabase
            .from("push_subscriptions")
            .select("*")
            .eq("user_id", user_id);

        if (error) throw error;

        const payload = JSON.stringify({
            title,
            body,
            url: url || "/",
            icon: "/icon-192x192.png" // Ensure this exists in public
        });

        const results = [];

        // Send to all endpoints
        for (const sub of subs) {
            try {
                const pushConfig = {
                    endpoint: sub.endpoint,
                    keys: {
                        p256dh: sub.p256dh,
                        auth: sub.auth
                    }
                };
                await webpush.sendNotification(pushConfig, payload);
                results.push({ id: sub.id, status: "sent" });
            } catch (err) {
                console.error(`Failed to send to sub ${sub.id}`, err);
                // If 410 Gone, remove subscription
                if (err.statusCode === 410) {
                    await supabase.from("push_subscriptions").delete().eq("id", sub.id);
                    results.push({ id: sub.id, status: "removed" });
                } else {
                    results.push({ id: sub.id, status: "error", error: err.message });
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
