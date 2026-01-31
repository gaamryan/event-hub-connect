
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, MapPin, ArrowLeft, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { Helmet } from "react-helmet"; // Need to install react-helmet or similar if not present, or valid alternatives

// Assuming we can use standard DOM for JSON-LD without Helmet if needed, 
// but Helmet is cleaner. Let's try standard script tag first to avoid deps if Helmet isn't here?
// Plan checks showed standard Vite app. Let's stick to standard script injection or assume Helmet is good practice.
// I will add react-helmet-async as it's better for Vite.

const EventDetail = () => {
    const { id } = useParams<{ id: string }>();

    const { data: event, isLoading } = useQuery({
        queryKey: ["event", id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("events")
                .select(`
          *,
          venue:venues(*),
          host:hosts(*)
        `)
                .eq("id", id)
                .single();

            if (error) throw error;
            return data;
        },
    });

    if (isLoading) {
        return (
            <AppLayout>
                <div className="container mx-auto px-4 py-8">
                    <Skeleton className="h-8 w-1/3 mb-4" />
                    <Skeleton className="h-64 w-full rounded-xl mb-8" />
                    <div className="space-y-4">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-2/3" />
                    </div>
                </div>
            </AppLayout>
        );
    }

    if (!event) {
        return (
            <AppLayout>
                <div className="flex flex-col items-center justify-center min-h-[50vh]">
                    <h1 className="text-2xl font-bold mb-4">Event Not Found</h1>
                    <Button asChild>
                        <Link to="/">Back to Home</Link>
                    </Button>
                </div>
            </AppLayout>
        );
    }

    // Schema.org JSON-LD
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "Event",
        "name": event.title,
        "description": event.description,
        "startDate": event.start_time,
        "endDate": event.end_time || event.start_time, // Fallback
        "eventStatus": "https://schema.org/EventScheduled",
        "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
        "location": event.venue ? {
            "@type": "Place",
            "name": event.venue.name,
            "address": {
                "@type": "PostalAddress",
                "streetAddress": event.venue.address_line_1,
                "addressLocality": event.venue.city,
                "postalCode": event.venue.postal_code,
                "addressRegion": event.venue.state,
                "addressCountry": event.venue.country || "US"
            }
        } : undefined,
        "image": [event.image_url],
        "organizer": event.host ? {
            "@type": "Organization",
            "name": event.host.name,
            "url": event.host.website_url
        } : undefined
    };

    return (
        <AppLayout>
            <script type="application/ld+json">
                {JSON.stringify(jsonLd)}
            </script>

            <div className="container mx-auto px-4 py-8 max-w-4xl">
                <Button variant="ghost" asChild className="mb-6 pl-0 hover:pl-2 transition-all">
                    <Link to="/" className="flex items-center gap-2 text-muted-foreground">
                        <ArrowLeft className="h-4 w-4" />
                        Back to Events
                    </Link>
                </Button>

                <div className="grid md:grid-cols-3 gap-8">
                    <div className="md:col-span-2 space-y-6">
                        {event.image_url && (
                            <div className="rounded-2xl overflow-hidden aspect-video shadow-sm">
                                <img src={event.image_url} alt={event.title} className="w-full h-full object-cover" />
                            </div>
                        )}

                        <div>
                            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">{event.title}</h1>
                            <div className="prose max-w-none text-muted-foreground">
                                {/* Simple text display, if raw HTML is stored use dangerouslySetInnerHTML carefully */}
                                <p>{event.description}</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="p-6 bg-card rounded-xl border shadow-sm sticky top-24 space-y-6">
                            <div className="flex items-start gap-4">
                                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                    <Calendar className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="font-semibold">Date & Time</h3>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {format(new Date(event.start_time), "EEEE, MMMM d, yyyy")}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        {format(new Date(event.start_time), "h:mm a")}
                                        {event.end_time && ` - ${format(new Date(event.end_time), "h:mm a")}`}
                                    </p>
                                </div>
                            </div>

                            {event.venue && (
                                <div className="flex items-start gap-4">
                                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                        <MapPin className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold">Location</h3>
                                        <p className="text-sm text-muted-foreground mt-1 font-medium">
                                            {event.venue.name}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            {event.venue.address_line_1}
                                            <br />
                                            {event.venue.city}, {event.venue.state} {event.venue.postal_code}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {event.ticket_url && (
                                <Button asChild className="w-full" size="lg">
                                    <a href={event.ticket_url} target="_blank" rel="noopener noreferrer">
                                        Get Tickets
                                        <ExternalLink className="ml-2 h-4 w-4" />
                                    </a>
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
};

export default EventDetail;
