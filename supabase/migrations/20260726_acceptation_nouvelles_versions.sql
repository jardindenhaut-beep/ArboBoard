-- ARBOBOARD — ACCEPTATION DES NOUVELLES VERSIONS JURIDIQUES
-- Autorise le contexte "mise_a_jour" dans les preuves contractuelles.

BEGIN;

ALTER TABLE public.acceptations_contractuelles
  DROP CONSTRAINT IF EXISTS
    acceptations_contractuelles_contexte_valide;

ALTER TABLE public.acceptations_contractuelles
  ADD CONSTRAINT
    acceptations_contractuelles_contexte_valide
  CHECK (
    contexte IN (
      'inscription',
      'souscription',
      'mise_a_jour'
    )
  );

COMMIT;

SELECT
  conname,
  pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid =
  'public.acceptations_contractuelles'::regclass
  AND conname =
    'acceptations_contractuelles_contexte_valide';