
-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(),'admin'));

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles readable by all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Auto-create profile + default user role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email,'@',1)));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at helper
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Movies
CREATE TABLE public.movies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  release_year INT,
  duration_minutes INT,
  rating TEXT,
  genres TEXT[] NOT NULL DEFAULT '{}',
  poster_url TEXT,
  backdrop_url TEXT,
  trailer_url TEXT,
  video_url TEXT,
  featured BOOLEAN NOT NULL DEFAULT false,
  published BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.movies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published movies readable by all" ON public.movies FOR SELECT USING (published = true OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins insert movies" ON public.movies FOR INSERT WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update movies" ON public.movies FOR UPDATE USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins delete movies" ON public.movies FOR DELETE USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER movies_updated_at BEFORE UPDATE ON public.movies FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX idx_movies_featured ON public.movies(featured) WHERE published = true;
CREATE INDEX idx_movies_genres ON public.movies USING GIN(genres);

-- Subscription plans (UGX)
CREATE TABLE public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  tagline TEXT,
  price_ugx INT NOT NULL,
  billing_period TEXT NOT NULL DEFAULT 'monthly',
  max_quality TEXT,
  max_devices INT NOT NULL DEFAULT 1,
  features TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Plans readable by all" ON public.subscription_plans FOR SELECT USING (is_active = true OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage plans" ON public.subscription_plans FOR ALL USING (public.has_role(auth.uid(),'admin'));

INSERT INTO public.subscription_plans (name, tagline, price_ugx, max_quality, max_devices, features, sort_order) VALUES
('Mobile', 'Watch on the go', 15000, '480p', 1, ARRAY['Watch on phone & tablet','SD quality','1 device'], 1),
('Basic', 'Great for getting started', 30000, '720p', 2, ARRAY['HD quality','Watch on 2 devices','Cancel anytime'], 2),
('Standard', 'Best for couples', 50000, '1080p', 3, ARRAY['Full HD','Watch on 3 devices','Downloads available'], 3),
('Premium', 'For the whole family', 80000, '4K + HDR', 5, ARRAY['Ultra HD + HDR','Watch on 5 devices','Spatial audio','Downloads on all devices'], 4);

-- User subscriptions (placeholder for Flutterwave integration)
CREATE TABLE public.user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id),
  status TEXT NOT NULL DEFAULT 'pending',
  provider TEXT,
  provider_ref TEXT,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own subs" ON public.user_subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own subs" ON public.user_subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all subs" ON public.user_subscriptions FOR SELECT USING (public.has_role(auth.uid(),'admin'));

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES
  ('posters', 'posters', true),
  ('backdrops', 'backdrops', true),
  ('videos', 'videos', true);

-- Storage policies
CREATE POLICY "Public read posters" ON storage.objects FOR SELECT USING (bucket_id IN ('posters','backdrops','videos'));
CREATE POLICY "Admins upload posters" ON storage.objects FOR INSERT WITH CHECK (bucket_id IN ('posters','backdrops','videos') AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update media" ON storage.objects FOR UPDATE USING (bucket_id IN ('posters','backdrops','videos') AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins delete media" ON storage.objects FOR DELETE USING (bucket_id IN ('posters','backdrops','videos') AND public.has_role(auth.uid(),'admin'));
