DO $$
DECLARE v_company uuid;
BEGIN
  SELECT company_id INTO v_company FROM public.profiles WHERE lower(email) = 'linconricardo20133@gmail.com' LIMIT 1;
  IF v_company IS NOT NULL THEN
    INSERT INTO public.subscriptions (company_id, plan, status, trial_ends_at)
    VALUES (v_company, 'lifetime', 'lifetime', null)
    ON CONFLICT (company_id) DO UPDATE SET plan = 'lifetime', status = 'lifetime', trial_ends_at = null, updated_at = now();
  END IF;
END $$;
SELECT company_id, plan, status FROM public.subscriptions WHERE company_id IN (SELECT company_id FROM public.profiles WHERE lower(email) = 'linconricardo20133@gmail.com');
