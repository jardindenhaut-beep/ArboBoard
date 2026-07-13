"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import BoutonEnvoyerPvFinChantierEmail from "@/components/interventions/BoutonEnvoyerPvFinChantierEmail";
import BoutonTelechargerPvFinChantierPdf from "@/components/interventions/BoutonTelechargerPvFinChantierPdf";

type PvFinChantierResume = {
  id: string;
  chantier_termine: boolean | null;
  client_present: boolean | null;
  signature_client: string | null;
  signature_entreprise: string | null;
  reserves: string | null;
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

  /**
   * Affiche les boutons PDF et envoi sous le résumé.
   * À désactiver sur les pages détail où les blocs Photos/PV sont déjà présents.
   */
  afficherActionsPv?: boolean;

  /**
   * Autorisation visuelle d'envoyer le PV au client.
   * Désactivée par défaut pour éviter une exposition accidentelle côté salarié.
   */
  autoriserEnvoiClient?: boolean;
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
  problemeSignale = false,
  descriptionProbleme = null,
  afficherActionsPv = true,
  autoriserEnvoiClient = false,
}: Props) {
  const [chargement, setChargement] = useState(true);
  const [actualisation, setActualisation] = useState(false);
  const [nombrePhotos, setNombrePhotos] = useState(0);
  const [pv, setPv] = useState<PvFinChantierResume | null>(null);
  const [fiche, setFiche] = useState<FicheResume | null>(null);
  const [clientEmail, setClientEmail] = useState("");
  const [erreur, setErreur] = useState("");
  const [envoiOuvert, setEnvoiOuvert] = useState(false);

  useEffect(() => {
    chargerResume(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entrepriseId, ficheId, afficherActionsPv, autoriserEnvoiClient]);

  async function chargerResume(depuisActualisation: boolean) {
    if (!entrepriseId || !ficheId) {
      setChargement(false);
      return;
    }

    try {
      if (depuisActualisation) {
        setActualisation(true);
      } else {
        setChargement(true);
      }

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
            signature_client,
            signature_entreprise,
            reserves,
            commentaire_client,
            commentaire_entreprise,
            envoye_client_at,
            envoye_client_email
          `)
          .eq("entreprise_id", entrepriseId)
          .eq("fiche_id", ficheId)
          .order("created_at", { ascending: false })
          .limit(1)
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

        if (
          afficherActionsPv &&
          autoriserEnvoiClient &&
          ficheData?.client_id
        ) {
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
      setActualisation(false);
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
      setClientEmail(client?.email?.trim() || "");
    } catch (error) {
      console.error("Erreur chargement email client :", error);
      setClientEmail("");
    }
  }

  const pvId = pv?.id ?? null;
  const pvEnregistre = Boolean(pvId);
  const clientSigne = Boolean(pv?.signature_client);
  const entrepriseSigne = Boolean(pv?.signature_entreprise);
  const chantierTermine = pv?.chantier_termine === true;
  const pvEnvoye = Boolean(pv?.envoye_client_at);
  const clientPresent = pv?.client_present === true;

  const reservesOuProbleme = Boolean(
    pv?.reserves ||
      pv?.commentaire_client ||
      pv?.commentaire_entreprise ||
      problemeSignale
  );

  const progression = useMemo(() => {
    let total = 0;

    if (nombrePhotos > 0) total += 1;
    if (pvEnregistre) total += 1;
    if (entrepriseSigne) total += 1;
    if (clientSigne || pv?.client_present === false) total += 1;

    return total;
  }, [nombrePhotos, pvEnregistre, entrepriseSigne, clientSigne, pv]);

  if (chargement) {
    return (
      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
        Chargement du retour terrain...
      </div>
    );
  }

  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
      <div className="flex flex-col gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Retour terrain
            </p>

            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
              {progression}/4 éléments
            </span>
          </div>

          <p className="mt-1 text-xs text-slate-500">
            Photos, PV, signatures, réserves et transmission client.
          </p>
        </div>

        <button
          type="button"
          onClick={() => chargerResume(true)}
          disabled={actualisation}
          className="w-fit rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {actualisation ? "Actualisation..." : "Actualiser"}
        </button>
      </div>

      <div className="p-4">
        {erreur && (
          <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {erreur}
          </div>
        )}

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          <div
            className={`rounded-xl border px-3 py-2.5 text-xs font-semibold ${
              nombrePhotos > 0
                ? "border-blue-200 bg-blue-50 text-blue-700"
                : "border-slate-200 bg-white text-slate-500"
            }`}
          >
            📸 {nombrePhotos} photo{nombrePhotos > 1 ? "s" : ""}
          </div>

          <div
            className={`rounded-xl border px-3 py-2.5 text-xs font-semibold ${
              pvEnregistre
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-slate-200 bg-white text-slate-500"
            }`}
          >
            📝 {pvEnregistre ? "PV enregistré" : "PV non enregistré"}
          </div>

          <div
            className={`rounded-xl border px-3 py-2.5 text-xs font-semibold ${
              chantierTermine
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : pvEnregistre
                  ? "border-amber-200 bg-amber-50 text-amber-700"
                  : "border-slate-200 bg-white text-slate-500"
            }`}
          >
            ✅ {chantierTermine ? "Chantier terminé" : "Fin non validée"}
          </div>

          <div
            className={`rounded-xl border px-3 py-2.5 text-xs font-semibold ${
              entrepriseSigne
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-slate-200 bg-white text-slate-500"
            }`}
          >
            ✍️ Entreprise {entrepriseSigne ? "signée" : "non signée"}
          </div>

          <div
            className={`rounded-xl border px-3 py-2.5 text-xs font-semibold ${
              clientSigne
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : clientPresent
                  ? "border-amber-200 bg-amber-50 text-amber-700"
                  : "border-slate-200 bg-white text-slate-500"
            }`}
          >
            ✍️ Client {clientSigne ? "signé" : "non signé"}
          </div>

          <div
            className={`rounded-xl border px-3 py-2.5 text-xs font-semibold ${
              pvEnvoye
                ? "border-blue-200 bg-blue-50 text-blue-700"
                : "border-slate-200 bg-white text-slate-500"
            }`}
          >
            📧 {pvEnvoye ? "PV envoyé au client" : "PV non envoyé"}
          </div>
        </div>

        {pvEnvoye && (
          <p className="mt-3 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
            PV envoyé le {formatDateHeure(pv?.envoye_client_at)}
            {pv?.envoye_client_email ? ` à ${pv.envoye_client_email}` : ""}.
          </p>
        )}

        {reservesOuProbleme && (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-xs text-red-700">
            <p className="font-bold">⚠️ Réserve ou problème signalé</p>

            {descriptionProbleme && (
              <p className="mt-1 whitespace-pre-line">{descriptionProbleme}</p>
            )}

            {!descriptionProbleme && pv?.reserves && (
              <p className="mt-1 whitespace-pre-line">{pv.reserves}</p>
            )}
          </div>
        )}

        {afficherActionsPv && pvEnregistre && (
          <div className="mt-4 border-t border-slate-200 pt-4">
            <div className="flex flex-wrap items-center gap-2">
              <BoutonTelechargerPvFinChantierPdf ficheId={ficheId} />

              {autoriserEnvoiClient && (
                <button
                  type="button"
                  onClick={() => setEnvoiOuvert((ancien) => !ancien)}
                  className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                >
                  {envoiOuvert
                    ? "Masquer l’envoi email"
                    : "📧 Envoyer le PV au client"}
                </button>
              )}
            </div>

            {autoriserEnvoiClient && !clientEmail && envoiOuvert && (
              <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Aucun email n’est enregistré sur la fiche client. Vous pourrez le
                saisir manuellement avant l’envoi.
              </p>
            )}

            {autoriserEnvoiClient && envoiOuvert && (
              <div className="mt-3">
                <BoutonEnvoyerPvFinChantierEmail
                  ficheId={ficheId}
                  pvId={pvId}
                  emailClient={clientEmail}
                  clientNom={fiche?.client_nom}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}