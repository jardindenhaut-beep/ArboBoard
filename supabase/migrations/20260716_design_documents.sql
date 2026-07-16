-- Personnalisation des devis, factures et avoirs Arboboard
-- À exécuter dans Supabase avant de déployer les nouveaux fichiers.

alter table public.entreprise_parametres
  add column if not exists design_modele_document text default 'moderne',
  add column if not exists design_couleur_principale text default '#059669',
  add column if not exists design_couleur_secondaire text default '#ECFDF5',
  add column if not exists design_position_logo text default 'gauche',
  add column if not exists design_taille_logo text default 'moyen',
  add column if not exists design_disposition_entete text default 'horizontale',
  add column if not exists design_style_tableau text default 'doux',
  add column if not exists design_lignes_compactes boolean default false,
  add column if not exists design_position_totaux text default 'droite',
  add column if not exists design_afficher_adresse boolean default true,
  add column if not exists design_afficher_contact boolean default true,
  add column if not exists design_afficher_siret boolean default true,
  add column if not exists design_afficher_tva boolean default true,
  add column if not exists design_afficher_assurance boolean default true,
  add column if not exists design_pied_page text default '';

update public.entreprise_parametres
set
  design_modele_document = coalesce(design_modele_document, 'moderne'),
  design_couleur_principale = coalesce(design_couleur_principale, '#059669'),
  design_couleur_secondaire = coalesce(design_couleur_secondaire, '#ECFDF5'),
  design_position_logo = coalesce(design_position_logo, 'gauche'),
  design_taille_logo = coalesce(design_taille_logo, 'moyen'),
  design_disposition_entete = coalesce(
    design_disposition_entete,
    'horizontale'
  ),
  design_style_tableau = coalesce(design_style_tableau, 'doux'),
  design_lignes_compactes = coalesce(design_lignes_compactes, false),
  design_position_totaux = coalesce(design_position_totaux, 'droite'),
  design_afficher_adresse = coalesce(design_afficher_adresse, true),
  design_afficher_contact = coalesce(design_afficher_contact, true),
  design_afficher_siret = coalesce(design_afficher_siret, true),
  design_afficher_tva = coalesce(design_afficher_tva, true),
  design_afficher_assurance = coalesce(
    design_afficher_assurance,
    true
  ),
  design_pied_page = coalesce(design_pied_page, '');

alter table public.entreprise_parametres
  alter column design_modele_document set default 'moderne',
  alter column design_couleur_principale set default '#059669',
  alter column design_couleur_secondaire set default '#ECFDF5',
  alter column design_position_logo set default 'gauche',
  alter column design_taille_logo set default 'moyen',
  alter column design_disposition_entete set default 'horizontale',
  alter column design_style_tableau set default 'doux',
  alter column design_lignes_compactes set default false,
  alter column design_position_totaux set default 'droite',
  alter column design_afficher_adresse set default true,
  alter column design_afficher_contact set default true,
  alter column design_afficher_siret set default true,
  alter column design_afficher_tva set default true,
  alter column design_afficher_assurance set default true,
  alter column design_pied_page set default '';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'entreprise_parametres_design_modele_check'
  ) then
    alter table public.entreprise_parametres
      add constraint entreprise_parametres_design_modele_check
      check (
        design_modele_document in ('moderne', 'classique', 'compact')
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'entreprise_parametres_design_position_logo_check'
  ) then
    alter table public.entreprise_parametres
      add constraint entreprise_parametres_design_position_logo_check
      check (design_position_logo in ('gauche', 'centre', 'droite'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'entreprise_parametres_design_taille_logo_check'
  ) then
    alter table public.entreprise_parametres
      add constraint entreprise_parametres_design_taille_logo_check
      check (design_taille_logo in ('petit', 'moyen', 'grand'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'entreprise_parametres_design_entete_check'
  ) then
    alter table public.entreprise_parametres
      add constraint entreprise_parametres_design_entete_check
      check (
        design_disposition_entete in ('horizontale', 'empilee')
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'entreprise_parametres_design_tableau_check'
  ) then
    alter table public.entreprise_parametres
      add constraint entreprise_parametres_design_tableau_check
      check (design_style_tableau in ('doux', 'lignes', 'minimal'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'entreprise_parametres_design_totaux_check'
  ) then
    alter table public.entreprise_parametres
      add constraint entreprise_parametres_design_totaux_check
      check (design_position_totaux in ('gauche', 'droite'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'entreprise_parametres_design_couleur_principale_check'
  ) then
    alter table public.entreprise_parametres
      add constraint entreprise_parametres_design_couleur_principale_check
      check (
        design_couleur_principale ~ '^#[0-9A-Fa-f]{6}$'
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'entreprise_parametres_design_couleur_secondaire_check'
  ) then
    alter table public.entreprise_parametres
      add constraint entreprise_parametres_design_couleur_secondaire_check
      check (
        design_couleur_secondaire ~ '^#[0-9A-Fa-f]{6}$'
      );
  end if;
end
$$;