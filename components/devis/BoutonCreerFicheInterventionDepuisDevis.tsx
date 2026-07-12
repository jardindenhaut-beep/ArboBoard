"use client";

import Link from "next/link";

type Props = {
  devisId: string;
  statut?: string | null;
  factureLiee?: {
    id: string;
    numero?: string | null;
    statut?: string | null;
  } | null;
};

export default function BoutonCreerFicheInterventionDepuisDevis({
  devisId,
  statut,
  factureLiee,
}: Props) {
  const peutCreerFiche =
    statut === "accepte" || statut === "facture" || Boolean(factureLiee);

  if (!devisId || !peutCreerFiche) {
    return null;
  }

  return (
    <Link
      href={`/chef/interventions?devisId=${devisId}`}
      className="rounded-xl border border-emerald-200 px-3 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
    >
      Créer fiche intervention
    </Link>
  );
}