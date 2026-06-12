"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type AvoirHistorique = {
  id: string;
  entreprise_id: string | null;
  facture_origine_id: string | null;
  facture_avoir_id: string | null;
  numero_facture_origine: string | null;
  numero_avoir: string | null;
  motif: string | null;
  montant_ht: number | null;
  montant_tva: number | null;
  montant_ttc: number | null;
  avoir_total: boolean | null;
  cree_par: string | null;
  created_at: string | null;
};

type Props = {
  factureId: string;
  numero?: string | null;
};

function formatMontant(montant: number | null | undefined) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(Number(montant || 0));
}

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
    return "—";
  }
}

export default function HistoriqueAvoirsFacture({ factureId, numero }: Props) {
  const [modalOuverte, setModalOuverte] = useState(false);
  const [chargement, setChargement] = useState(false);
  const [avoirs, setAvoirs] = useState<AvoirHistorique[]>([]);
  const [messageErreur, setMessageErreur] = useState("");

  async function ouvrirHistorique() {
    setModalOuverte(true);
    await chargerAvoirs();
  }

  function fermerHistorique() {
    setModalOuverte(false);
  }

  async function chargerAvoirs() {
    try {
      setChargement(true);
      setMessageErreur("");

      const { data, error } = await supabase
        .from("factures_avoirs")
        .select("*")
        .or(`facture_origine_id.eq.${factureId},facture_avoir_id.eq.${factureId}`)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setAvoirs((data || []) as AvoirHistorique[]);
    } catch (error: any) {
      console.error("Erreur chargement historique avoirs :", error);
      setMessageErreur(
        error?.message || "Impossible de charger l’historique des avoirs."
      );
    } finally {
      setChargement(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={ouvrirHistorique}
        className="rounded-xl border border-purple-200 px-3 py-2 text-xs font-medium text-purple-700 hover:bg-purple-50"
      >
        Historique avoirs
      </button>

      {modalOuverte && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/40 px-4 py-6">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 p-5">
              <div>
                <h2 className="text-xl font-bold text-slate-950">
                  Historique des avoirs
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {numero ? `Document ${numero}` : "Document sélectionné"}
                </p>
              </div>

              <button
                type="button"
                onClick={fermerHistorique}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Fermer
              </button>
            </div>

            <div className="p-5">
              {messageErreur && (
                <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {messageErreur}
                </div>
              )}

              {chargement ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center">
                  <p className="font-semibold text-slate-900">
                    Chargement de l’historique...
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Récupération des avoirs liés.
                  </p>
                </div>
              ) : avoirs.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-2xl">
                    🧾
                  </div>
                  <p className="font-semibold text-slate-900">
                    Aucun avoir lié
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Aucun avoir n’a encore été créé pour ce document.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {avoirs.map((avoir) => (
                    <div
                      key={avoir.id}
                      className="rounded-2xl border border-purple-200 bg-purple-50 p-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-sm font-bold uppercase tracking-wide text-purple-700">
                            Avoir lié
                          </p>

                          <p className="mt-2 text-sm text-purple-900">
                            Facture d’origine :{" "}
                            <span className="font-bold">
                              {avoir.numero_facture_origine || "—"}
                            </span>
                          </p>

                          <p className="mt-1 text-sm text-purple-900">
                            Avoir :{" "}
                            <span className="font-bold">
                              {avoir.numero_avoir || "—"}
                            </span>
                          </p>

                          <p className="mt-1 text-sm text-purple-900">
                            Montant TTC :{" "}
                            <span className="font-bold">
                              {formatMontant(avoir.montant_ttc)}
                            </span>
                          </p>

                          <p className="mt-1 text-xs text-purple-800">
                            Créé le : {formatDateHeure(avoir.created_at)}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2 sm:justify-end">
                          {avoir.facture_origine_id && (
                            <a
                              href={`/chef/factures/${avoir.facture_origine_id}/impression`}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-xl border border-purple-200 bg-white px-3 py-2 text-xs font-semibold text-purple-700 hover:bg-purple-100"
                            >
                              PDF facture
                            </a>
                          )}

                          {avoir.facture_avoir_id && (
                            <a
                              href={`/chef/factures/${avoir.facture_avoir_id}/impression`}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-xl bg-purple-600 px-3 py-2 text-xs font-semibold text-white hover:bg-purple-700"
                            >
                              PDF avoir
                            </a>
                          )}
                        </div>
                      </div>

                      {avoir.motif && (
                        <div className="mt-4 rounded-xl bg-white p-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-purple-500">
                            Motif
                          </p>
                          <p className="mt-1 whitespace-pre-line text-sm text-slate-700">
                            {avoir.motif}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end border-t border-slate-200 p-5">
              <button
                type="button"
                onClick={chargerAvoirs}
                disabled={chargement}
                className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {chargement ? "Actualisation..." : "Actualiser"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}