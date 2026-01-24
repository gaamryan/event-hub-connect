
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
        const title = getMeta("og:title") || doc.querySelector("title")?.textContent || "";
        const description = getMeta("og:description") || getMeta("description") || "";
        const image_url = getMeta("og:image");

        // Try to extract date
        // This is heuristic and might need platform-specific adjustments
        let start_time = new Date().toISOString(); // Default to now if not found

        // JSON-LD extraction (common on Eventbrite, Schema.org sites)
        const scriptTags = doc.querySelectorAll('script[type="application/ld+json"]');
        if (scriptTags) {
            for (const script of scriptTags) {
                try {
                    const content = script.textContent;
                    if (content) {
                        const json = JSON.parse(content);
                        // Handle array of schemas or single schema
                        const schema = Array.isArray(json) ? json.find(i => i["@type"] === "Event") : (json["@type"] === "Event" ? json : null);

                        if (schema) {
                            if (schema.startDate) start_time = schema.startDate;
                            // If we found a schema, we can also improve other fields
                            if (schema.name) title = schema.name;
                            if (schema.description) description = schema.description;
                            if (schema.image) {
                                image_url = Array.isArray(schema.image) ? schema.image[0] : schema.image;
                            }
                            if (schema.location && schema.location.name) {
                                // We could extract venue here, but let's stick to basic event info for now
                                // or return it as extra data
                            }
                            break;
                        }
                    }
                } catch (e) {
                    console.error("Error parsing JSON-LD", e);
                }
            }
        }

        // Construct the event object compatible with our frontend interface
        const eventData = {
            title,
            description,
            start_time,
            image_url,
            source_url: url,
            // Default values
            end_time: null,
            ticket_url: url,
            price_min: null,
            price_max: null,
            is_free: false,
            status: "draft",
            source: "manual", // Will be refined in frontend or here if we detect platform
        };

        // Simple platform detection
        if (url.includes("eventbrite.com")) eventData.source = "eventbrite";
        else if (url.includes("meetup.com")) eventData.source = "meetup";
        else if (url.includes("facebook.com")) eventData.source = "facebook";
        else if (url.includes("ticketspice.com")) eventData.source = "ticketspice";

        return new Response(JSON.stringify(eventData), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
