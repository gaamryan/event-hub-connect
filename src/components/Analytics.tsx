
import { useEffect } from "react";
import ReactGA from "react-ga4";
import { useSettings } from "@/hooks/useSettings";

export function Analytics() {
    const { data: settings } = useSettings();

    useEffect(() => {
        const measurementId =
            import.meta.env.VITE_GA_MEASUREMENT_ID ||
            settings?.ga_measurement_id;

        if (measurementId) {
            ReactGA.initialize(measurementId);
            ReactGA.send({ hitType: "pageview", page: window.location.pathname });
        }
    }, [settings?.ga_measurement_id]);

    return null;
}
