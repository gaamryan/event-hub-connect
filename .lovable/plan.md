# UX & Functionality Enhancement Plan

## Phase 1: Core Feed Experience
### 1. Infinite Scroll on Event Feed
- Replace page-based pagination with `useInfiniteQuery` from TanStack Query
- Add intersection observer to trigger loading next page
- Show spinner at bottom while loading more
- Preserve scroll position on back navigation

### 2. Skeleton Loading States
- Add shimmer skeletons for category filter bar, featured events carousel, and event detail page
- Ensure consistent skeleton dimensions match real content to prevent layout shift

## Phase 2: Event Discovery
### 3. Search Autocomplete
- Add debounced search in the filter drawer that queries events by title and venues by name
- Show dropdown suggestions grouped by type (Events / Venues)
- Selecting a suggestion navigates to the event or pre-fills the location filter

### 4. "Happening Now" Section
- Query events where `start_time <= now() AND (end_time >= now() OR end_time IS NULL)`
- Display as a highlighted horizontal scroll section above the main feed
- Add a pulsing "LIVE" indicator badge

### 5. Map View Toggle
- Add a list/map toggle button to the events feed header
- Use Leaflet (free, no API key) to render event pins using venue lat/lng
- Clicking a pin shows a mini event card popup
- Sync map bounds with the visible event list

## Phase 3: Engagement & Sharing
### 6. Event Sharing
- Add share button to event detail page and event cards
- Use Web Share API on supported devices, fallback to copy-link + toast
- Generate a shareable URL with event title as meta description (OG tags)

### 7. Similar Events on Detail Page
- Query events sharing the same categories or venue as the current event
- Display as a horizontal carousel at the bottom of the event detail page
- Exclude the current event from results

### 8. Push Notifications for Saved Events
- Add notification opt-in prompt when user saves their first event
- Use the existing `send-push` edge function scaffold
- Send reminder 24h and 1h before saved events
- Add notification preferences in user settings

## Execution Order
1. Infinite Scroll ← biggest UX win, foundational
2. Skeleton Loading ← complements infinite scroll
3. Search Autocomplete ← high-value discovery feature
4. Happening Now ← engagement boost
5. Map View ← major feature, needs care
6. Event Sharing ← quick win
7. Similar Events ← enriches detail page
8. Push Notifications ← most complex, needs service worker setup
