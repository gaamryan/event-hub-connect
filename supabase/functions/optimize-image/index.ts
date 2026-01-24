
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// Using ImageScript for pure TS image manipulation in Deno
import { Image } from "https://deno.land/x/imagescript@1.2.15/mod.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            throw new Error('No file uploaded');
        }

        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        // Decode image
        const image = await Image.decode(uint8Array);

        // Resize if too large (max width 1200px)
        if (image.width > 1200) {
            image.resize(1200, Image.RESIZE_AUTO);
        }

        // Encode as JPEG (WebP support in imagescript can be tricky in some environments, JPEG is safe fallback, 
        // but let's try to stick to standard efficient format. ImageScript supports PNG/JPEG best).
        // Let's us JPEG with 80% quality for optimization.
        const optimizedBuffer = await image.encodeJPEG(80);

        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const timestamp = new Date().getTime();
        const fileExt = "jpg"; // We are converting to JPEG
        const fileName = `${timestamp}_${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { data, error } = await supabase.storage
            .from('event-images')
            .upload(fileName, optimizedBuffer, {
                contentType: 'image/jpeg',
                upsert: false
            });

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
            .from('event-images')
            .getPublicUrl(fileName);

        return new Response(JSON.stringify({ url: publicUrl }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
