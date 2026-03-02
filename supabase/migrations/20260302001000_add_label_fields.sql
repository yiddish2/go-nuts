ALTER TABLE public.orders
ADD COLUMN shipping_weight_oz numeric,
ADD COLUMN shipping_length_in numeric,
ADD COLUMN shipping_width_in numeric,
ADD COLUMN shipping_height_in numeric,
ADD COLUMN shipengine_label_id text,
ADD COLUMN shipengine_shipment_id text,
ADD COLUMN shipengine_tracking_number text,
ADD COLUMN shipengine_label_url text,
ADD COLUMN shipengine_service_code text,
ADD COLUMN shipengine_carrier_id text,
ADD COLUMN shipengine_label_created_at timestamptz;
