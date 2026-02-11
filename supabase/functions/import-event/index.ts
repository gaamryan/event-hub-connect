import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EventData {
    title: string;
    description: string;
    start_time: string;
    end_time: string | null;
    image_url: string | null;
    ticket_url: string | null;
    price_min: number | null;
    price_max: number | null;
    is_free: boolean | null;
    status: "draft" | "pending" | "approved" | "rejected";
    source: "manual" | "eventbrite" | "meetup" | "ticketspice" | "facebook";
    source_url: string;
    is_series: boolean;
    dates: string[];
    organizer?: string;
    location?: string;
    address?: string;
    google_maps_link?: string;
}

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { url } = await req.json();

        if (!url) {
            throw new Error("URL is required");
        }

        console.log(`Processing URL: ${url}`);

        let eventData: Partial<EventData> = {
            source_url: url,
            status: "draft",
            source: "manual",
            start_time: new Date().toISOString(),
            is_free: false,
            price_min: null,
            price_max: null,
            end_time: null,
            is_series: false,
            dates: [],
        };

        // Determine source
        if (url.includes("eventbrite.com")) eventData.source = "eventbrite";
        else if (url.includes("meetup.com")) eventData.source = "meetup";
        else if (url.includes("facebook.com")) eventData.source = "facebook";
        else if (url.includes("ticketspice.com")) eventData.source = "ticketspice";

        let parsingSuccessful = false;

        // Strategy 1: Direct Fetch (Best for JSON-LD and Meta Tags)
        // Facebook almost always blocks this, so skip for FB to save time/errors
        if (eventData.source !== "facebook") {
            try {
                console.log("Attempting direct fetch...");
                const response = await fetch(url, {
                    headers: {
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
                        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8"
                    },
                });

                if (response.ok) {
                    const html = await response.text();
                    // Basic check for blocking
                    if (!html.includes("Security Check") && !html.includes("challenge")) {
                        const parsedData = parseHtml(html, url);
                        eventData = { ...eventData, ...parsedData };
                        // If we got at least a title, consider it successful
                        if (eventData.title) {
                            parsingSuccessful = true;
                            console.log("Direct fetch successful");
                        }
                    }
                }
            } catch (e) {
                console.warn("Direct fetch failed, falling back to proxy:", e);
            }
        }

        // Strategy 2: Jina AI Proxy (Fallback for blocked sites & default for Facebook)
        if (!parsingSuccessful) {
            console.log("Attempting Jina AI proxy...");
            const jinaUrl = `https://r.jina.ai/${url}`;
            const response = await fetch(jinaUrl, {
                headers: {
                    "Accept": "application/json", // Request JSON to get structured fields + markdown
                    "X-With-Generated-Alt": "true"
                },
            });

            if (response.ok) {
                const data = await response.json();

                const jinaData = data.data || data; // Handle potential wrapper

                if (jinaData && jinaData.title) {
                    eventData.title = jinaData.title;
                    if (jinaData.description) eventData.description = jinaData.description;

                    // Markdown content for regex extraction
                    const content = jinaData.content || "";

                    // Image: Look for !()[url]
                    const imageMatch = content.match(/!\[.*?\]\((.*?)\)/);
                    if (imageMatch && imageMatch[1]) eventData.image_url = imageMatch[1];

                    // Facebook specific cleanup
                    if (eventData.source === "facebook" && eventData.title) {
                        // Clean title "Log into Facebook" etc.
                        if (eventData.title.includes("Log into Facebook") || eventData.title.includes("Facebook")) {
                            // Try to regex title from content if possible
                        }
                    }

                    parsingSuccessful = true;
                    console.log("Jina fetch successful");
                }
            } else {
                console.error("Jina fetch failed:", await response.text());
            }
        }

        if (!eventData.title) {
            // Fallback title if everything failed
            eventData.title = "New Event (Import Failed)";
            eventData.description = "Could not verify details from URL. Please enter manually.";
        }

        return new Response(JSON.stringify(eventData), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message || "Unknown error" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});

// Helper to parse HTML content (JSON-LD & OpenGraph)
function parseHtml(html: string, url: string) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    if (!doc) return {};

    const getMeta = (property: string) => {
        const tag = doc.querySelector(`meta[property="${property}"]`) ||
            doc.querySelector(`meta[name="${property}"]`);
        return tag?.getAttribute("content") || null;
    };

    let title = getMeta("og:title") || doc.querySelector("title")?.textContent || "";
    let description = getMeta("og:description") || getMeta("description") || "";
    let image_url = getMeta("og:image");
    let start_time = new Date().toISOString();
    let end_time: string | null = null;
    let is_series = false;
    let dates: string[] = [];
    let organizer: string | undefined = undefined;
    let location: string | undefined = undefined;
    let address: string | undefined = undefined;
    let google_maps_link: string | undefined = undefined;

    // Price fields
    let price_min: number | null = null;
    let price_max: number | null = null;
    let is_free: boolean = false;

    // Cleaning
    if (title) title = title.replace(" | Eventbrite", "").replace(" | Meetup", "");

    // JSON-LD extraction
    const scriptTags = doc.querySelectorAll('script[type="application/ld+json"]');
    for (const script of scriptTags) {
        try {
            const content = script.textContent;
            if (content) {
                const json = JSON.parse(content);
                const items = Array.isArray(json) ? json : [json];
                const eventSchema = items.find(i => i["@type"] === "Event" || i["@type"]?.includes("Event"));

                if (eventSchema) {
                    if (eventSchema.name) title = eventSchema.name;
                    if (eventSchema.description) description = eventSchema.description;
                    if (eventSchema.startDate) start_time = eventSchema.startDate;
                    if (eventSchema.endDate) end_time = eventSchema.endDate;

                    if (eventSchema.image) {
                        const img = eventSchema.image;
                        image_url = Array.isArray(img) ? img[0] : (typeof img === 'string' ? img : img.url);
                    }

                    // Location
                    if (eventSchema.location) {
                        const loc = eventSchema.location;
                        if (loc.name) location = loc.name;

                        // Address
                        if (loc.address) {
                            if (typeof loc.address === 'string') {
                                address = loc.address;
                            } else if (typeof loc.address === 'object') {
                                const parts = [
                                    loc.address.streetAddress,
                                    loc.address.addressLocality,
                                    loc.address.addressRegion,
                                    loc.address.postalCode
                                ].filter(Boolean);
                                address = parts.join(", ");
                            }
                        }
                    }

                    // Organizer
                    if (eventSchema.organizer) {
                        if (typeof eventSchema.organizer === 'string') {
                            organizer = eventSchema.organizer;
                        } else if (eventSchema.organizer.name) {
                            organizer = eventSchema.organizer.name;
                        }
                    }

                    // Series Detection (subEvent)
                    if (eventSchema.subEvent && Array.isArray(eventSchema.subEvent)) {
                        is_series = true;
                        dates = eventSchema.subEvent
                            .map((e: any) => e.startDate)
                            .filter((d: string) => d)
                            .sort();
                    }

                    // Price / Offers
                    if (eventSchema.offers) {
                        const offers = Array.isArray(eventSchema.offers) ? eventSchema.offers : [eventSchema.offers];
                        const lowPriceOffer = offers.sort((a: any, b: any) => (a.price || a.lowPrice || 0) - (b.price || b.lowPrice || 0))[0];
                        const highPriceOffer = offers.sort((a: any, b: any) => (b.price || b.highPrice || 0) - (a.price || a.lowPrice || 0))[0];

                        if (lowPriceOffer) {
                            const min = lowPriceOffer.lowPrice || lowPriceOffer.price;
                            if (min !== undefined) {
                                price_min = parseFloat(min);
                                if (price_min === 0) is_free = true;
                            }
                        }

                        if (highPriceOffer) {
                            const max = highPriceOffer.highPrice || highPriceOffer.price;
                            if (max !== undefined) {
                                price_max = parseFloat(max);
                            }
                        }

                        // Check explicit "Free"
                        if (price_min === 0 && price_max === 0) is_free = true;
                    }

                    break;
                }
            }
        } catch (e) {
            // ignore parse errors
        }

    }

    // Google Maps Link Generation
    if (address || location) {
        // Prefer address, fallback to location name
        const query = address || location;
        if (query) {
            google_maps_link = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
        }
    }

    return {
        title,
        description,
        image_url,
        start_time,
        end_time,
        is_series,
        dates,
        organizer,
        location,
        address,
        google_maps_link
    };
}
