"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type FicheInterventionLiee = {
  id: string;
  numero: string | null;
  titre: string | null;
  type_intervention: string | null;
  statut: string | null;
  date_prevue: string | null;
  date_intervention: string | null;
};

type Props = {
  entrepriseId: string;
  devisId: string;
};

function formatDate(date: string | null | undefined) {
  if (!date) return "Non planifiée";

  try {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(`${date}T00:00:00`));
  } catch {
    return date;
  }
}

function libelleStatut(statut: string | null | undefined) {
  if (statut === "planifiee") return "Planifiée";
  if (statut === "en_cours") return "En cours";
  if (statut === "terminee") return "Terminée";
  if (statut === "annulee") return "Annulée";
  if (statut === "archivee") return "Archivée";
  return "Brouillon";
}

function classeStatut(statut: string | null | undefined) {
  if (statut === "planifiee") return "bg-blue-50 text-blue-700 border-blue-200";
  if (statut === "en_cours") return "bg-amber-50 text-amber-700 border-amber-200";
  if (statut === "terminee")
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (statut === "annulee") return "bg-red-50 text-red-700 border-red-200";
  if (statut === "archivee")
    return "bg-slate-100 text-slate-600 border-slate-200";

  return "bg-slate-50 text-slate-600 border-slate-200";
}

export default function FichesInterventionLieesDevis({
  entrepriseId,
  devisId,
}: Props) {
  const [chargement, setChargement] = useState(true);
  const [fiches, setFiches] = useState<FicheInterventionLiee[]>([]);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    chargerFichesLiees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entrepriseId, devisId]);

  async function chargerFichesLiees() {
    if (!entrepriseId || !devisId) {
      setChargement(false);
      return;
    }

    try {
      setChargement(true);
      setErreur("");

      const { data, error } = await supabase
        .from("fiches_intervention")
        .select(`
          id,
          numero,
          titre,
          type_intervention,
          statut,
          date_prevue,
          date_intervention
        `)
        .eq("entreprise_id", entrepriseId)
        .eq("devis_id", devisId)
        .neq("statut", "archivee")
        .order("date_prevue", { ascending: true })
        .order("created_at", { ascending: false });

      if (error) throw error;

      setFiches((data || []) as FicheInterventionLiee[]);
    } catch (error: any) {
      console.error("Erreur chargement fiches liées au devis :", error);
      setErreur(
        error?.message || "Impossible de charger les fiches liées au devis."
      );
      setFiches([]);
    } finally {
      setChargement(false);
    }
  }

  if (!entrepriseId || !devisId) {
    return null;
  }

  if (chargement) {
    return (
      <div className="rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-500">
        Vérification fiches...
      </div>
    );
  }

  if (erreur) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
        {erreur}
      </div>
    );
  }

  if (fiches.length === 0) {
    return null;
  }

  return (
    <div className="w-full rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold text-emerald-950">
            {fiches.length} fiche{fiches.length > 1 ? "s" : ""} intervention
            liée{fiches.length > 1 ? "s" : ""} à ce devis
          </p>

          <p className="mt-1 text-xs text-emerald-700">
            Tu peux ouvrir la fiche existante ou créer un autre passage si le
            chantier se fait en plusieurs interventions.
          </p>
        </div>

        <button
          type="button"
          onClick={chargerFichesLiees}
          className="w-fit rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
        >
          Actualiser
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {fiches.map((fiche) => (
          <Link
            key={fiche.id}
            href={`/chef/interventions/${fiche.id}`}
            className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
          >
            {fiche.numero || "Fiche"} ·{" "}
            {fiche.titre || fiche.type_intervention || "Intervention"} ·{" "}
            {formatDate(fiche.date_prevue || fiche.date_intervention)}
            <span
              className={`ml-2 rounded-full border px-2 py-0.5 ${classeStatut(
                fiche.statut
              )}`}
            >
              {libelleStatut(fiche.statut)}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}