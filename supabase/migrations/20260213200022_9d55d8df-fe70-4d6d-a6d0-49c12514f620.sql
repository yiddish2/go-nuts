
-- Orders table to track placed orders
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  customer_name text,
  customer_email text,
  total_price numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  notes text
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view orders" ON public.orders FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can create orders" ON public.orders FOR INSERT
  WITH CHECK (true);
CREATE POLICY "Admins can update orders" ON public.orders FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete orders" ON public.orders FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Order items table
CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  item_name text NOT NULL,
  item_description text,
  price numeric NOT NULL DEFAULT 0,
  quantity integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view order items" ON public.order_items FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can create order items" ON public.order_items FOR INSERT
  WITH CHECK (true);
