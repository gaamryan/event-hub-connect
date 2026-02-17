
-- Add recurring event columns
ALTER TABLE public.events
ADD COLUMN is_recurring boolean DEFAULT false,
ADD COLUMN recurrence_frequency text DEFAULT null,
ADD COLUMN recurrence_until timestamp with time zone DEFAULT null;

-- Add a comment for documentation
COMMENT ON COLUMN public.events.recurrence_frequency IS 'daily, weekly, biweekly, monthly';
