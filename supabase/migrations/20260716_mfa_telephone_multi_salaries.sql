-- Arboboard — MFA téléphone et fiabilisation des comptes salariés
-- À exécuter dans Supabase avant le déploiement des fichiers.

alter table public.profils_utilisateurs
  add column if not exists telephone_mfa text;

alter table public.salaries
  add column if not exists user_id uuid,
  add column if not exists profil_id uuid;

update public.salaries s
set
  user_id = coalesce(s.user_id, p.id),
  profil_id = coalesce(s.profil_id, p.id)
from public.profils_utilisateurs p
where p.entreprise_id = s.entreprise_id
  and lower(coalesce(p.role, '')) = 'salarie'
  and nullif(trim(s.email), '') is not null
  and nullif(trim(p.email), '') is not null
  and lower(trim(s.email)) = lower(trim(p.email))
  and (
    s.user_id is null
    or s.profil_id is null
  );

update public.profils_utilisateurs p
set telephone_mfa = s.telephone
from public.salaries s
where p.id = coalesce(s.user_id, s.profil_id)
  and p.entreprise_id = s.entreprise_id
  and lower(coalesce(p.role, '')) = 'salarie'
  and p.telephone_mfa is null
  and nullif(trim(s.telephone), '') is not null;

delete from public.fiches_intervention_salaries doublon
using public.fiches_intervention_salaries conserve
where doublon.fiche_id = conserve.fiche_id
  and doublon.salarie_id = conserve.salarie_id
  and doublon.salarie_id is not null
  and (
    doublon.created_at > conserve.created_at
    or (
      doublon.created_at = conserve.created_at
      and doublon.id::text > conserve.id::text
    )
  );

create unique index if not exists
  fiches_intervention_salaries_fiche_salarie_unique
on public.fiches_intervention_salaries (
  fiche_id,
  salarie_id
)
where salarie_id is not null;

create index if not exists
  salaries_user_id_idx
on public.salaries (user_id)
where user_id is not null;

create index if not exists
  salaries_profil_id_idx
on public.salaries (profil_id)
where profil_id is not null;

create or replace function arboboard_private.salarie_courant(
  p_entreprise_id uuid
)
returns uuid
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
  select s.id
  from public.salaries s
  join public.profils_utilisateurs p
    on p.id = auth.uid()
   and p.entreprise_id = p_entreprise_id
  where s.entreprise_id = p_entreprise_id
    and lower(coalesce(p.statut, 'actif')) = 'actif'
    and lower(coalesce(p.role, '')) = 'salarie'
    and lower(coalesce(s.statut, 'actif')) not in (
      'archive',
      'archivee',
      'archivée',
      'inactif',
      'supprime',
      'supprimee',
      'supprimé',
      'supprimée'
    )
    and (
      s.user_id = auth.uid()
      or s.profil_id = auth.uid()
      or (
        nullif(trim(s.email), '') is not null
        and nullif(trim(p.email), '') is not null
        and lower(trim(s.email)) = lower(trim(p.email))
      )
    )
  order by
    case
      when s.user_id = auth.uid() then 1
      when s.profil_id = auth.uid() then 2
      else 3
    end
  limit 1;
$function$;

grant execute
on function arboboard_private.salarie_courant(uuid)
to authenticated;

-- Contrôle de cohérence facultatif :
-- select id, email, telephone_mfa from public.profils_utilisateurs;
-- select id, email, user_id, profil_id from public.salaries;