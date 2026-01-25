import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Platforms that need Tavily for reliable scraping
const TAVILY_PLATFORMS = [
    { domain: "facebook.com", name: "Facebook" },
    { domain: "fb.com", name: "Facebook" },
    { domain: "tixr.com", name: "Tixr" },
];

// Determine source type from URL
function getSourceFromUrl(url: string): string {
    if (url.includes("eventbrite.com")) return "eventbrite";
    if (url.includes("meetup.com")) return "meetup";
    if (url.includes("facebook.com") || url.includes("fb.com")) return "facebook";
    if (url.includes("ticketspice.com")) return "ticketspice";
    if (url.includes("tixr.com")) return "tixr";
    return "manual";
}

// Extract event data using Tavily
async function extractWithTavily(url: string, apiKey: string) {
    console.log(`Using Tavily to extract: ${url}`);
    
    const response = await fetch("https://api.tavily.com/extract", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            api_key: apiKey,
            urls: [url],
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`Tavily API error: ${response.status} - ${errorText}`);
        throw new Error(`Tavily extraction failed: ${response.status}`);
    }

    const data = await response.json();
    console.log("Tavily response:", JSON.stringify(data, null, 2));

    if (!data.results || data.results.length === 0) {
        throw new Error("No content extracted by Tavily");
    }

    const result = data.results[0];
    const rawContent = result.raw_content || "";
    
    // Try to extract structured data from the raw content
    let title = "";
    let description = "";
    let imageUrl: string | null = null;
    let startTime = new Date().toISOString();

    // Extract title - look for common patterns
    const titleMatch = rawContent.match(/^#\s*(.+)$/m) || 
                       rawContent.match(/^(.{10,100}?)[\n\r]/);
    if (titleMatch) {
        title = titleMatch[1].trim();
    }

    // Use first paragraph as description
    const paragraphs = rawContent.split(/\n\n+/).filter((p: string) => p.trim().length > 50);
    if (paragraphs.length > 0) {
        description = paragraphs[0].trim().slice(0, 500);
    }

    // Try to find date patterns
    const datePatterns = [
        /(\w+ \d{1,2},? \d{4})/i,
        /(\d{1,2}\/\d{1,2}\/\d{4})/,
        /(\d{4}-\d{2}-\d{2})/,
    ];
    for (const pattern of datePatterns) {
        const match = rawContent.match(pattern);
        if (match) {
            try {
                const parsed = new Date(match[1]);
                if (!isNaN(parsed.getTime())) {
                    startTime = parsed.toISOString();
                    break;
                }
            } catch {
                // Continue to next pattern
            }
        }
    }

    return {
        title: title || "Untitled Event",
        description: description || "Event details extracted via Tavily",
        start_time: startTime,
        image_url: imageUrl,
        source_url: url,
        end_time: null,
        ticket_url: url,
        price_min: null,
        price_max: null,
        is_free: false,
        status: "draft",
        source: getSourceFromUrl(url),
        _note: "Content extracted using Tavily - please review and edit details",
    };
}

// Standard scraping with fetch + DOM parsing
async function extractWithFetch(url: string) {
    console.log(`Standard fetch for: ${url}`);
    
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
        console.error(`Fetch failed: ${response.status} ${response.statusText}`);
        throw new Error(`Could not access URL (${response.status})`);
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

    return {
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
        source: getSourceFromUrl(url),
    };
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

        // Check if this platform needs Tavily
        const needsTavily = TAVILY_PLATFORMS.find(p => url.includes(p.domain));
        const tavilyApiKey = Deno.env.get("TAVILY_API_KEY");

        let eventData;

        if (needsTavily && tavilyApiKey) {
            // Use Tavily for platforms that block standard scraping
            console.log(`Platform ${needsTavily.name} detected, using Tavily`);
            eventData = await extractWithTavily(url, tavilyApiKey);
        } else if (needsTavily && !tavilyApiKey) {
            // No Tavily key, return template for manual entry
            console.log(`Platform ${needsTavily.name} detected but no Tavily key, returning template`);
            eventData = {
                title: "",
                description: `Event from ${needsTavily.name} - please enter details manually`,
                start_time: new Date().toISOString(),
                image_url: null,
                source_url: url,
                end_time: null,
                ticket_url: url,
                price_min: null,
                price_max: null,
                is_free: false,
                status: "draft",
                source: getSourceFromUrl(url),
                _warning: `${needsTavily.name} events require manual entry. Configure Tavily API for automatic extraction.`,
            };
        } else {
            // Standard scraping for other platforms
            try {
                eventData = await extractWithFetch(url);
            } catch (fetchError) {
                // If standard fetch fails and we have Tavily, try it as fallback
                if (tavilyApiKey) {
                    console.log("Standard fetch failed, trying Tavily as fallback");
                    eventData = await extractWithTavily(url, tavilyApiKey);
                } else {
                    throw fetchError;
                }
            }
        }

        console.log(`Successfully extracted: ${eventData.title}`);

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
