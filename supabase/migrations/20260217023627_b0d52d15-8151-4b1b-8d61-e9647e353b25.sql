
-- Add parent_event_id to link generated instances back to the recurring parent
ALTER TABLE public.events
ADD COLUMN parent_event_id uuid REFERENCES public.events(id) ON DELETE CASCADE DEFAULT null;

-- Index for efficient lookups of instances by parent
CREATE INDEX idx_events_parent_event_id ON public.events(parent_event_id);
