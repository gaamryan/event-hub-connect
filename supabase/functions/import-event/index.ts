import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Platforms that block server-side scraping
const BLOCKED_PLATFORMS = [
    { domain: "facebook.com", name: "Facebook" },
    { domain: "fb.com", name: "Facebook" },
];

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

        // Check if platform blocks scraping
        const blockedPlatform = BLOCKED_PLATFORMS.find(p => url.includes(p.domain));
        if (blockedPlatform) {
            // Return a template for manual entry with the source URL preserved
            console.log(`Platform ${blockedPlatform.name} blocks scraping, returning template`);
            return new Response(JSON.stringify({
                title: "",
                description: `Event from ${blockedPlatform.name} - please enter details manually`,
                start_time: new Date().toISOString(),
                image_url: null,
                source_url: url,
                end_time: null,
                ticket_url: url,
                price_min: null,
                price_max: null,
                is_free: false,
                status: "draft",
                source: blockedPlatform.name.toLowerCase(),
                _warning: `${blockedPlatform.name} events cannot be automatically imported. Please fill in the event details manually.`,
            }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // Fetch the HTML content with browser-like headers
        const response = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.5",
                "Accept-Encoding": "gzip, deflate, br",
                "Connection": "keep-alive",
                "Upgrade-Insecure-Requests": "1",
                "Sec-Fetch-Dest": "document",
                "Sec-Fetch-Mode": "navigate",
                "Sec-Fetch-Site": "none",
                "Sec-Fetch-User": "?1",
            },
        });

        if (!response.ok) {
            console.error(`Fetch failed with status: ${response.status} ${response.statusText}`);
            throw new Error(`Could not access the URL. The website may be blocking automated access. (${response.status})`);
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
        else if (url.includes("facebook.com") || url.includes("fb.com")) source = "facebook";
        else if (url.includes("ticketspice.com")) source = "ticketspice";
        else if (url.includes("tixr.com")) source = "manual"; // Tixr uses manual source type since it's not in the enum

        const eventData = {
            title: title.trim(),
            description: description.trim(),
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

        console.log(`Successfully parsed event: ${eventData.title}`);

        return new Response(JSON.stringify(eventData), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error(`Import error: ${message}`);
        return new Response(JSON.stringify({ error: message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
