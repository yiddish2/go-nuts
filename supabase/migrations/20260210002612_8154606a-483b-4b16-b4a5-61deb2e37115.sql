
-- Nuts table
CREATE TABLE public.nuts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  image TEXT,
  price_per_ounce NUMERIC(10,2) NOT NULL,
  in_stock BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Containers table
CREATE TABLE public.containers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  max_ounces NUMERIC(10,2) NOT NULL,
  base_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Custom mixes table
CREATE TABLE public.custom_mixes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  container_id UUID NOT NULL REFERENCES public.containers(id) ON DELETE CASCADE,
  total_ounces NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Custom mix items table
CREATE TABLE public.custom_mix_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  custom_mix_id UUID NOT NULL REFERENCES public.custom_mixes(id) ON DELETE CASCADE,
  nut_id UUID NOT NULL REFERENCES public.nuts(id) ON DELETE CASCADE,
  ounces NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.nuts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.containers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_mixes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_mix_items ENABLE ROW LEVEL SECURITY;

-- Public read access for nuts and containers (product catalog)
CREATE POLICY "Anyone can view nuts" ON public.nuts FOR SELECT USING (true);
CREATE POLICY "Anyone can view containers" ON public.containers FOR SELECT USING (true);

-- Public access for custom mixes (no auth yet)
CREATE POLICY "Anyone can create custom mixes" ON public.custom_mixes FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view custom mixes" ON public.custom_mixes FOR SELECT USING (true);
CREATE POLICY "Anyone can update custom mixes" ON public.custom_mixes FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete custom mixes" ON public.custom_mixes FOR DELETE USING (true);

CREATE POLICY "Anyone can create custom mix items" ON public.custom_mix_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view custom mix items" ON public.custom_mix_items FOR SELECT USING (true);
CREATE POLICY "Anyone can update custom mix items" ON public.custom_mix_items FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete custom mix items" ON public.custom_mix_items FOR DELETE USING (true);
