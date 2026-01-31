
import { useEffect } from "react";
import ReactGA from "react-ga4";

export function Analytics() {
    useEffect(() => {
        // Ideally this ID comes from .env
        const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;

        if (measurementId) {
            ReactGA.initialize(measurementId);
            // Track initial page view
            ReactGA.send({ hitType: "pageview", page: window.location.pathname });
        }
    }, []);

    return null;
}
