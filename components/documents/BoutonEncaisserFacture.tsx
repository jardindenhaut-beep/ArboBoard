"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Props = {
  factureId: string;
  numero?: string | null;
  totalTtc?: number | null;
  montantPaye?: number | null;
  resteAPayer?: number | null;
  onPaiementEnregistre?: () => void | Promise<void>;
};

function dateAujourdhui() {
  return new Date().toISOString().slice(0, 10);
}

function formatMontant(montant: number | null | undefined) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(Number(montant || 0));
}

export default function BoutonEncaisserFacture({
  factureId,
  numero,
  totalTtc,
  montantPaye,
  resteAPayer,
  onPaiementEnregistre,
}: Props) {
  const [modalOuverte, setModalOuverte] = useState(false);
  const [chargement, setChargement] = useState(false);

  const [montant, setMontant] = useState(String(Number(resteAPayer || 0)));
  const [modePaiement, setModePaiement] = useState("virement");
  const [referencePaiement, setReferencePaiement] = useState("");
  const [datePaiement, setDatePaiement] = useState(dateAujourdhui());
  const [note, setNote] = useState("");

  const [messageErreur, setMessageErreur] = useState("");
  const [messageSucces, setMessageSucces] = useState("");

  function ouvrirModal() {
    setMontant(String(Number(resteAPayer || 0)));
    setModePaiement("virement");
    setReferencePaiement("");
    setDatePaiement(dateAujourdhui());
    setNote("");
    setMessageErreur("");
    setMessageSucces("");
    setModalOuverte(true);
  }

  function fermerModal() {
    if (chargement) return;
    setModalOuverte(false);
  }

  async function enregistrerPaiement() {
    try {
      setChargement(true);
      setMessageErreur("");
      setMessageSucces("");

      const montantNombre = Number(String(montant).replace(",", "."));

      if (!factureId) {
        setMessageErreur("Identifiant de facture manquant.");
        return;
      }

      if (!montantNombre || montantNombre <= 0) {
        setMessageErreur("Veuillez renseigner un montant valide.");
        return;
      }

      if (resteAPayer && montantNombre > Number(resteAPayer)) {
        setMessageErreur(
          `Le montant encaissé ne peut pas dépasser le reste à payer : ${formatMontant(
            resteAPayer
          )}.`
        );
        return;
      }

      if (!datePaiement) {
        setMessageErreur("Veuillez renseigner une date de paiement.");
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setMessageErreur("Session expirée. Veuillez vous reconnecter.");
        return;
      }

      const response = await fetch("/api/factures/enregistrer-paiement", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          factureId,
          facture_id: factureId,
          montant: montantNombre,
          modePaiement,
          mode_paiement: modePaiement,
          referencePaiement: referencePaiement.trim() || null,
          reference_paiement: referencePaiement.trim() || null,
          datePaiement,
          date_paiement: datePaiement,
          note: note.trim() || null,
        }),
      });

      const resultat = await response.json().catch(() => null);

      if (!response.ok || !resultat?.success) {
        throw new Error(
          resultat?.error || "Impossible d’enregistrer le paiement."
        );
      }

      setMessageSucces(
        resultat.message || "Paiement enregistré avec succès."
      );

      if (onPaiementEnregistre) {
        await onPaiementEnregistre();
      }

      setTimeout(() => {
        setModalOuverte(false);
      }, 900);
    } catch (error: any) {
      console.error("Erreur enregistrement paiement :", error);
      setMessageErreur(
        error?.message || "Impossible d’enregistrer le paiement."
      );
    } finally {
      setChargement(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={ouvrirModal}
        className="rounded-xl border border-emerald-200 px-3 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
      >
        Encaisser
      </button>

      {modalOuverte && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/40 px-4 py-6">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 p-5">
              <div>
                <h2 className="text-xl font-bold text-slate-950">
                  Enregistrer un paiement
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {numero ? `Facture ${numero}` : "Facture sans numéro"}
                </p>
              </div>

              <button
                type="button"
                onClick={fermerModal}
                disabled={chargement}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Fermer
              </button>
            </div>

            <div className="space-y-4 p-5">
              {messageErreur && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {messageErreur}
                </div>
              )}

              {messageSucces && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {messageSucces}
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">Total TTC</p>
                  <p className="mt-1 font-black text-slate-950">
                    {formatMontant(totalTtc)}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">Déjà payé</p>
                  <p className="mt-1 font-black text-slate-950">
                    {formatMontant(montantPaye)}
                  </p>
                </div>

                <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                  <p className="text-xs text-red-600">Reste à payer</p>
                  <p className="mt-1 font-black text-red-700">
                    {formatMontant(resteAPayer)}
                  </p>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Montant encaissé
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={montant}
                  onChange={(event) => setMontant(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Mode de paiement
                  </label>

                  <select
                    value={modePaiement}
                    onChange={(event) => setModePaiement(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  >
                    <option value="virement">Virement</option>
                    <option value="cheque">Chèque</option>
                    <option value="especes">Espèces</option>
                    <option value="carte_bancaire">Carte bancaire</option>
                    <option value="prelevement">Prélèvement</option>
                    <option value="autre">Autre</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Date du paiement
                  </label>

                  <input
                    type="date"
                    value={datePaiement}
                    onChange={(event) => setDatePaiement(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Référence du paiement
                </label>

                <input
                  value={referencePaiement}
                  onChange={(event) =>
                    setReferencePaiement(event.target.value)
                  }
                  placeholder="Ex : numéro de chèque, virement, référence bancaire..."
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Note interne
                </label>

                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  rows={4}
                  placeholder="Note facultative..."
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                />
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 p-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={fermerModal}
                disabled={chargement}
                className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Annuler
              </button>

              <button
                type="button"
                onClick={enregistrerPaiement}
                disabled={chargement}
                className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {chargement ? "Enregistrement..." : "Enregistrer le paiement"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}