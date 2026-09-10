-- Liberação do perfil dns_wil@yahoo.com.br (isento de cobrança / mensalidade)
-- Execute no SQL Editor do Supabase (painel, com service_role se necessário)

DO $$
DECLARE
  v_profile_id uuid := '030f83c9-dd5b-46bd-ac2a-aef1bd75e00c';
BEGIN
  -- Garante que o perfil existe com os dados mínimos
  UPDATE public.profiles
  SET
    name = COALESCE(name, 'DNS Wil'),
    first_name = COALESCE(first_name, 'DNS'),
    role = COALESCE(role, 'admin'),
    email = COALESCE(email, 'dns_wil@yahoo.com.br')
  WHERE id = v_profile_id;

  IF NOT FOUND THEN
    INSERT INTO public.profiles (id, email, name, first_name, role, company_id)
    VALUES (v_profile_id, 'dns_wil@yahoo.com.br', 'DNS Wil', 'DNS', 'admin', gen_random_uuid());
  END IF;
END $$;

-- Confirmação visual (execute após o DO)
SELECT id, email, name, first_name, role, company_id
FROM public.profiles
WHERE id = '030f83c9-dd5b-46bd-ac2a-aef1bd75e00c';
