
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function NotificationsBtn() {
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [loading, setLoading] = useState(true);
    const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

    useEffect(() => {
        // Check if SW is supported and registered
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            navigator.serviceWorker.ready.then(reg => {
                setRegistration(reg);
                reg.pushManager.getSubscription().then(sub => {
                    setIsSubscribed(!!sub);
                    setLoading(false);
                });
            });
        } else {
            setLoading(false);
        }
    }, []);

    const urlBase64ToUint8Array = (base64String: string) => {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/-/g, '+')
            .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }

    const subscribe = async () => {
        if (!registration) return;
        setLoading(true);

        try {
            // Need public VAPID key from env or config. 
            // For MVP, we'll assume it's exposed via Vite env or hardcoded for demo.
            const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
            if (!vapidKey) throw new Error("Missing VAPID Public Key");

            const convertedVapidKey = urlBase64ToUint8Array(vapidKey);

            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: convertedVapidKey
            });

            // Send to backend
            const { error } = await supabase.from("push_subscriptions").insert({
                user_id: (await supabase.auth.getUser()).data.user?.id,
                endpoint: subscription.endpoint,
                p256dh: btoa(String.fromCharCode.apply(null, new Uint8Array(subscription.getKey('p256dh')!))),
                auth: btoa(String.fromCharCode.apply(null, new Uint8Array(subscription.getKey('auth')!)))
            });

            if (error) throw error;

            setIsSubscribed(true);
            toast.success("Notifications enabled!");

        } catch (error) {
            console.error(error);
            toast.error("Failed to enable notifications");
        } finally {
            setLoading(false);
        }
    };

    const unsubscribe = async () => {
        // Logic to unsubscribe from PushManager and remove from DB
        // For MVP, just local
        setIsSubscribed(false);
    };

    if (!('serviceWorker' in navigator)) return null;

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={isSubscribed ? unsubscribe : subscribe}
            disabled={loading}
            title={isSubscribed ? "Disable Notifications" : "Enable Notifications"}
        >
            {loading ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : isSubscribed ? (
                <Bell className="h-5 w-5 text-primary" />
            ) : (
                <BellOff className="h-5 w-5 text-muted-foreground" />
            )}
        </Button>
    );
}
