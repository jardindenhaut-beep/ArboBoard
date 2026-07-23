-- Appareils de confiance Arboboard
-- Un appareil vérifié peut éviter une nouvelle saisie TOTP pendant 90 jours.

create table if not exists public.appareils_confiance (
  id uuid primary key default gen_random_uuid(),
  utilisateur_id uuid not null references auth.users(id) on delete cascade,
  entreprise_id uuid not null references public.entreprises_abonnees(id) on delete cascade,
  role text not null,
  nom_appareil text not null,
  navigateur text,
  systeme text,
  user_agent text,
  token_hash text not null unique,
  created_at timestamp with time zone not null default now(),
  derniere_utilisation_at timestamp with time zone not null default now(),
  expire_at timestamp with time zone not null,
  revoque_at timestamp with time zone
);

create index if not exists appareils_confiance_utilisateur_idx
  on public.appareils_confiance (utilisateur_id);

create index if not exists appareils_confiance_actifs_idx
  on public.appareils_confiance (
    utilisateur_id,
    expire_at
  )
  where revoque_at is null;

alter table public.appareils_confiance enable row level security;

-- Aucun accès direct depuis le navigateur.
-- Toutes les opérations passent par les routes serveur avec la clé service_role.
revoke all on table public.appareils_confiance from anon;
revoke all on table public.appareils_confiance from authenticated;

comment on table public.appareils_confiance is
  'Navigateurs et appareils reconnus après une validation MFA TOTP.';

comment on column public.appareils_confiance.token_hash is
  'Empreinte SHA-256 du jeton secret stocké dans un cookie HttpOnly.';