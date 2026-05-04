"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type PaiementFacture = {
  id: string;
  entreprise_id: string | null;
  facture_id: string | null;
  montant: number | null;
  mode_paiement: string | null;
  reference_paiement: string | null;
  note: string | null;
  date_paiement: string | null;
  enregistre_par: string | null;
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

function formatDate(date: string | null | undefined) {
  if (!date) return "—";

  try {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(`${date}T00:00:00`));
  } catch {
    return "—";
  }
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

function libelleMode(mode: string | null | undefined) {
  if (mode === "virement") return "Virement";
  if (mode === "cheque") return "Chèque";
  if (mode === "especes") return "Espèces";
  if (mode === "carte") return "Carte bancaire";
  if (mode === "prelevement") return "Prélèvement";
  if (mode === "autre") return "Autre";
  return "Non renseigné";
}

export default function HistoriquePaiementsFacture({
  factureId,
  numero,
}: Props) {
  const [modalOuverte, setModalOuverte] = useState(false);
  const [chargement, setChargement] = useState(false);
  const [paiements, setPaiements] = useState<PaiementFacture[]>([]);
  const [messageErreur, setMessageErreur] = useState("");

  async function ouvrirHistorique() {
    setModalOuverte(true);
    await chargerPaiements();
  }

  function fermerHistorique() {
    setModalOuverte(false);
  }

  async function chargerPaiements() {
    try {
      setChargement(true);
      setMessageErreur("");

      const { data, error } = await supabase
        .from("factures_paiements")
        .select("*")
        .eq("facture_id", factureId)
        .order("date_paiement", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;

      setPaiements((data || []) as PaiementFacture[]);
    } catch (error: any) {
      console.error("Erreur chargement paiements facture :", error);
      setMessageErreur(
        error?.message || "Impossible de charger l’historique des paiements."
      );
    } finally {
      setChargement(false);
    }
  }

  const totalEncaisse = paiements.reduce(
    (total, paiement) => total + Number(paiement.montant || 0),
    0
  );

  return (
    <>
      <button
        type="button"
        onClick={ouvrirHistorique}
        className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
      >
        Paiements
      </button>

      {modalOuverte && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/40 px-4 py-6">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 p-5">
              <div>
                <h2 className="text-xl font-bold text-slate-950">
                  Historique des paiements
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {numero ? `Facture ${numero}` : "Facture"}
                </p>
                <p className="mt-2 text-sm font-semibold text-emerald-700">
                  Total encaissé : {formatMontant(totalEncaisse)}
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
                    Chargement des paiements...
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Récupération de l’historique.
                  </p>
                </div>
              ) : paiements.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-2xl">
                    💶
                  </div>
                  <p className="font-semibold text-slate-900">
                    Aucun paiement enregistré
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Les paiements apparaîtront ici après un encaissement.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {paiements.map((paiement) => (
                    <div
                      key={paiement.id}
                      className="rounded-2xl border border-slate-200 bg-white p-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-lg font-bold text-slate-950">
                            {formatMontant(paiement.montant)}
                          </p>

                          <p className="mt-1 text-sm text-slate-600">
                            Mode : {libelleMode(paiement.mode_paiement)}
                          </p>

                          <p className="mt-1 text-sm text-slate-600">
                            Date paiement : {formatDate(paiement.date_paiement)}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            Enregistré le :{" "}
                            {formatDateHeure(paiement.created_at)}
                          </p>
                        </div>

                        <span className="inline-flex w-fit rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                          Encaissé
                        </span>
                      </div>

                      {paiement.reference_paiement && (
                        <div className="mt-3 rounded-xl bg-slate-50 p-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Référence
                          </p>
                          <p className="mt-1 text-sm text-slate-700">
                            {paiement.reference_paiement}
                          </p>
                        </div>
                      )}

                      {paiement.note && (
                        <div className="mt-3 rounded-xl bg-slate-50 p-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Note
                          </p>
                          <p className="mt-1 whitespace-pre-line text-sm text-slate-700">
                            {paiement.note}
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
                onClick={chargerPaiements}
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