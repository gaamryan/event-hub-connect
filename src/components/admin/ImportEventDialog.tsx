import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link2, Loader2, Check, AlertCircle, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useImportEventbrite } from "@/hooks/useImportEvent";
import { toast } from "sonner";

interface ImportEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportEventDialog({ open, onOpenChange }: ImportEventDialogProps) {
  const [url, setUrl] = useState("");
  const importMutation = useImportEventbrite();

  const handleImport = async () => {
    if (!url.trim()) {
      toast.error("Please enter an Eventbrite URL");
      return;
    }

    try {
      const result = await importMutation.mutateAsync(url.trim());
      toast.success("Event imported successfully!", {
        description: `"${result.event?.title}" is now pending approval.`,
      });
      setUrl("");
      onOpenChange(false);
    } catch (error: any) {
      const message = error.message || "Failed to import event";
      if (message.includes("already imported")) {
        toast.error("This event has already been imported");
      } else if (message.includes("Admin access")) {
        toast.error("Admin access required to import events");
      } else {
        toast.error(message);
      }
    }
  };

  const isEventbriteUrl = url.includes("eventbrite.com") || url.includes("eventbrite.co");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            Import from Eventbrite
          </DialogTitle>
          <DialogDescription>
            Paste an Eventbrite event URL to import it. The event will be added with "pending" status.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Input
              placeholder="https://www.eventbrite.com/e/event-name-123456789"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={importMutation.isPending}
              className="font-mono text-sm"
            />
            <AnimatePresence>
              {url && !isEventbriteUrl && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-sm text-destructive flex items-center gap-1"
                >
                  <AlertCircle className="h-3 w-3" />
                  Please enter a valid Eventbrite URL
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={importMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleImport}
              disabled={!url.trim() || !isEventbriteUrl || importMutation.isPending}
            >
              {importMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Import Event
                </>
              )}
            </Button>
          </div>

          {/* Supported sources info */}
          <div className="pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground text-center">
              Currently supports: <span className="font-medium">Eventbrite</span>
              <br />
              More sources coming soon: Meetup, TicketSpice, Facebook
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
