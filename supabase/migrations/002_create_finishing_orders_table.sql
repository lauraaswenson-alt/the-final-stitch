CREATE TABLE public.finishing_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  canvas_name TEXT NOT NULL,
  designer TEXT,
  photo_url TEXT,
  finisher_name TEXT,
  finish_type TEXT CHECK (finish_type IN ('Ornament', 'Pillow', 'Stocking', 'Belt', 'Bag', 'Framing', 'Other')),
  dropoff_date DATE NOT NULL,
  expected_return_date DATE NOT NULL,
  quoted_price NUMERIC(10, 2),
  deposit_paid BOOLEAN DEFAULT false,
  deposit_amount NUMERIC(10, 2),
  status TEXT DEFAULT 'dropped_off' NOT NULL CHECK (status IN ('dropped_off', 'in_progress', 'ready_for_pickup', 'picked_up', 'paid_in_full')),
  alert_enabled BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_finishing_orders_user_id ON public.finishing_orders(user_id);
CREATE INDEX idx_finishing_orders_status ON public.finishing_orders(status);
CREATE INDEX idx_finishing_orders_expected_return ON public.finishing_orders(expected_return_date);

CREATE TRIGGER on_finishing_orders_updated
  BEFORE UPDATE ON public.finishing_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
