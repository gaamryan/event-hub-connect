
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Calendar, MapPin, Link as LinkIcon, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface ScrapedEvent {
  title: string;
  description: string;
  start_time: string;
  image_url: string | null;
  source_url: string;
  status: "draft" | "pending" | "approved" | "rejected";
  source: "manual" | "eventbrite" | "meetup" | "ticketspice" | "facebook";
  venue?: { name: string } | null;
  _warning?: string;
}

interface ImportEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportEventDialog({ open, onOpenChange }: ImportEventDialogProps) {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [previewData, setPreviewData] = useState<ScrapedEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const handlePreview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    setIsLoading(true);
    setError(null);
    setPreviewData(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('import-event', {
        body: { url },
      });

      if (fnError) throw fnError;
      
      // Check for error in response body
      if (data?.error) {
        throw new Error(data.error);
      }
      
      setPreviewData(data);
      
      // Show warning toast if platform blocks scraping
      if (data?._warning) {
        toast.warning(data._warning);
      }
    } catch (err: unknown) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch event data. Please check the URL and try again.";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    if (!previewData) return;
    setIsLoading(true);

    try {
      // Create the event in Supabase
      const { error } = await supabase.from("events").insert({
        title: previewData.title,
        description: previewData.description,
        start_time: previewData.start_time,
        image_url: previewData.image_url,
        source_url: previewData.source_url,
        source: previewData.source,
        status: "draft", // Import as draft by default
      });

      if (error) throw error;

      toast.success("Event imported successfully as draft");
      queryClient.invalidateQueries({ queryKey: ["events"] });
      onOpenChange(false);
      // Reset state
      setUrl("");
      setPreviewData(null);
    } catch (err) {
      console.error(err);
      toast.error("Failed to save event");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-lg overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Import Event</DialogTitle>
          <DialogDescription>
            Paste a URL from Eventbrite, Meetup, Facebook, or Ticketspice to import event details.
          </DialogDescription>
        </DialogHeader>

        {!previewData ? (
          <form onSubmit={handlePreview} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="url">Event URL</Label>
              <Input
                id="url"
                placeholder="https://..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={isLoading}
              />
            </div>

            {error && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading || !url}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Fetching details...
                </>
              ) : (
                "Preview"
              )}
            </Button>
          </form>
        ) : (
          <div className="space-y-4 py-4">
            {/* Warning for platforms that need manual entry */}
            {previewData._warning && (
              <div className="bg-amber-500/10 text-amber-700 dark:text-amber-400 text-sm p-3 rounded-md flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{previewData._warning}</span>
              </div>
            )}

            {previewData.image_url && (
              <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                <img
                  src={previewData.image_url}
                  alt={previewData.title}
                  className="object-cover w-full h-full"
                />
              </div>
            )}

            <div>
              <h3 className="font-semibold text-lg">{previewData.title}</h3>
              <div className="flex flex-col gap-1 mt-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>{format(new Date(previewData.start_time), "PPP p")}</span>
                </div>
                {previewData.venue && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span>{previewData.venue.name}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <LinkIcon className="h-4 w-4" />
                  <a href={previewData.source_url} target="_blank" rel="noreferrer" className="hover:underline truncate max-w-[300px]">
                    {previewData.source_url}
                  </a>
                </div>
              </div>
            </div>

            <div className="bg-secondary/50 p-3 rounded-md text-sm">
              <span className="font-medium">Description preview:</span>
              <p className="text-muted-foreground line-clamp-3 mt-1">
                {previewData.description || "No description found"}
              </p>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setPreviewData(null)} disabled={isLoading}>
                Back
              </Button>
              <Button onClick={handleImport} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  "Import Event"
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
