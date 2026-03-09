import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STORAGE_BUCKET = "event-images";
const SUPABASE_STORAGE_PREFIX = "supabase.co/storage";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    // Get all events with external image URLs (not already in our storage)
    const { data: events, error: fetchError } = await supabase
      .from("events")
      .select("id, title, image_url")
      .not("image_url", "is", null)
      .not("image_url", "ilike", `%${SUPABASE_STORAGE_PREFIX}%`);

    if (fetchError) throw fetchError;

    if (!events || events.length === 0) {
      return new Response(
        JSON.stringify({ message: "No external images to migrate", migrated: 0, failed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${events.length} events with external images`);

    const results = { migrated: 0, failed: 0, errors: [] as string[] };

    for (const event of events) {
      try {
        if (!event.image_url) continue;

        console.log(`Processing: ${event.title} (${event.id})`);

        // Download the external image
        const imageResponse = await fetch(event.image_url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; ImageMigrator/1.0)",
            "Accept": "image/*",
          },
        });

        if (!imageResponse.ok) {
          throw new Error(`Failed to download: ${imageResponse.status} ${imageResponse.statusText}`);
        }

        const contentType = imageResponse.headers.get("content-type") || "image/jpeg";
        const imageBuffer = await imageResponse.arrayBuffer();

        // Determine file extension
        let ext = "jpg";
        if (contentType.includes("png")) ext = "png";
        else if (contentType.includes("gif")) ext = "gif";
        else if (contentType.includes("webp")) ext = "webp";

        // Generate unique filename
        const filename = `${Date.now()}_${Math.random().toString(36).substring(2, 6)}.${ext}`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(filename, imageBuffer, {
            contentType,
            upsert: false,
          });

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: urlData } = supabase.storage
          .from(STORAGE_BUCKET)
          .getPublicUrl(filename);

        const newImageUrl = urlData.publicUrl;

        // Update event with new URL
        const { error: updateError } = await supabase
          .from("events")
          .update({ image_url: newImageUrl })
          .eq("id", event.id);

        if (updateError) throw updateError;

        console.log(`✓ Migrated: ${event.title}`);
        results.migrated++;

      } catch (err) {
        const errorMsg = `${event.title}: ${(err as Error).message}`;
        console.error(`✗ Failed: ${errorMsg}`);
        results.errors.push(errorMsg);
        results.failed++;
      }

      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    return new Response(
      JSON.stringify({
        message: `Migration complete. Migrated: ${results.migrated}, Failed: ${results.failed}`,
        ...results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("Migration error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
