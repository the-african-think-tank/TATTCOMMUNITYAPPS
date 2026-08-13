ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS "allowedTiers" VARCHAR(32)[] DEFAULT '{}';
