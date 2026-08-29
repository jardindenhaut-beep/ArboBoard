-- Arboboard Mobile : appareil de confiance pendant 90 jours
-- Le token brut reste uniquement dans le stockage sécurisé du téléphone.
-- Supabase ne stocke que son empreinte SHA-256.

create extension if not exists pgcrypto;

create or replace function public.mobile_enregistrer_appareil_confiance(
  p_token text,
  p_nom_appareil text default 'Application Arboboard',
  p_navigateur text default null,
  p_systeme text default null,
  p_user_agent text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_user_id uuid := auth.uid();
  v_aal text := coalesce(auth.jwt() ->> 'aal', 'aal1');
  v_profil record;
  v_hash text;
  v_expire_at timestamptz := now() + interval '90 days';
  v_id uuid;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if v_aal <> 'aal2' then
    raise exception 'MFA_REQUIRED';
  end if;

  if p_token is null or length(trim(p_token)) < 40 then
    raise exception 'TOKEN_INVALID';
  end if;

  select entreprise_id, role
    into v_profil
  from public.profils_utilisateurs
  where id = v_user_id
  limit 1;

  if v_profil.entreprise_id is null then
    raise exception 'PROFILE_INVALID';
  end if;

  v_hash := encode(digest(p_token, 'sha256'), 'hex');

  -- Si ce téléphone possédait déjà le même jeton, on révoque l'ancienne entrée.
  update public.appareils_confiance
  set revoque_at = now()
  where utilisateur_id = v_user_id
    and token_hash = v_hash
    and revoque_at is null;

  insert into public.appareils_confiance (
    utilisateur_id,
    entreprise_id,
    role,
    nom_appareil,
    navigateur,
    systeme,
    user_agent,
    token_hash,
    created_at,
    derniere_utilisation_at,
    expire_at,
    revoque_at
  ) values (
    v_user_id,
    v_profil.entreprise_id,
    coalesce(v_profil.role, 'utilisateur'),
    coalesce(nullif(trim(p_nom_appareil), ''), 'Application Arboboard'),
    nullif(trim(p_navigateur), ''),
    nullif(trim(p_systeme), ''),
    nullif(trim(p_user_agent), ''),
    v_hash,
    now(),
    now(),
    v_expire_at,
    null
  )
  returning id into v_id;

  return jsonb_build_object(
    'success', true,
    'id', v_id,
    'expire_at', v_expire_at
  );
end;
$$;

create or replace function public.mobile_verifier_appareil_confiance(
  p_token text
)
returns boolean
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_user_id uuid := auth.uid();
  v_hash text;
  v_id uuid;
begin
  if v_user_id is null then
    return false;
  end if;

  if p_token is null or length(trim(p_token)) < 40 then
    return false;
  end if;

  v_hash := encode(digest(p_token, 'sha256'), 'hex');

  select id
    into v_id
  from public.appareils_confiance
  where utilisateur_id = v_user_id
    and token_hash = v_hash
    and revoque_at is null
    and expire_at > now()
  order by created_at desc
  limit 1;

  if v_id is null then
    return false;
  end if;

  update public.appareils_confiance
  set derniere_utilisation_at = now()
  where id = v_id;

  return true;
end;
$$;

create or replace function public.mobile_revoquer_appareil_confiance(
  p_token text
)
returns boolean
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_user_id uuid := auth.uid();
  v_hash text;
begin
  if v_user_id is null then
    return false;
  end if;

  if p_token is null or length(trim(p_token)) < 40 then
    return false;
  end if;

  v_hash := encode(digest(p_token, 'sha256'), 'hex');

  update public.appareils_confiance
  set revoque_at = now()
  where utilisateur_id = v_user_id
    and token_hash = v_hash
    and revoque_at is null;

  return found;
end;
$$;

revoke all on function public.mobile_enregistrer_appareil_confiance(text,text,text,text,text) from public;
revoke all on function public.mobile_verifier_appareil_confiance(text) from public;
revoke all on function public.mobile_revoquer_appareil_confiance(text) from public;

grant execute on function public.mobile_enregistrer_appareil_confiance(text,text,text,text,text) to authenticated;
grant execute on function public.mobile_verifier_appareil_confiance(text) to authenticated;
grant execute on function public.mobile_revoquer_appareil_confiance(text) to authenticated;
