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

// Extract event data using Tavily - returns null if extraction fails
async function extractWithTavily(url: string, apiKey: string): Promise<Record<string, unknown> | null> {
    console.log(`Using Tavily to extract: ${url}`);
    
    try {
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
            return null;
        }

        const data = await response.json();
        console.log("Tavily response:", JSON.stringify(data, null, 2));

        // Check for failed results
        if (data.failed_results && data.failed_results.length > 0) {
            console.log("Tavily failed to fetch URL:", data.failed_results[0].error);
            return null;
        }

        if (!data.results || data.results.length === 0) {
            console.log("No results returned by Tavily");
            return null;
        }

        const result = data.results[0];
        const rawContent = result.raw_content || "";
        
        if (!rawContent || rawContent.length < 50) {
            console.log("Tavily returned insufficient content");
            return null;
        }
        
        // Try to extract structured data from the raw content
        let title = "";
        let description = "";
        const imageUrl: string | null = null;
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
    } catch (error) {
        console.error("Tavily extraction error:", error);
        return null;
    }
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
        const platformInfo = TAVILY_PLATFORMS.find(p => url.includes(p.domain));

        if (platformInfo) {
            // Platform that typically blocks scraping
            console.log(`Platform ${platformInfo.name} detected`);
            
            if (tavilyApiKey) {
                // Try Tavily first
                eventData = await extractWithTavily(url, tavilyApiKey);
            }
            
            // If Tavily failed or wasn't available, return manual entry template
            if (!eventData) {
                console.log(`Returning manual entry template for ${platformInfo.name}`);
                eventData = {
                    title: "",
                    description: "",
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
                    _warning: `${platformInfo.name} blocks automated access. Please enter event details manually.`,
                };
            }
        } else {
            // Standard scraping for other platforms
            try {
                eventData = await extractWithFetch(url);
            } catch (fetchError) {
                // If standard fetch fails, try Tavily as fallback
                if (tavilyApiKey) {
                    console.log("Standard fetch failed, trying Tavily as fallback");
                    eventData = await extractWithTavily(url, tavilyApiKey);
                }
                
                // If still no data, return manual entry template
                if (!eventData) {
                    console.log("All extraction methods failed, returning manual entry template");
                    eventData = {
                        title: "",
                        description: "",
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
                        _warning: `Could not automatically extract event details. Please enter them manually.`,
                    };
                }
            }
        }

        console.log(`Returning event data: ${eventData.title || "(manual entry)"}`);

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
