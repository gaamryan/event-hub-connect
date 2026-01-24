-- Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create event_status enum
CREATE TYPE public.event_status AS ENUM ('draft', 'pending', 'approved', 'rejected');

-- Create event_source enum
CREATE TYPE public.event_source AS ENUM ('manual', 'eventbrite', 'meetup', 'ticketspice', 'facebook');

-- Categories table
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT,
  color TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Locations/Venues table (shared to prevent data redundancy)
CREATE TABLE public.venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address_line_1 TEXT,
  address_line_2 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'USA',
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Hosts/Organizers table (shared to prevent data redundancy)
CREATE TABLE public.hosts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  source public.event_source,
  source_id TEXT,
  logo_url TEXT,
  website_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(source, source_id)
);

-- Events table
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  venue_id UUID REFERENCES public.venues(id) ON DELETE SET NULL,
  host_id UUID REFERENCES public.hosts(id) ON DELETE SET NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  image_url TEXT,
  image_optimized BOOLEAN DEFAULT false,
  ticket_url TEXT,
  price_min DECIMAL(10, 2),
  price_max DECIMAL(10, 2),
  is_free BOOLEAN DEFAULT false,
  status public.event_status DEFAULT 'pending',
  source public.event_source DEFAULT 'manual',
  source_id TEXT,
  source_url TEXT,
  featured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  approved_at TIMESTAMPTZ,
  approved_by UUID,
  UNIQUE(source, source_id)
);

-- User profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- User roles table (security best practice - separate from profiles)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, role)
);

-- User followed categories (for notifications)
CREATE TABLE public.user_followed_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, category_id)
);

-- Saved events
CREATE TABLE public.saved_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, event_id)
);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_venues_updated_at BEFORE UPDATE ON public.venues FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_hosts_updated_at BEFORE UPDATE ON public.hosts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS Policies

-- Categories: public read, admin write
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Categories are viewable by everyone" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Admins can manage categories" ON public.categories FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Venues: public read, admin write
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Venues are viewable by everyone" ON public.venues FOR SELECT USING (true);
CREATE POLICY "Admins can manage venues" ON public.venues FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Hosts: public read, admin write
ALTER TABLE public.hosts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Hosts are viewable by everyone" ON public.hosts FOR SELECT USING (true);
CREATE POLICY "Admins can manage hosts" ON public.hosts FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Events: approved events public, all for admins
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Approved events are viewable by everyone" ON public.events FOR SELECT USING (status = 'approved');
CREATE POLICY "Admins can view all events" ON public.events FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage events" ON public.events FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Profiles: users can view all, manage own
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User roles: admin only
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage user roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- User followed categories: users manage own
ALTER TABLE public.user_followed_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own followed categories" ON public.user_followed_categories FOR ALL USING (auth.uid() = user_id);

-- Saved events: users manage own
ALTER TABLE public.saved_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own saved events" ON public.saved_events FOR ALL USING (auth.uid() = user_id);

-- Seed some categories
INSERT INTO public.categories (name, slug, icon, color, sort_order) VALUES
  ('Music', 'music', '🎵', '#FF6B4A', 1),
  ('Sports', 'sports', '⚽', '#4A90FF', 2),
  ('Arts & Culture', 'arts-culture', '🎨', '#9B59B6', 3),
  ('Food & Drink', 'food-drink', '🍕', '#F39C12', 4),
  ('Tech & Innovation', 'tech', '💻', '#1ABC9C', 5),
  ('Wellness', 'wellness', '🧘', '#E91E63', 6),
  ('Community', 'community', '🤝', '#3498DB', 7),
  ('Nightlife', 'nightlife', '🌙', '#8E44AD', 8);