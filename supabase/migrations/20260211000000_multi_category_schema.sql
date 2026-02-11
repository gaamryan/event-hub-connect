-- 1. Create the join table for multiple categories
CREATE TABLE IF NOT EXISTS public.event_categories (
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
  PRIMARY KEY (event_id, category_id)
);

-- 2. Migrate existing data (preserve current categories)
INSERT INTO public.event_categories (event_id, category_id)
SELECT id, category_id FROM public.events 
WHERE category_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- 3. Enable Security (RLS)
ALTER TABLE public.event_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read event_categories" 
ON public.event_categories FOR SELECT USING (true);

CREATE POLICY "Admins manage event_categories" 
ON public.event_categories FOR ALL 
USING (public.has_role(auth.uid(), 'admin'));

-- 4. Add new 'Nerds & Gaming' category
INSERT INTO public.categories (name, slug, icon, color, sort_order)
VALUES ('Nerds & Gaming', 'nerds-gaming', '🤓', '#8E44AD', 9)
ON CONFLICT (slug) DO NOTHING;
