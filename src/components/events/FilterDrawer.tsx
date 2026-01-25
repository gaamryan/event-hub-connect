import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface EventFilters {
  dateFrom?: Date;
  dateTo?: Date;
  priceMin?: number;
  priceMax?: number;
  isFree?: boolean;
  location?: string;
}

interface FilterDrawerProps {
  filters: EventFilters;
  onFiltersChange: (filters: EventFilters) => void;
  activeFilterCount: number;
}

export function FilterDrawer({ filters, onFiltersChange, activeFilterCount }: FilterDrawerProps) {
  const [localFilters, setLocalFilters] = useState<EventFilters>(filters);
  const [open, setOpen] = useState(false);

  const handleApply = () => {
    onFiltersChange(localFilters);
    setOpen(false);
  };

  const handleReset = () => {
    const resetFilters: EventFilters = {};
    setLocalFilters(resetFilters);
    onFiltersChange(resetFilters);
  };

  const updateFilter = <K extends keyof EventFilters>(key: K, value: EventFilters[K]) => {
    setLocalFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {activeFilterCount > 0 && (
            <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <div className="mx-auto w-full max-w-lg">
          <DrawerHeader>
            <DrawerTitle className="flex items-center justify-between">
              <span>Filter Events</span>
              {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" onClick={handleReset} className="text-muted-foreground">
                  Clear all
                </Button>
              )}
            </DrawerTitle>
          </DrawerHeader>

          <div className="p-4 space-y-6">
            {/* Date Range */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Date Range</Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">From</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !localFilters.dateFrom && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {localFilters.dateFrom ? format(localFilters.dateFrom, "MMM d") : "Start"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 z-50" align="start">
                      <Calendar
                        mode="single"
                        selected={localFilters.dateFrom}
                        onSelect={(date) => updateFilter("dateFrom", date)}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">To</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !localFilters.dateTo && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {localFilters.dateTo ? format(localFilters.dateTo, "MMM d") : "End"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 z-50" align="start">
                      <Calendar
                        mode="single"
                        selected={localFilters.dateTo}
                        onSelect={(date) => updateFilter("dateTo", date)}
                        disabled={(date) => localFilters.dateFrom ? date < localFilters.dateFrom : false}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>

            {/* Price */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Price</Label>
                <div className="flex items-center gap-2">
                  <Label htmlFor="free-only" className="text-sm text-muted-foreground">Free only</Label>
                  <Switch
                    id="free-only"
                    checked={localFilters.isFree || false}
                    onCheckedChange={(checked) => updateFilter("isFree", checked)}
                  />
                </div>
              </div>
              
              {!localFilters.isFree && (
                <div className="space-y-4">
                  <Slider
                    value={[localFilters.priceMin || 0, localFilters.priceMax || 200]}
                    onValueChange={([min, max]) => {
                      updateFilter("priceMin", min);
                      updateFilter("priceMax", max);
                    }}
                    max={200}
                    step={5}
                    className="py-4"
                  />
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>${localFilters.priceMin || 0}</span>
                    <span>${localFilters.priceMax || 200}+</span>
                  </div>
                </div>
              )}
            </div>

            {/* Location */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Location</Label>
              <Input
                placeholder="City or venue name..."
                value={localFilters.location || ""}
                onChange={(e) => updateFilter("location", e.target.value)}
              />
            </div>
          </div>

          <DrawerFooter className="pt-2">
            <Button onClick={handleApply} className="w-full">
              Apply Filters
            </Button>
            <DrawerClose asChild>
              <Button variant="outline" className="w-full">Cancel</Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
