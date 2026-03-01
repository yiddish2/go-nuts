
-- Add auto-incrementing order number
CREATE SEQUENCE public.order_number_seq START 1001;

ALTER TABLE public.orders
ADD COLUMN order_number integer NOT NULL DEFAULT nextval('public.order_number_seq');

-- Create unique index
CREATE UNIQUE INDEX idx_orders_order_number ON public.orders (order_number);
