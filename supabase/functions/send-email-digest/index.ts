
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
        const resendApiKey = Deno.env.get("RESEND_API_KEY");
        if (!resendApiKey) throw new Error("Missing RESEND_API_KEY");

        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // 1. Get all users who follow categories
        // Distinct users from user_followed_categories
        const { data: userIds, error: userError } = await supabase
            .from("user_followed_categories")
            .select("user_id"); // Ideally distinct or group by

        if (userError) throw userError;

        // De-duplicate
        const uniqueUserIds = [...new Set(userIds.map(u => u.user_id))];
        const results = [];

        for (const uid of uniqueUserIds) {
            // Get User Email (Need to join with auth.users or profiles if email stored there)
            // Since we can't easily query auth.users directly via standard client without admin privilege,
            // using service key allows us to use admin.listUsers or just assume we have email in profiles?
            // Let's assume we can fetch email if we had it in profiles, or use admin auth api.
            // For MVP, using Supabase Admin Auth API

            const { data: { user }, error: authError } = await supabase.auth.admin.getUserById(uid);
            if (authError || !user?.email) continue;

            // Get followed categories for this user
            const { data: followed } = await supabase
                .from("user_followed_categories")
                .select("category_id")
                .eq("user_id", uid);

            const categoryIds = followed?.map(f => f.category_id) || [];
            if (categoryIds.length === 0) continue;

            // Find upcoming events in these categories (Next 7 days)
            const nextWeek = new Date();
            nextWeek.setDate(nextWeek.getDate() + 7);

            const { data: events } = await supabase
                .from("events")
                .select("title, start_time, id, image_url")
                .in("category_id", categoryIds)
                .gte("start_time", new Date().toISOString())
                .lte("start_time", nextWeek.toISOString())
                .eq("status", "approved")
                .limit(5);

            if (!events || events.length === 0) continue;

            // Generate Email HTML
            const eventListHtml = events.map(e => `
            <div style="margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 10px;">
                ${e.image_url ? `<img src="${e.image_url}" style="width:100%; max-width: 300px; height: auto;" />` : ''}
                <h3>${e.title}</h3>
                <p>${new Date(e.start_time).toDateString()}</p>
                <a href="${Deno.env.get("SITE_URL")}/events/${e.id}">View details</a>
            </div>
        `).join("");

            const html = `
            <h1>Your Weekly Event Digest</h1>
            <p>Here are some events happening this week based on your interests:</p>
            ${eventListHtml}
        `;

            // Send Email via Resend
            const res = await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${resendApiKey}`
                },
                body: JSON.stringify({
                    from: "EventHub <noreply@eventhub.local>", // Needs a verified domain
                    to: [user.email],
                    subject: "Upcoming Events This Week",
                    html: html
                })
            });

            if (res.ok) {
                results.push({ email: user.email, status: "sent" });
            } else {
                const err = await res.json();
                console.error(err);
                results.push({ email: user.email, status: "failed", error: err });
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
