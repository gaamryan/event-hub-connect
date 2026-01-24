import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { useAllEvents, useUpdateEventStatus, useDeleteEvents, Event } from "@/hooks/useEvents";
import { ImportEventDialog } from "@/components/admin/ImportEventDialog";
import { DataSources } from "@/components/admin/DataSources";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { NotificationsBtn } from "@/components/ui/NotificationsBtn";
import { useAuth, useIsAdmin } from "@/hooks/useAuth";
import { format } from "date-fns";
import {
  Search,
  Filter,
  Check,
  X,
  Trash2,
  Edit,
  ChevronRight,
  LogIn,
  Shield,
  Plus,
  Database,
  Calendar,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type StatusFilter = "pending" | "approved" | "rejected" | "draft" | undefined;
type SourceFilter = "manual" | "eventbrite" | "meetup" | "ticketspice" | "facebook" | undefined;

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  draft: "bg-gray-100 text-gray-800",
};

const Admin = () => {
  const { user, signIn, signUp, signOut, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useIsAdmin();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>(undefined);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set());
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);

  // Auth form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [authError, setAuthError] = useState("");

  const { data: events, isLoading } = useAllEvents({
    status: statusFilter,
    source: sourceFilter,
    search: searchQuery || undefined,
  });

  const updateStatus = useUpdateEventStatus();
  const deleteEvents = useDeleteEvents();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    const { error } = isSignUp
      ? await signUp(email, password)
      : await signIn(email, password);
    if (error) setAuthError(error.message);
  };

  const toggleSelectEvent = (eventId: string) => {
    setSelectedEvents((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (events) {
      setSelectedEvents(new Set(events.map((e) => e.id)));
    }
  };

  const clearSelection = () => {
    setSelectedEvents(new Set());
  };

  const handleBulkApprove = async () => {
    if (selectedEvents.size === 0) return;
    await updateStatus.mutateAsync({ eventIds: Array.from(selectedEvents), status: "approved" });
    clearSelection();
  };

  const handleBulkReject = async () => {
    if (selectedEvents.size === 0) return;
    await updateStatus.mutateAsync({ eventIds: Array.from(selectedEvents), status: "rejected" });
    clearSelection();
  };

  const handleBulkDelete = async () => {
    if (selectedEvents.size === 0) return;
    await deleteEvents.mutateAsync(Array.from(selectedEvents));
    clearSelection();
  };

  // Loading state
  if (authLoading || adminLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-pulse-soft text-muted-foreground">Loading...</div>
        </div>
      </AppLayout>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <AppLayout>
        <PageHeader title="Admin" subtitle="Sign in to manage events" />
        <div className="p-4 max-w-sm mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="admin-panel p-6"
          >
            <div className="w-16 h-16 rounded-full bg-secondary mx-auto flex items-center justify-center mb-4">
              <LogIn className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold text-center mb-6">
              {isSignUp ? "Create Account" : "Sign In"}
            </h2>

            <form onSubmit={handleAuth} className="space-y-4">
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
              {authError && (
                <p className="text-sm text-destructive">{authError}</p>
              )}
              <Button type="submit" className="w-full">
                {isSignUp ? "Create Account" : "Sign In"}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-4">
              {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
              <button
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-primary font-medium"
              >
                {isSignUp ? "Sign In" : "Sign Up"}
              </button>
            </p>
          </motion.div>
        </div>
      </AppLayout>
    );
  }

  // Logged in but not admin
  if (!isAdmin) {
    return (
      <AppLayout>
        <PageHeader title="Admin" subtitle="Access restricted" />
        <div className="p-4 text-center py-20">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="w-20 h-20 rounded-full bg-secondary mx-auto flex items-center justify-center mb-4">
              <Shield className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Admin Access Required</h3>
            <p className="text-muted-foreground text-sm max-w-xs mx-auto mb-4">
              Your account doesn't have admin privileges.
            </p>
            <Button variant="outline" onClick={signOut}>
              Sign Out
            </Button>
          </motion.div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader title="Admin" subtitle={`${events?.length || 0} events`}>
        <Button variant="outline" size="sm" onClick={signOut}>
          Sign Out
        </Button>
        <Button size="sm" onClick={() => setIsImportOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Import Event
        </Button>
        <NotificationsBtn />
      </PageHeader>
      <Tabs defaultValue="events" className="w-full">
        <div className="px-4 border-b border-border bg-background">
          <TabsList className="mb-[-1px] h-12 bg-transparent p-0">
            <TabsTrigger value="events" className="h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 font-medium">
              <Calendar className="mr-2 h-4 w-4" />
              Events
            </TabsTrigger>
            <TabsTrigger value="sources" className="h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 font-medium">
              <Database className="mr-2 h-4 w-4" />
              Data Sources
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="events" className="m-0">
          {/* Filters */}
          <div className="sticky top-[73px] bg-background/95 backdrop-blur-md z-30 border-b border-border p-4 space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Status Filter */}
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {(["pending", "approved", "rejected", "draft"] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(statusFilter === status ? undefined : status)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm font-medium capitalize transition-colors",
                    statusFilter === status
                      ? statusColors[status]
                      : "bg-secondary text-secondary-foreground"
                  )}
                >
                  {status}
                </button>
              ))}
            </div>

            {/* Bulk Actions */}
            {selectedEvents.size > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 p-3 bg-secondary rounded-xl"
              >
                <span className="text-sm font-medium flex-1">
                  {selectedEvents.size} selected
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleBulkApprove}
                  disabled={updateStatus.isPending}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleBulkReject}
                  disabled={updateStatus.isPending}
                >
                  <X className="h-4 w-4 mr-1" />
                  Reject
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  onClick={handleBulkDelete}
                  disabled={deleteEvents.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </motion.div>
            )}
          </div>

          {/* Event List */}
          <div className="p-4 space-y-2">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="skeleton h-20 rounded-xl" />
              ))
            ) : events && events.length > 0 ? (
              <>
                <div className="flex items-center justify-between mb-2">
                  <button
                    onClick={selectedEvents.size === events.length ? clearSelection : selectAll}
                    className="text-sm text-primary font-medium"
                  >
                    {selectedEvents.size === events.length ? "Deselect All" : "Select All"}
                  </button>
                </div>
                {events.map((event) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="admin-panel p-3 flex items-center gap-3"
                  >
                    <Checkbox
                      checked={selectedEvents.has(event.id)}
                      onCheckedChange={() => toggleSelectEvent(event.id)}
                    />
                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => setEditingEvent(event)}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn("status-badge", event.status)}>
                          {event.status}
                        </span>
                        <span className="text-xs text-muted-foreground capitalize">
                          {event.source}
                        </span>
                      </div>
                      <h4 className="font-medium text-sm truncate">{event.title}</h4>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(event.start_time), "MMM d, yyyy")}
                        {event.venue?.name && ` • ${event.venue.name}`}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  </motion.div>
                ))}
              </>
            ) : (
              <div className="text-center py-16">
                <p className="text-muted-foreground">No events found</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="sources" className="p-4 m-0">
          <DataSources />
        </TabsContent>
      </Tabs>

      {/* Quick Edit Drawer */}
      <Sheet open={!!editingEvent} onOpenChange={() => setEditingEvent(null)}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
          <SheetHeader>
            <SheetTitle>Edit Event</SheetTitle>
          </SheetHeader>
          {editingEvent && (
            <div className="mt-6 space-y-4 overflow-y-auto">
              {editingEvent.image_url && (
                <div className="relative">
                  <ImageUpload
                    value={editingEvent.image_url}
                    onChange={(url) => {
                      updateStatus.mutate({ eventIds: [editingEvent.id], status: editingEvent.status }); // Just to trigger a refresh logic if needed, ideally separate update field
                      // Actually we need to update the event with the new URL
                      // We don't have a specific updateEvent mutation exposed in hooks yet for fields other than status
                      // For MVP, we might need to add one or just update local state and rely on a specific save button?
                      // The current UI seems to save on status change or has no explicit save?
                      // Wait, the original code didn't have a save button for title/desc editing. 
                      // It seems it was just a view or "Quick Edit" for Status.
                      // Let's add a "Save Changes" button or auto-save?
                      setEditingEvent({ ...editingEvent, image_url: url });
                    }}
                  />
                </div>
              )}
              {/* If no image, show uploader too */}
              {!editingEvent.image_url && (
                <ImageUpload
                  value={null}
                  onChange={(url) => setEditingEvent({ ...editingEvent, image_url: url })}
                />
              )}
              <div>
                <label className="text-sm font-medium text-muted-foreground">Title</label>
                <p className="text-lg font-semibold">{editingEvent.title}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Status</label>
                <div className="flex gap-2 mt-2">
                  {(["pending", "approved", "rejected"] as const).map((status) => (
                    <Button
                      key={status}
                      variant={editingEvent.status === status ? "default" : "outline"}
                      size="sm"
                      className="capitalize"
                      onClick={() => {
                        updateStatus.mutate({ eventIds: [editingEvent.id], status });
                        setEditingEvent({ ...editingEvent, status });
                      }}
                    >
                      {status}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Date & Time</label>
                <p>{format(new Date(editingEvent.start_time), "EEEE, MMMM d, yyyy 'at' h:mm a")}</p>
              </div>
              {editingEvent.venue && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Venue</label>
                  <p>{editingEvent.venue.name}</p>
                </div>
              )}
              {editingEvent.description && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Description</label>
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {editingEvent.description.replace(/<[^>]*>/g, '')}
                  </p>
                </div>
              )}
              <div className="pt-4 flex gap-2">
                <Button
                  className="flex-1"
                  onClick={async () => {
                    // We need a way to save the Image URL change.
                    // The hooks don't have an 'updateEvent' mutation yet.
                    // Let's assume we'll add one or just use supabase client directly here for MVP speed.
                    // A bit hacky but works for keeping context.
                    const { error } = await supabase.from('events').update({
                      image_url: editingEvent.image_url
                    }).eq('id', editingEvent.id);

                    if (!error) {
                      toast.success("Event updated");
                      setEditingEvent(null);
                    } else {
                      toast.error("Failed to update event");
                    }
                  }}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Save
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => {
                    deleteEvents.mutate([editingEvent.id]);
                    setEditingEvent(null);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
      {/* Import Dialog */}
      <ImportEventDialog open={isImportOpen} onOpenChange={setIsImportOpen} />
    </AppLayout>
  );
};

export default Admin;
