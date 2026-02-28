import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
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
        let file: File | null = null;
        let imageBuffer: ArrayBuffer | null = null;
        let inputContentType: string | null = null;

        const contentType = req.headers.get("content-type") || "";

        if (contentType.includes("application/json")) {
            const { imageUrl } = await req.json();
            if (!imageUrl) throw new Error("imageUrl is required in JSON body");

            console.log(`Fetching image from URL: ${imageUrl}`);
            const response = await fetch(imageUrl, {
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    "Accept": "image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
                    "Referer": new URL(imageUrl).origin + "/",
                },
                redirect: "follow",
            });

            if (!response.ok) throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);

            const fetchedContentType = response.headers.get("content-type");
            console.log(`Fetched content type: ${fetchedContentType}`);

            if (!fetchedContentType || !fetchedContentType.startsWith("image/")) {
                throw new Error(`Invalid content type: ${fetchedContentType}. Expected an image.`);
            }

            imageBuffer = await response.arrayBuffer();
            inputContentType = fetchedContentType;
        } else {
            const formData = await req.formData();
            file = formData.get('file') as File;

            if (!file) {
                throw new Error('No file uploaded');
            }
            imageBuffer = await file.arrayBuffer();
        }

        if (!imageBuffer) throw new Error("Failed to process image data");
        const uint8Array = new Uint8Array(imageBuffer);

        // Decode image
        const image = await Image.decode(uint8Array);

        // Resize if too large (max width 1200px)
        if (image.width > 1200) {
            image.resize(1200, Image.RESIZE_AUTO);
        }

        // Encode as JPEG with 80% quality
        const optimizedBuffer = await image.encodeJPEG(80);

        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const timestamp = new Date().getTime();
        const fileExt = "jpg";
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
        const message = error instanceof Error ? error.message : "Unknown error";
        return new Response(JSON.stringify({ error: message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
