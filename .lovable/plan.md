

# Instagram Post Import for Events

## Overview
Add support for importing event details from Instagram post URLs. Since Instagram posts contain unstructured caption text (not structured event data like Eventbrite), we'll use AI to intelligently extract event fields from the post content.

## The Challenge
Instagram posts don't have structured event metadata (no JSON-LD, no reliable og:tags). Event details like date, time, location, and ticket links are embedded in free-form caption text. Direct fetching is blocked by Instagram, so we need a proxy + AI parsing approach.

## Implementation Steps

### 1. Update the Edge Function (`supabase/functions/import-event/index.ts`)
- Add `"instagram"` as a recognized source when the URL contains `instagram.com`
- Add Instagram to the list of sites that skip direct fetch (like Facebook, Instagram blocks bots)
- After Jina AI fetches the raw content, detect Instagram URLs and send the extracted text to an AI model (Gemini Flash via Lovable AI) to parse event fields
- The AI prompt will ask for: title, description, start date/time, end date/time, location/address, organizer, ticket URL, price, and image URL
- Map the AI response back into the existing `EventData` structure

### 2. Update the Source Type
- Add `"instagram"` to the `EventData.source` union type in the edge function
- Update the `ScrapedEvent` source type in `ImportEventDialog.tsx` to include `"instagram"`

### 3. AI Parsing Logic (in the edge function)
When an Instagram URL is detected and Jina returns content:
- Extract the caption/content text
- Call the Lovable AI endpoint with a structured prompt asking the AI to extract event fields as JSON
- Parse the AI response and merge into `eventData`
- Use Gemini 2.5 Flash (fast, cost-effective, good at text extraction)

### 4. Image Handling for Instagram
- Instagram images from Jina often come as CDN URLs that may expire
- We'll extract the best image URL available from the Jina response (og:image or first markdown image)
- The existing image optimization step during import will handle uploading it to storage

## Technical Details

### AI Prompt Structure
The edge function will send the scraped Instagram content to the AI with a prompt like:
```
Extract event details from this Instagram post. Return valid JSON with fields:
title, description, start_time (ISO 8601), end_time, location, address, 
organizer, ticket_url, price_min, price_max, is_free
```

### Edge Function Flow for Instagram
```text
Instagram URL received
  --> Skip direct fetch (blocked)
  --> Jina AI proxy fetches content
  --> Detect instagram.com source
  --> Send content to Gemini Flash for structured extraction
  --> Merge AI-parsed fields into eventData
  --> Return to frontend for preview/editing
```

### No Database Changes Required
The existing `event_source` enum and table schema already support all needed fields. We just add `"instagram"` handling in code.

### Secret Requirements
- No new secrets needed -- we'll use the Lovable AI endpoint which doesn't require an API key, and Jina AI (free tier, no key needed)

### Files to Modify
1. **`supabase/functions/import-event/index.ts`** -- Add Instagram detection, AI parsing logic
2. **`src/components/admin/ImportEventDialog.tsx`** -- Add `"instagram"` to source type, update placeholder text to mention Instagram URLs are supported

