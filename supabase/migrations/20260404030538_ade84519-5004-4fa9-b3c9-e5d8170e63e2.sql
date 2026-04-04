
ALTER TABLE public.profiles
ADD COLUMN chronotype text DEFAULT NULL,
ADD COLUMN conscientiousness text DEFAULT NULL,
ADD COLUMN neuroticism text DEFAULT NULL;

COMMENT ON COLUMN public.profiles.chronotype IS 'User chronotype: lion (morning), bear (afternoon), wolf (night)';
COMMENT ON COLUMN public.profiles.conscientiousness IS 'Conscientiousness level: high or low';
COMMENT ON COLUMN public.profiles.neuroticism IS 'Neuroticism level: high or low';
