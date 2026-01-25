import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { url } = await req.json();

        if (!url) {
            throw new Error("URL is required");
        }

        console.log(`Fetching URL: ${url}`);

        // Fetch the HTML content
        const response = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch URL: ${response.statusText}`);
        }

        const html = await response.text();
        const doc = new DOMParser().parseFromString(html, "text/html");

        if (!doc) {
            throw new Error("Failed to parse HTML");
        }

        // Helper to get meta tag content
        const getMeta = (property: string) => {
            const tag = doc.querySelector(`meta[property="${property}"]`) ||
                doc.querySelector(`meta[name="${property}"]`);
            return tag?.getAttribute("content") || null;
        };

        // Extract OpenGraph data
        let title = getMeta("og:title") || doc.querySelector("title")?.textContent || "";
        let description = getMeta("og:description") || getMeta("description") || "";
        let imageUrl = getMeta("og:image");

        // Try to extract date
        let start_time = new Date().toISOString();

        // JSON-LD extraction
        const scriptTags = doc.querySelectorAll('script[type="application/ld+json"]');
        if (scriptTags) {
            for (const script of scriptTags) {
                try {
                    const content = script.textContent;
                    if (content) {
                        const json = JSON.parse(content);
                        const schema = Array.isArray(json) ? json.find(i => i["@type"] === "Event") : (json["@type"] === "Event" ? json : null);

                        if (schema) {
                            if (schema.startDate) start_time = schema.startDate;
                            if (schema.name) title = schema.name;
                            if (schema.description) description = schema.description;
                            if (schema.image) {
                                imageUrl = Array.isArray(schema.image) ? schema.image[0] : schema.image;
                            }
                            break;
                        }
                    }
                } catch (e) {
                    console.error("Error parsing JSON-LD", e);
                }
            }
        }

        // Determine source type
        let source = "manual";
        if (url.includes("eventbrite.com")) source = "eventbrite";
        else if (url.includes("meetup.com")) source = "meetup";
        else if (url.includes("facebook.com")) source = "facebook";
        else if (url.includes("ticketspice.com")) source = "ticketspice";

        const eventData = {
            title,
            description,
            start_time,
            image_url: imageUrl,
            source_url: url,
            end_time: null,
            ticket_url: url,
            price_min: null,
            price_max: null,
            is_free: false,
            status: "draft",
            source,
        };

        return new Response(JSON.stringify(eventData), {
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
