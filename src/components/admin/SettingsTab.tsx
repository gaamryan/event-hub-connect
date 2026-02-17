import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useSettings, useUpdateSetting } from "@/hooks/useSettings";
import { Loader2 } from "lucide-react";

const DEFAULT_IMPORT_TEMPLATE = `please organize and state the following:
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
Cover Image : please copy and paste the full url path to the cover image`;

export function SettingsTab() {
    const { data: settings, isLoading } = useSettings();
    const updateSetting = useUpdateSetting();

    const [limit, setLimit] = useState(20);
    const [showSaved, setShowSaved] = useState(false);
    const [showAdmin, setShowAdmin] = useState(false);
    const [importTemplate, setImportTemplate] = useState(DEFAULT_IMPORT_TEMPLATE);
    const [gaMeasurementId, setGaMeasurementId] = useState("");

    useEffect(() => {
        if (settings?.pagination_limit?.value) {
            setLimit(settings.pagination_limit.value);
        }
        if (settings?.nav_visibility) {
            setShowSaved(settings.nav_visibility.saved ?? false);
            setShowAdmin(settings.nav_visibility.admin ?? false);
        }
        if (settings?.import_template) {
            setImportTemplate(settings.import_template);
        }
        if (settings?.ga_measurement_id) {
            setGaMeasurementId(settings.ga_measurement_id);
        }
    }, [settings]);

    const handleSave = () => {
        updateSetting.mutate({
            key: "pagination_limit",
            value: { value: parseInt(limit.toString()) }
        });
    };

    const handleNavToggle = (tab: "saved" | "admin", enabled: boolean) => {
        const current = settings?.nav_visibility || { saved: false, admin: false };
        const updated = { ...current, [tab]: enabled };
        if (tab === "saved") setShowSaved(enabled);
        if (tab === "admin") setShowAdmin(enabled);
        updateSetting.mutate({
            key: "nav_visibility",
            value: updated
        });
    };

    const handleSaveTemplate = () => {
        updateSetting.mutate({
            key: "import_template",
            value: importTemplate
        });
    };

    if (isLoading) {
        return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-muted-foreground" /></div>;
    }

    return (
        <div className="max-w-xl space-y-8 p-4">
            <div className="space-y-4">
                <h3 className="text-lg font-medium">General Settings</h3>

                <div className="space-y-2">
                    <Label htmlFor="pagination">Events per Page</Label>
                    <div className="flex gap-2">
                        <Input
                            id="pagination"
                            type="number"
                            min={1}
                            max={100}
                            value={limit}
                            onChange={(e) => setLimit(parseInt(e.target.value))}
                            className="max-w-[150px]"
                        />
                        <Button onClick={handleSave} disabled={updateSetting.isPending}>
                            {updateSetting.isPending ? "Saving..." : "Save"}
                        </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Number of events to load at once on the home page.
                    </p>
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="text-lg font-medium">Navigation Tabs</h3>
                <p className="text-sm text-muted-foreground">
                    Show or hide tabs in the bottom navigation bar.
                </p>

                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <Label>Saved Events</Label>
                            <p className="text-sm text-muted-foreground">Allow users to bookmark events</p>
                        </div>
                        <Switch checked={showSaved} onCheckedChange={(v) => handleNavToggle("saved", v)} />
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <Label>Admin</Label>
                            <p className="text-sm text-muted-foreground">Show admin tab in navigation</p>
                        </div>
                        <Switch checked={showAdmin} onCheckedChange={(v) => handleNavToggle("admin", v)} />
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="text-lg font-medium">Import Template</h3>
                <p className="text-sm text-muted-foreground">
                    This text is copied to clipboard when clicking "Copy Template" in the import dialog.
                </p>
                <Textarea
                    value={importTemplate}
                    onChange={(e) => setImportTemplate(e.target.value)}
                    className="min-h-[200px] font-mono text-sm"
                />
                <Button onClick={handleSaveTemplate} disabled={updateSetting.isPending}>
                    {updateSetting.isPending ? "Saving..." : "Save Template"}
                </Button>
            </div>

            <div className="space-y-4">
                <h3 className="text-lg font-medium">Site Analytics</h3>
                <p className="text-sm text-muted-foreground">
                    Connect Google Analytics to track visitor activity. Enter your GA4 Measurement ID (e.g. G-XXXXXXXXXX).
                </p>
                <div className="flex gap-2">
                    <Input
                        placeholder="G-XXXXXXXXXX"
                        value={gaMeasurementId}
                        onChange={(e) => setGaMeasurementId(e.target.value)}
                        className="max-w-[250px]"
                    />
                    <Button
                        onClick={() => updateSetting.mutate({ key: "ga_measurement_id", value: gaMeasurementId })}
                        disabled={updateSetting.isPending}
                    >
                        {updateSetting.isPending ? "Saving..." : "Save"}
                    </Button>
                </div>
            </div>
        </div>
    );
}