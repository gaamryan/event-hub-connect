
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Calendar, MapPin, Link as LinkIcon, AlertCircle, FileText, Globe } from "lucide-react";
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
  const [activeTab, setActiveTab] = useState("url");
  const [url, setUrl] = useState("");
  const [textInput, setTextInput] = useState("");
  const [manualSource, setManualSource] = useState<ScrapedEvent["source"]>("manual");

  const [isLoading, setIsLoading] = useState(false);
  const [previewData, setPreviewData] = useState<ScrapedEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const handlePreview = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setPreviewData(null);
    setIsLoading(true);

    try {
      if (activeTab === "url") {
        if (!url) return;
        const { data, error } = await supabase.functions.invoke('import-event', {
          body: { url },
        });

        if (error) throw error;

        // Handle potential warning from backend
        if (data?._warning) {
          toast.warning(data._warning);
        }

        setPreviewData(data);
      } else {
        // Text Parsing Logic
        if (!textInput) return;
        const parsed = parseEventText(textInput, manualSource);
        setPreviewData(parsed);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to process event data.");
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
      setTextInput("");
      setPreviewData(null);
      setManualSource("manual");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save event");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-xl overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Import Event</DialogTitle>
          <DialogDescription>
            Import event details from a URL or by pasting text.
          </DialogDescription>
        </DialogHeader>

        {!previewData ? (
          <Tabs defaultValue="url" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="url">
                <Globe className="h-4 w-4 mr-2" />
                From URL
              </TabsTrigger>
              <TabsTrigger value="text">
                <FileText className="h-4 w-4 mr-2" />
                From Text
              </TabsTrigger>
            </TabsList>

            <TabsContent value="url">
              <form onSubmit={handlePreview} className="space-y-4">
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
                {error && <ErrorMessage message={error} />}
                <Button type="submit" className="w-full" disabled={isLoading || !url}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Fetching details...
                    </>
                  ) : "Preview"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="text">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="source">Source Platform</Label>
                  <Select value={manualSource} onValueChange={(val: any) => setManualSource(val)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual / Other</SelectItem>
                      <SelectItem value="facebook">Facebook</SelectItem>
                      <SelectItem value="meetup">Meetup</SelectItem>
                      <SelectItem value="ticketspice">TicketSpice</SelectItem>
                      <SelectItem value="eventbrite">Eventbrite</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="text-input">Paste Event Details</Label>
                  <Textarea
                    id="text-input"
                    placeholder="Event Name: ...&#10;Start Date: ...&#10;Description: ..."
                    className="min-h-[200px] font-mono text-sm"
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Supported fields: Event Name, Start Date, Description, Ticket URL, Page URL, Venue, Address.
                  </p>
                </div>
                {error && <ErrorMessage message={error} />}
                <Button onClick={() => handlePreview()} className="w-full" disabled={isLoading || !textInput}>
                  {isLoading ? "Parsing..." : "Preview"}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
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
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">{previewData.title}</h3>
                <span className="text-xs bg-secondary px-2 py-1 rounded capitalize">{previewData.source}</span>
              </div>
              <div className="flex flex-col gap-1 mt-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {previewData.start_time && !isNaN(Date.parse(previewData.start_time))
                      ? format(new Date(previewData.start_time), "PPP p")
                      : "Invalid Date"}
                  </span>
                </div>
                {previewData.venue && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span>{previewData.venue.name}</span>
                  </div>
                )}
                {previewData.source_url && (
                  <div className="flex items-center gap-2">
                    <LinkIcon className="h-4 w-4" />
                    <a href={previewData.source_url} target="_blank" rel="noreferrer" className="hover:underline truncate max-w-[300px]">
                      {previewData.source_url}
                    </a>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-secondary/50 p-3 rounded-md text-sm">
              <span className="font-medium">Description preview:</span>
              <p className="text-muted-foreground line-clamp-6 mt-1 whitespace-pre-wrap">
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

function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md flex items-start gap-2">
      <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
}

// Helper: Parse Key-Value text
function parseEventText(text: string, source: ScrapedEvent["source"]): ScrapedEvent {
  const lines = text.split('\n');
  const data: any = {};

  // Heuristic regexes
  const keys = {
    title: /^(?:Event Name|Title):\s*(.*)/i,
    start_time: /^(?:Start Date|Date|Time|Start Date & Time):\s*(.*)/i,
    ticket_url: /^(?:Ticket URL|Tickets):\s*(.*)/i,
    source_url: /^(?:Page URL|URL|Link):\s*(.*)/i,
    venue: /^(?:Event Venue|Venue|Location):\s*(.*)/i,
    description: /^(?:Description|Details):\s*(.*)/i,
    address: /^(?:Address):\s*(.*)/i,
  };

  let currentKey = "description_append"; // Default to appending to description if no key matches
  let descriptionBuffer = "";

  for (const line of lines) {
    let matched = false;

    for (const [key, regex] of Object.entries(keys)) {
      const match = line.match(regex);
      if (match) {
        if (key === 'description') {
          currentKey = 'description';
          descriptionBuffer += match[1] + "\n";
        } else {
          data[key] = match[1].trim();
          currentKey = key; // Track checks
        }
        matched = true;
        break;
      }
    }

    if (!matched) {
      // If it's a "known" key that continues, or strictly description
      // For simple parsing, allow description to capture bulk text
      // Or if existing key is description, append to it
      if (currentKey === 'description' || currentKey === 'description_append') {
        descriptionBuffer += line + "\n";
      }
    }
  }

  // Combine description
  data.description = descriptionBuffer.trim();

  // Date Parsing
  let startDate = new Date().toISOString();
  if (data.start_time) {
    // Try natural parsing
    const parsed = Date.parse(data.start_time);
    if (!isNaN(parsed)) {
      startDate = new Date(parsed).toISOString();
    } else {
      // Fallback logic could go here
      console.warn("Could not parse date:", data.start_time);
    }
  }

  // Handle "Page URL" vs "Ticket URL" -> prefer Page URL for source_url
  const finalUrl = data.source_url || data.ticket_url || "";

  // Construct Venue object if both present
  let venueObj = null;
  if (data.venue) {
    venueObj = { name: data.venue };
  }

  return {
    title: data.title || "New Event",
    description: data.description || "",
    start_time: startDate,
    image_url: null, // No image parsing from text supported yet
    source_url: finalUrl,
    status: "draft",
    source: source,
    venue: venueObj,
    _warning: undefined
  };
}
