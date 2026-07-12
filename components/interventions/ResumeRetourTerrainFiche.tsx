"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type PvFinChantierResume = {
  id: string;
  chantier_termine: boolean | null;
  client_present: boolean | null;
  signature_client_data_url: string | null;
  signature_entreprise_data_url: string | null;
  reserves_client: string | null;
  commentaire_client: string | null;
  commentaire_entreprise: string | null;
};

type Props = {
  entrepriseId: string;
  ficheId: string;
  problemeSignale?: boolean | null;
  descriptionProbleme?: string | null;
};

export default function ResumeRetourTerrainFiche({
  entrepriseId,
  ficheId,
  problemeSignale,
  descriptionProbleme,
}: Props) {
  const [chargement, setChargement] = useState(true);
  const [nombrePhotos, setNombrePhotos] = useState(0);
  const [pv, setPv] = useState<PvFinChantierResume | null>(null);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    chargerResume();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entrepriseId, ficheId]);

  async function chargerResume() {
    if (!entrepriseId || !ficheId) return;

    try {
      setChargement(true);
      setErreur("");

      const [photosResult, pvResult] = await Promise.all([
        supabase
          .from("fiches_intervention_photos")
          .select("id", { count: "exact", head: true })
          .eq("entreprise_id", entrepriseId)
          .eq("fiche_id", ficheId),

        supabase
          .from("pv_fin_chantier")
          .select(`
            id,
            chantier_termine,
            client_present,
            signature_client_data_url,
            signature_entreprise_data_url,
            reserves_client,
            commentaire_client,
            commentaire_entreprise
          `)
          .eq("entreprise_id", entrepriseId)
          .eq("fiche_id", ficheId)
          .maybeSingle(),
      ]);

      if (photosResult.error) {
        console.error("Erreur chargement nombre photos :", photosResult.error);
        setNombrePhotos(0);
      } else {
        setNombrePhotos(photosResult.count || 0);
      }

      if (pvResult.error) {
        console.error("Erreur chargement résumé PV :", pvResult.error);
        setPv(null);
      } else {
        setPv((pvResult.data || null) as PvFinChantierResume | null);
      }
    } catch (error: any) {
      console.error("Erreur chargement résumé retour terrain :", error);
      setErreur(
        error?.message || "Impossible de charger le résumé du retour terrain."
      );
      setNombrePhotos(0);
      setPv(null);
    } finally {
      setChargement(false);
    }
  }

  const pvEnregistre = Boolean(pv?.id);
  const clientSigne = Boolean(pv?.signature_client_data_url);
  const entrepriseSigne = Boolean(pv?.signature_entreprise_data_url);
  const chantierTermine = pv?.chantier_termine === true;

  const reservesOuProbleme = Boolean(
    pv?.reserves_client ||
      pv?.commentaire_client ||
      pv?.commentaire_entreprise ||
      problemeSignale
  );

  if (chargement) {
    return (
      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
        Chargement du retour terrain...
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Retour terrain
        </p>

        <button
          type="button"
          onClick={chargerResume}
          className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
        >
          Actualiser
        </button>
      </div>

      {erreur && (
        <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {erreur}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <span
          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
            nombrePhotos > 0
              ? "bg-blue-100 text-blue-700"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          📸 {nombrePhotos} photo{nombrePhotos > 1 ? "s" : ""}
        </span>

        <span
          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
            pvEnregistre
              ? "bg-emerald-100 text-emerald-700"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          📝 {pvEnregistre ? "PV enregistré" : "Pas de PV"}
        </span>

        <span
          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
            chantierTermine
              ? "bg-emerald-100 text-emerald-700"
              : pvEnregistre
              ? "bg-amber-100 text-amber-700"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          ✅ {chantierTermine ? "Chantier terminé" : "Fin non validée"}
        </span>

        <span
          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
            clientSigne
              ? "bg-emerald-100 text-emerald-700"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          ✍️ Client {clientSigne ? "signé" : "non signé"}
        </span>

        <span
          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
            entrepriseSigne
              ? "bg-emerald-100 text-emerald-700"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          ✍️ Entreprise {entrepriseSigne ? "signée" : "non signée"}
        </span>

        {reservesOuProbleme && (
          <span className="inline-flex rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
            ⚠️ Réserve / problème
          </span>
        )}
      </div>

      {problemeSignale && descriptionProbleme && (
        <p className="mt-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {descriptionProbleme}
        </p>
      )}
    </div>
  );
}