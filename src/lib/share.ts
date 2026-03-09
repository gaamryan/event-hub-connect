import { toast } from "sonner";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

/**
 * Build the OG-friendly share URL that returns rich meta tags for crawlers
 * and auto-redirects humans to the SPA event page.
 */
function getOgShareUrl(eventId: string): string {
  return `${SUPABASE_URL}/functions/v1/og?id=${eventId}`;
}

export async function shareEvent({
  title,
  description,
  url,
  eventId,
}: {
  title: string;
  description?: string | null;
  url: string;
  eventId?: string;
}) {
  // Use OG endpoint URL when we have an eventId so crawlers get rich previews
  const shareUrl = eventId ? getOgShareUrl(eventId) : url;

  if (navigator.share) {
    try {
      await navigator.share({
        title,
        text: description || `Check out ${title}`,
        url: shareUrl,
      });
      return;
    } catch (err) {
      // User cancelled — don't fallback
      if ((err as DOMException)?.name === "AbortError") return;
    }
  }

  // Fallback: copy link
  try {
    await navigator.clipboard.writeText(shareUrl);
    toast.success("Link copied to clipboard!");
  } catch {
    toast.error("Could not copy link");
  }
}
