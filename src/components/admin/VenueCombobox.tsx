import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

interface Venue {
  id: string;
  name: string;
  city: string | null;
  address_line_1: string | null;
}

interface VenueComboboxProps {
  onSelect: (venue: Venue | null) => void;
  onNameChange: (name: string) => void;
  onCityChange: (city: string) => void;
  onAddressChange: (address: string) => void;
  name: string;
  city: string;
  address: string;
}

export function VenueCombobox({
  onSelect,
  onNameChange,
  onCityChange,
  onAddressChange,
  name,
  city,
  address,
}: VenueComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(name);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: venues } = useQuery({
    queryKey: ["venues-search", search],
    queryFn: async () => {
      if (!search || search.length < 2) return [];
      const { data } = await supabase
        .from("venues")
        .select("id, name, city, address_line_1")
        .ilike("name", `%${search}%`)
        .limit(8);
      return (data || []) as Venue[];
    },
    enabled: search.length >= 2,
    staleTime: 30_000,
  });

  useEffect(() => {
    setSearch(name);
  }, [name]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (venue: Venue) => {
    onSelect(venue);
    onNameChange(venue.name);
    onCityChange(venue.city || "");
    onAddressChange(venue.address_line_1 || "");
    setSearch(venue.name);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="space-y-3">
      <div className="relative">
        <Input
          placeholder="Search or enter venue name"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            onNameChange(e.target.value);
            onSelect(null);
            setOpen(true);
          }}
          onFocus={() => search.length >= 2 && setOpen(true)}
        />
        {open && venues && venues.length > 0 && (
          <div className="absolute z-50 top-full mt-1 w-full rounded-md border bg-popover shadow-md max-h-48 overflow-y-auto">
            {venues.map((venue) => (
              <button
                key={venue.id}
                type="button"
                className={cn(
                  "flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-accent transition-colors"
                )}
                onClick={() => handleSelect(venue)}
              >
                <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <div className="font-medium truncate">{venue.name}</div>
                  {venue.city && (
                    <div className="text-xs text-muted-foreground truncate">{venue.city}</div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Input
          placeholder="City"
          value={city}
          onChange={(e) => {
            onCityChange(e.target.value);
            onSelect(null);
          }}
        />
        <Input
          placeholder="Address"
          value={address}
          onChange={(e) => {
            onAddressChange(e.target.value);
            onSelect(null);
          }}
        />
      </div>
    </div>
  );
}
