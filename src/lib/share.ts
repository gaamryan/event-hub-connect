import { toast } from "sonner";

export async function shareEvent({
  title,
  description,
  url,
}: {
  title: string;
  description?: string | null;
  url: string;
}) {
  if (navigator.share) {
    try {
      await navigator.share({
        title,
        text: description || `Check out ${title}`,
        url,
      });
      return;
    } catch (err) {
      // User cancelled — don't fallback
      if ((err as DOMException)?.name === "AbortError") return;
    }
  }

  // Fallback: copy link
  try {
    await navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard!");
  } catch {
    toast.error("Could not copy link");
  }
}
