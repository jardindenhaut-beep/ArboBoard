-- ARBOBOARD — ACCEPTATIONS CONTRACTUELLES
-- Date : 26/07/2026
-- Enregistre :
--   - l'acceptation des CGU et de la Politique de confidentialité à l'inscription ;
--   - l'acceptation des CGV avant l'ouverture de Stripe Checkout.

BEGIN;

CREATE TABLE IF NOT EXISTS public.acceptations_contractuelles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  utilisateur_id uuid NOT NULL
    REFERENCES auth.users(id)
    ON DELETE CASCADE,

  entreprise_id uuid NULL
    REFERENCES public.entreprises_abonnees(id)
    ON DELETE SET NULL,

  type_document text NOT NULL,
  version_document text NOT NULL,
  titre_document text NOT NULL,

  contexte text NOT NULL,
  source text NOT NULL DEFAULT 'arboboard',
  details jsonb NOT NULL DEFAULT '{}'::jsonb,

  user_agent text NULL,
  acceptee_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT acceptations_contractuelles_type_valide
    CHECK (
      type_document IN (
        'cgu',
        'politique_confidentialite',
        'cgv'
      )
    ),

  CONSTRAINT acceptations_contractuelles_contexte_valide
    CHECK (
      contexte IN (
        'inscription',
        'souscription'
      )
    ),

  CONSTRAINT acceptations_contractuelles_version_non_vide
    CHECK (
      char_length(trim(version_document)) BETWEEN 1 AND 50
    ),

  CONSTRAINT acceptations_contractuelles_titre_non_vide
    CHECK (
      char_length(trim(titre_document)) BETWEEN 3 AND 150
    )
);

CREATE INDEX IF NOT EXISTS
  acceptations_contractuelles_utilisateur_date_idx
ON public.acceptations_contractuelles (
  utilisateur_id,
  acceptee_at DESC
);

CREATE INDEX IF NOT EXISTS
  acceptations_contractuelles_entreprise_date_idx
ON public.acceptations_contractuelles (
  entreprise_id,
  acceptee_at DESC
);

CREATE INDEX IF NOT EXISTS
  acceptations_contractuelles_document_version_idx
ON public.acceptations_contractuelles (
  type_document,
  version_document
);

ALTER TABLE public.acceptations_contractuelles
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL
ON TABLE public.acceptations_contractuelles
FROM anon, authenticated;

-- ---------------------------------------------------------
-- Inscription : preuve créée côté base depuis auth.users.
-- Le déclencheur ne concerne que les inscriptions chef
-- portant inscription_arboboard = true.
-- ---------------------------------------------------------

CREATE OR REPLACE FUNCTION
  public.arboboard_enregistrer_acceptations_inscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_version_cgu text;
  v_version_confidentialite text;
  v_user_agent text;
BEGIN
  IF coalesce((v_meta ->> 'inscription_arboboard')::boolean, false) IS NOT TRUE THEN
    RETURN new;
  END IF;

  IF coalesce((v_meta ->> 'acceptation_cgu')::boolean, false) IS NOT TRUE
     OR coalesce((v_meta ->> 'acceptation_confidentialite')::boolean, false) IS NOT TRUE THEN
    RAISE EXCEPTION
      'Les CGU et la Politique de confidentialité doivent être acceptées.';
  END IF;

  v_version_cgu :=
    nullif(trim(v_meta ->> 'version_cgu'), '');

  v_version_confidentialite :=
    nullif(trim(v_meta ->> 'version_confidentialite'), '');

  v_user_agent :=
    nullif(left(trim(coalesce(v_meta ->> 'user_agent', '')), 500), '');

  IF v_version_cgu IS NULL
     OR v_version_confidentialite IS NULL THEN
    RAISE EXCEPTION
      'Les versions juridiques acceptées sont manquantes.';
  END IF;

  INSERT INTO public.acceptations_contractuelles (
    utilisateur_id,
    entreprise_id,
    type_document,
    version_document,
    titre_document,
    contexte,
    source,
    details,
    user_agent
  )
  VALUES
    (
      new.id,
      NULL,
      'cgu',
      v_version_cgu,
      'Conditions générales d’utilisation',
      'inscription',
      'page_inscription',
      jsonb_build_object(
        'email', lower(coalesce(new.email, ''))
      ),
      v_user_agent
    ),
    (
      new.id,
      NULL,
      'politique_confidentialite',
      v_version_confidentialite,
      'Politique de confidentialité',
      'inscription',
      'page_inscription',
      jsonb_build_object(
        'email', lower(coalesce(new.email, ''))
      ),
      v_user_agent
    );

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS
  arboboard_acceptations_apres_creation_utilisateur
ON auth.users;

CREATE TRIGGER
  arboboard_acceptations_apres_creation_utilisateur
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION
  public.arboboard_enregistrer_acceptations_inscription();

-- Rattache automatiquement les preuves d'inscription
-- à l'entreprise dès que le profil chef est créé ou complété.

CREATE OR REPLACE FUNCTION
  public.arboboard_rattacher_acceptations_entreprise()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF new.entreprise_id IS NOT NULL THEN
    UPDATE public.acceptations_contractuelles
    SET entreprise_id = new.entreprise_id
    WHERE utilisateur_id = new.id
      AND entreprise_id IS NULL;
  END IF;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS
  arboboard_rattacher_acceptations_profil
ON public.profils_utilisateurs;

CREATE TRIGGER
  arboboard_rattacher_acceptations_profil
AFTER INSERT OR UPDATE OF entreprise_id
ON public.profils_utilisateurs
FOR EACH ROW
EXECUTE FUNCTION
  public.arboboard_rattacher_acceptations_entreprise();

COMMIT;

SELECT
  type_document,
  contexte,
  count(*) AS nombre
FROM public.acceptations_contractuelles
GROUP BY type_document, contexte
ORDER BY type_document, contexte;