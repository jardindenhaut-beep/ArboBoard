"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import BoutonEnvoyerPvFinChantierEmail from "@/components/interventions/BoutonEnvoyerPvFinChantierEmail";
import BoutonTelechargerPvFinChantierPdf from "@/components/interventions/BoutonTelechargerPvFinChantierPdf";

type PvFinChantierResume = {
  id: string;
  chantier_termine: boolean | null;
  client_present: boolean | null;
  signature_client_data_url: string | null;
  signature_entreprise_data_url: string | null;
  reserves_client: string | null;
  commentaire_client: string | null;
  commentaire_entreprise: string | null;
  envoye_client_at: string | null;
  envoye_client_email: string | null;
};

type FicheResume = {
  id: string;
  client_id: string | null;
  client_nom: string | null;
};

type ClientResume = {
  id: string;
  email: string | null;
};

type Props = {
  entrepriseId: string;
  ficheId: string;
  problemeSignale?: boolean | null;
  descriptionProbleme?: string | null;
};

function formatDateHeure(date: string | null | undefined) {
  if (!date) return "—";

  try {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  } catch {
    return date;
  }
}

export default function ResumeRetourTerrainFiche({
  entrepriseId,
  ficheId,
  problemeSignale,
  descriptionProbleme,
}: Props) {
  const [chargement, setChargement] = useState(true);
  const [nombrePhotos, setNombrePhotos] = useState(0);
  const [pv, setPv] = useState<PvFinChantierResume | null>(null);
  const [fiche, setFiche] = useState<FicheResume | null>(null);
  const [clientEmail, setClientEmail] = useState("");
  const [erreur, setErreur] = useState("");
  const [envoiOuvert, setEnvoiOuvert] = useState(false);

  useEffect(() => {
    chargerResume();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entrepriseId, ficheId]);

  async function chargerResume() {
    if (!entrepriseId || !ficheId) return;

    try {
      setChargement(true);
      setErreur("");

      const [photosResult, pvResult, ficheResult] = await Promise.all([
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
            commentaire_entreprise,
            envoye_client_at,
            envoye_client_email
          `)
          .eq("entreprise_id", entrepriseId)
          .eq("fiche_id", ficheId)
          .maybeSingle(),

        supabase
          .from("fiches_intervention")
          .select("id, client_id, client_nom")
          .eq("entreprise_id", entrepriseId)
          .eq("id", ficheId)
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

      if (ficheResult.error) {
        console.error("Erreur chargement fiche résumé :", ficheResult.error);
        setFiche(null);
        setClientEmail("");
      } else {
        const ficheData = (ficheResult.data || null) as FicheResume | null;
        setFiche(ficheData);

        if (ficheData?.client_id) {
          await chargerEmailClient(ficheData.client_id);
        } else {
          setClientEmail("");
        }
      }
    } catch (error: any) {
      console.error("Erreur chargement résumé retour terrain :", error);

      setErreur(
        error?.message || "Impossible de charger le résumé du retour terrain."
      );

      setNombrePhotos(0);
      setPv(null);
      setFiche(null);
      setClientEmail("");
    } finally {
      setChargement(false);
    }
  }

  async function chargerEmailClient(clientId: string) {
    try {
      const { data, error } = await supabase
        .from("clients")
        .select("id, email")
        .eq("entreprise_id", entrepriseId)
        .eq("id", clientId)
        .maybeSingle();

      if (error) {
        console.error("Erreur chargement email client résumé PV :", error);
        setClientEmail("");
        return;
      }

      const client = (data || null) as ClientResume | null;
      setClientEmail(client?.email || "");
    } catch (error) {
      console.error("Erreur chargement email client :", error);
      setClientEmail("");
    }
  }

  const pvEnregistre = Boolean(pv?.id);
  const clientSigne = Boolean(pv?.signature_client_data_url);
  const entrepriseSigne = Boolean(pv?.signature_entreprise_data_url);
  const chantierTermine = pv?.chantier_termine === true;
  const pvEnvoye = Boolean(pv?.envoye_client_at);

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

        {pvEnvoye && (
          <span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
            📧 Envoyé client
          </span>
        )}

        {reservesOuProbleme && (
          <span className="inline-flex rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
            ⚠️ Réserve / problème
          </span>
        )}
      </div>

      {pvEnvoye && (
        <p className="mt-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
          PV envoyé le {formatDateHeure(pv?.envoye_client_at)}
          {pv?.envoye_client_email ? ` à ${pv.envoye_client_email}` : ""}.
        </p>
      )}

      {problemeSignale && descriptionProbleme && (
        <p className="mt-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {descriptionProbleme}
        </p>
      )}

      {pvEnregistre && (
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <BoutonTelechargerPvFinChantierPdf ficheId={ficheId} />

            <button
              type="button"
              onClick={() => setEnvoiOuvert((ancien) => !ancien)}
              className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
            >
              {envoiOuvert
                ? "Masquer l’envoi email"
                : "📧 Envoyer le PV au client"}
            </button>
          </div>

          {envoiOuvert && (
            <div>
              <BoutonEnvoyerPvFinChantierEmail
                ficheId={ficheId}
                clientEmail={clientEmail}
                clientNom={fiche?.client_nom}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}