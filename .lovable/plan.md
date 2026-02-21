

# Add start.gg Import Support

## Overview
Add a 3rd tab to the Import Events dialog specifically for start.gg tournament URLs, and add backend support to scrape and AI-parse start.gg tournament pages into structured event data.

## What start.gg Pages Contain
From analyzing the example URLs, start.gg tournament pages include:
- Tournament name (e.g. "Stress Test #9 // FGC Offline Weekly Bracket // Jacksonville FL")
- Date range (e.g. "Feb 20th, 2026" or "Aug 14th -- 16th, 2026")
- Full address (e.g. "120 W Adams St, Jacksonville, FL 32202, USA")
- Cover/banner image (e.g. `https://images.start.gg/images/tournament/882294/image-...png`)
- Description text with schedule, venue details, entry fees
- Sub-events list (individual game brackets)
- Registration link
- Google Maps directions link
- Contact info (Discord, etc.)

Since start.gg is a JavaScript-heavy SPA, direct fetch may not work well -- we'll use the Jina AI proxy (already in place) and then AI extraction (same approach as Instagram).

## Implementation Steps

### 1. Edge Function (`supabase/functions/import-event/index.ts`)
- Add `"startgg"` as a recognized source when the URL contains `start.gg`
- After Jina fetches the content, detect start.gg URLs and send the scraped text to Gemini Flash for structured extraction
- The AI prompt will be tailored for tournament/FGC event data -- extracting title, date range, address, description, cover image, entry fee info, and registration URL
- Use the start.gg registration URL as the `ticket_url`
- Extract the `images.start.gg` cover image URL for the event image
- Use the source URL as the `ticket_url` (registration link)

### 2. Database Migration
- Add `startgg` to the `event_source` enum

### 3. Frontend (`src/components/admin/ImportEventDialog.tsx`)
- Add a 3rd tab: "From start.gg" with a gamepad/trophy icon
- The tab will have a textarea for pasting start.gg tournament URLs (one per line)
- Update `ScrapedEvent` source type to include `"startgg"`
- Update the tabs grid from `grid-cols-2` to `grid-cols-3`
- Add `"startgg"` to the source platform dropdown in the text tab

### 4. AI Extraction Logic
Reuse the existing `extractEventWithAI` function but generalize it to work for both Instagram and start.gg sources. The prompt for start.gg will focus on:
- Tournament name as title
- Date range parsing (start and end dates)
- Full street address
- Entry fee / venue fee info for pricing
- Registration URL
- Description (cleaned up, without attendee lists)

## Technical Details

### Files to Modify
1. **`supabase/functions/import-event/index.ts`** -- Add `"startgg"` source detection, AI extraction for start.gg content
2. **`src/components/admin/ImportEventDialog.tsx`** -- Add 3rd tab, update types and UI
3. **Database migration** -- Add `startgg` to `event_source` enum

### Edge Function Flow for start.gg
```text
start.gg URL received
  --> Attempt direct fetch (may partially work)
  --> Fall back to Jina AI proxy for full content
  --> Detect start.gg source
  --> Send content to Gemini Flash with tournament-specific prompt
  --> Extract: title, dates, address, description, image, pricing, registration URL
  --> Map to EventData structure
  --> Return to frontend for preview/editing
```

### No New Secrets Required
Uses existing Lovable AI endpoint and Jina AI (free tier).

