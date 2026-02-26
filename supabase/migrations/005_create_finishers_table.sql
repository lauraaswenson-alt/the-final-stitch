-- Private finisher contact book (never shared between users)
CREATE TABLE public.finishers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  city TEXT,
  state TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  instagram TEXT,
  specialties TEXT[] DEFAULT '{}',
  turnaround_notes TEXT,
  price_notes TEXT,
  how_found TEXT,
  personal_notes TEXT,
  personal_rating INTEGER CHECK (personal_rating >= 1 AND personal_rating <= 5),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_finishers_user_id ON public.finishers(user_id);

ALTER TABLE public.finishers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own finishers"
  ON public.finishers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own finishers"
  ON public.finishers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own finishers"
  ON public.finishers FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own finishers"
  ON public.finishers FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER on_finishers_updated
  BEFORE UPDATE ON public.finishers
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
