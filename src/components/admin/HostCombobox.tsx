import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { User } from "lucide-react";
import { cn } from "@/lib/utils";

interface Host {
  id: string;
  name: string;
  website_url: string | null;
}

interface HostComboboxProps {
  onSelect: (host: Host | null) => void;
  onNameChange: (name: string) => void;
  name: string;
}

export function HostCombobox({ onSelect, onNameChange, name }: HostComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(name);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: hosts } = useQuery({
    queryKey: ["hosts-search", search],
    queryFn: async () => {
      if (!search || search.length < 2) return [];
      const { data } = await supabase
        .from("hosts")
        .select("id, name, website_url")
        .ilike("name", `%${search}%`)
        .limit(8);
      return (data || []) as Host[];
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

  const handleSelect = (host: Host) => {
    onSelect(host);
    onNameChange(host.name);
    setSearch(host.name);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <Input
        placeholder="Search or enter host/organizer name"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          onNameChange(e.target.value);
          onSelect(null);
          setOpen(true);
        }}
        onFocus={() => search.length >= 2 && setOpen(true)}
      />
      {open && hosts && hosts.length > 0 && (
        <div className="absolute z-50 top-full mt-1 w-full rounded-md border bg-popover shadow-md max-h-48 overflow-y-auto">
          {hosts.map((host) => (
            <button
              key={host.id}
              type="button"
              className={cn(
                "flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-accent transition-colors"
              )}
              onClick={() => handleSelect(host)}
            >
              <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <div className="font-medium truncate">{host.name}</div>
                {host.website_url && (
                  <div className="text-xs text-muted-foreground truncate">{host.website_url}</div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
