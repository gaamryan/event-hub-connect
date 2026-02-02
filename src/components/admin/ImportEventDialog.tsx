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
import { Loader2, Calendar, AlertCircle, FileText, Globe, X, Layers, User, MapPin, Clock, Copy } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Switch } from "@/components/ui/switch";

interface ScrapedEvent {
  id?: string; // Temp ID for React keys
  title: string;
  description: string;
  start_time: string;
  end_time?: string | null;
  image_url: string | null;
  source_url: string;
  status: "draft" | "pending" | "approved" | "rejected";
  source: "manual" | "eventbrite" | "meetup" | "ticketspice" | "facebook";
  venue?: { name: string } | null;
  organizer?: string;
  location?: string;
  address?: string;
  google_maps_link?: string;
  is_series?: boolean;
  dates?: string[];
  import_mode?: "merge" | "split";
  ticket_url?: string;
  price_min?: number | null;
  price_max?: number | null;
  _warning?: string;
}

interface ImportEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportEventDialog({ open, onOpenChange }: ImportEventDialogProps) {
  const [activeTab, setActiveTab] = useState("url");
  const [urlInput, setUrlInput] = useState("");
  const [textInput, setTextInput] = useState("");
  const [manualSource, setManualSource] = useState<ScrapedEvent["source"]>("manual");

  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [previewEvents, setPreviewEvents] = useState<ScrapedEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const handlePreview = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setPreviewEvents([]);
    setIsLoading(true);

    try {
      if (activeTab === "url") {
        if (!urlInput.trim()) return;

        const urls = urlInput
          .split("\n")
          .map((u) => u.trim())
          .filter((u) => u.length > 0);

        if (urls.length === 0) return;

        const results: ScrapedEvent[] = [];
        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < urls.length; i++) {
          const url = urls[i];
          setLoadingMessage(`Scanning ${i + 1}/${urls.length}: ${new URL(url).hostname}...`);

          try {
            const { data, error } = await supabase.functions.invoke('import-event', {
              body: { url },
            });

            if (error) throw error;

            if (data) {
              // Assign a temp ID for UI handling
              results.push({
                ...data,
                id: Math.random().toString(36).substring(2, 9),
                // Default series events to "merge"
                import_mode: data.is_series ? "merge" : undefined,
                // Ensure default status is approved if not set by backend
                status: "approved"
              });
              successCount++;
            }
          } catch (err) {
            console.error(`Failed to fetch ${url}`, err);
            failCount++;
          }
        }

        setPreviewEvents(results);

        if (failCount > 0) {
          toast.warning(`Finished scanning. ${successCount} found, ${failCount} failed.`);
        } else {
          toast.success(`Found ${successCount} events!`);
        }

      } else {
        // Text Parsing Logic
        if (!textInput) return;
        const parsed = parseEventText(textInput, manualSource);
        parsed.id = Math.random().toString(36).substring(2, 9);
        parsed.status = "approved"; // Default to approved
        setPreviewEvents([parsed]);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to process event data.");
    } finally {
      setIsLoading(false);
      setLoadingMessage("");
    }
  };

  const handleRemoveEvent = (id: string) => {
    setPreviewEvents((prev) => prev.filter((e) => e.id !== id));
  };

  const handleImportModeToggle = (id: string, mode: "merge" | "split") => {
    setPreviewEvents((prev) => prev.map(e => e.id === id ? { ...e, import_mode: mode } : e));
  };

  const handleCopyEvent = (event: ScrapedEvent) => {
    const details = getFormattedEventString(event);
    navigator.clipboard.writeText(details);
    toast.success("Event details copied to clipboard!");
  };

  const handleQuickCopy = () => {
    if (!textInput) {
      // Copy AI Prompt
      const template = `please organize and state the following:
Event Name
Event Start Date
Event Start Time
Event End Date
Event End Time
Location (street address, city, state, zipcode)
Address
Google Maps Link to Address
Host
Ticket Link
Description
Cost
full url path to the cover image`;
      navigator.clipboard.writeText(template);
      toast.info("AI Prompt copied to clipboard!");
      return;
    }

    try {
      const parsed = parseEventText(textInput, manualSource);
      const details = getFormattedEventString(parsed);
      navigator.clipboard.writeText(details);
      toast.success("Parsed details copied to clipboard!");
    } catch (err) {
      toast.error("Failed to parse and copy.");
    }
  };

  const getFormattedEventString = (event: ScrapedEvent) => {
    const formatDate = (dateStr?: string | null) => {
      if (!dateStr || isNaN(Date.parse(dateStr))) return "TBD";
      return format(new Date(dateStr), "MM/dd/yyyy");
    };
    const formatTime = (dateStr?: string | null) => {
      if (!dateStr || isNaN(Date.parse(dateStr))) return "TBD";
      return format(new Date(dateStr), "h:mm a");
    };

    let cost = "TBD";
    if (event.price_min !== undefined && event.price_max !== undefined) {
      if (event.price_min === 0 && event.price_max === 0) cost = "Free";
      else if (event.price_min === event.price_max) cost = `$${event.price_min}`;
      else cost = `$${event.price_min} - $${event.price_max}`;
    }

    return `Event Name: ${event.title}
Event Start Date: ${formatDate(event.start_time)}
Event Start Time: ${formatTime(event.start_time)}
Event End Date: ${event.end_time ? formatDate(event.end_time) : formatDate(event.start_time)}
Event End Time: ${event.end_time ? formatTime(event.end_time) : "TBD"}
Location: ${event.venue?.name || event.location || "TBD"}, ${event.address || ""}
Address: ${event.address || "TBD"}
Google Maps Link to Address: ${event.google_maps_link || "TBD"}
Host: ${event.organizer || "TBD"}
Ticket Link: ${event.source_url || ""}
Description: ${event.description || ""}
Cost: ${cost}
full url to cover image: ${event.image_url || "TBD"}`;
  };

  const handleImport = async () => {
    if (previewEvents.length === 0) return;
    setIsLoading(true);
    setLoadingMessage("Importing events...");

    let totalImported = 0;

    try {
      const eventsToInsert: any[] = [];

      for (const event of previewEvents) {
        // Clean up UI-only properties
        // 'location' must be removed (not in events table). 'ticket_url', 'price_min', 'price_max' are kept.
        const { id, _warning, is_series, dates, import_mode, organizer, google_maps_link, address, location, ...baseEvent } = event;

        // 1. Upsert Venue first if exists
        let venue_id = null;
        if (baseEvent.venue || location) {
          const venueName = baseEvent.venue?.name || location;
          if (venueName) {
            // Try to find existing venue by name approx? or just insert new ones for now to be safe
            // Better strategy: Simple check if exists by name
            const { data: existingVenue } = await supabase.from('venues').select('id').eq('name', venueName).single();

            if (existingVenue) {
              venue_id = existingVenue.id;
            } else {
              // Create new venue
              const { data: newVenue, error: venueError } = await supabase.from('venues').insert({
                name: venueName,
                address_line_1: address || null,
                map_url: google_maps_link || null
              }).select().single();

              if (!venueError && newVenue) {
                venue_id = newVenue.id;
              } else {
                console.error("Failed to create venue", venueError);
              }
            }
          }
        }

        // Let's enhance the description with Host info if needed, or if we have columns
        // For now, let's append rich info to description as a fallback to ensure it's visible
        let richDescription = baseEvent.description || "";

        if (organizer) richDescription = `Hosted by: ${organizer}\n\n${richDescription}`;
        // Map link is now in venue, but keep in description if specific event link differs? No, clean is better.

        // Prepare base object
        const commonData = {
          ...baseEvent,
          description: richDescription,
          status: "approved", // FORCE APPROVED
          venue_id: venue_id,
          // Remove the 'venue' object property which causes the error
          venue: undefined
        };

        if (is_series && import_mode === "split" && dates && dates.length > 0) {
          // SPLIT MODE: Create one event per date
          for (const date of dates) {
            eventsToInsert.push({
              ...commonData,
              start_time: date,
              end_time: null
            });
          }
        } else {
          // MERGE MODE (Default) or Normal Event
          if (is_series && import_mode === "merge") {
            commonData.description += "\n\n(This is a recurring event series.)";
          }
          eventsToInsert.push(commonData);
        }
      }

      const { error } = await supabase.from("events").insert(eventsToInsert);

      if (error) throw error;

      toast.success(`${eventsToInsert.length} events imported successfully as APPROVED`);
      queryClient.invalidateQueries({ queryKey: ["events"] });
      onOpenChange(false);

      // Reset state
      setUrlInput("");
      setTextInput("");
      setPreviewEvents([]);
      setManualSource("manual");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save events");
    } finally {
      setIsLoading(false);
      setLoadingMessage("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-2xl overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Import Events</DialogTitle>
          <DialogDescription>
            Import event details from URLs (one per line) or by pasting text.
          </DialogDescription>
        </DialogHeader>

        {previewEvents.length === 0 ? (
          <Tabs defaultValue="url" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="url">
                <Globe className="h-4 w-4 mr-2" />
                From URLs
              </TabsTrigger>
              <TabsTrigger value="text">
                <FileText className="h-4 w-4 mr-2" />
                From Text
              </TabsTrigger>
            </TabsList>

            <TabsContent value="url">
              <form onSubmit={handlePreview} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="url">Event URLs (One per line)</Label>
                  <Textarea
                    id="url"
                    placeholder="https://eventbrite.com/e/...\nhttps://meetup.com/..."
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    disabled={isLoading}
                    className="min-h-[150px] font-mono text-xs leading-relaxed"
                  />
                </div>
                {error && <ErrorMessage message={error} />}
                <Button type="submit" className="w-full" disabled={isLoading || !urlInput.trim()}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {loadingMessage || "Processing..."}
                    </>
                  ) : "Scan URLs"}
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
                <div className="flex gap-2">
                  <Button onClick={() => handlePreview()} className="flex-1" disabled={isLoading || !textInput}>
                    {isLoading ? "Parsing..." : "Preview"}
                  </Button>
                  <Button onClick={handleQuickCopy} variant="outline" className="flex-none" disabled={isLoading} title={textInput ? "Copy Formatted Text" : "Copy Template"}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between text-sm text-muted-foreground pb-2 border-b">
              <span>Found {previewEvents.length} event{previewEvents.length !== 1 && 's'}</span>
              <Button variant="ghost" size="sm" onClick={() => setPreviewEvents([])} className="h-auto p-0 hover:bg-transparent hover:text-foreground">
                <X className="w-3 h-3 mr-1" /> Clear All
              </Button>
            </div>

            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {previewEvents.map((event, index) => (
                <div key={event.id || index} className="relative group border rounded-lg p-3 hover:bg-muted/50 transition-colors">
                  <div className="flex gap-3">
                    {/* Thumbnail */}
                    <div className="w-24 h-24 shrink-0 bg-muted rounded overflow-hidden">
                      {event.image_url ? (
                        <img src={event.image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          <AlertCircle className="w-6 h-6 opacity-20" />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-sm truncate max-w-[200px]" title={event.title}>{event.title}</h4>
                          {event.is_series && (
                            <span className="flex items-center gap-1 text-[10px] bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 px-1.5 py-0.5 rounded-full font-medium">
                              <Layers className="w-3 h-3" />
                              Series
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 absolute top-2 right-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-primary"
                            onClick={() => handleCopyEvent(event)}
                            title="Copy Details"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                            onClick={() => event.id && handleRemoveEvent(event.id)}
                            title="Remove"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                        {/* Host */}
                        {event.organizer && (
                          <div className="flex items-center gap-1.5 text-foreground/80">
                            <User className="w-3 h-3" />
                            <span className="truncate">{event.organizer}</span>
                          </div>
                        )}

                        {/* Date/Time */}
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3" />
                          <span>
                            {event.start_time && !isNaN(Date.parse(event.start_time))
                              ? format(new Date(event.start_time), "MMM d, h:mm a")
                              : "No Date"}
                            {event.end_time && !isNaN(Date.parse(event.end_time)) && (
                              ` - ${format(new Date(event.end_time), "h:mm a")}`
                            )}
                          </span>
                        </div>

                        {/* Location */}
                        {(event.location || event.venue?.name) && (
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3 h-3" />
                            <span className="truncate max-w-[200px]">{event.location || event.venue?.name}</span>
                            {event.google_maps_link && (
                              <a
                                href={event.google_maps_link}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-500 hover:underline ml-1"
                                title="Open in Google Maps"
                                onClick={(e) => e.stopPropagation()}
                              >
                                (Map)
                              </a>
                            )}
                          </div>
                        )}

                        <div className="flex items-center gap-2 mt-1">
                          <span className="flex items-center gap-1 bg-secondary px-1.5 py-0.5 rounded capitalize">
                            {event.source}
                          </span>
                          <span className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 px-1.5 py-0.5 rounded capitalize text-[10px]">
                            Approved
                          </span>
                        </div>
                      </div>

                      {event.is_series && (
                        <div className="mt-2 p-2 bg-secondary/50 rounded-md flex items-center justify-between gap-2">
                          <span className="text-xs text-muted-foreground">
                            {event.import_mode === "merge"
                              ? "Import as single event"
                              : `Import as ${event.dates?.length || 0} separate events`
                            }
                          </span>
                          <div className="flex items-center gap-2">
                            <Label htmlFor={`mode-${event.id}`} className="text-xs cursor-pointer">Split</Label>
                            <Switch
                              id={`mode-${event.id}`}
                              checked={event.import_mode === "split"}
                              onCheckedChange={(checked) => handleImportModeToggle(event.id!, checked ? "split" : "merge")}
                            />
                          </div>
                        </div>
                      )}

                      {event._warning && (
                        <div className="flex items-center gap-1 text-xs text-amber-600 mt-1">
                          <AlertCircle className="w-3 h-3" />
                          {event._warning}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
              <Button variant="outline" onClick={() => setPreviewEvents([])} disabled={isLoading}>
                Back
              </Button>
              <Button onClick={handleImport} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {loadingMessage}
                  </>
                ) : (
                  `Import Events`
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
    status: "approved",
    source: source,
    venue: venueObj,
    _warning: undefined
  };
}
