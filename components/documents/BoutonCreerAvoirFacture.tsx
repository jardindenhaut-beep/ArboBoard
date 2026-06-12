"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Props = {
  factureId: string;
  numero?: string | null;
  statut?: string | null;
  estAvoir?: boolean | null;
  avoirAnnuleFacture?: boolean | null;
  onAvoirCree?: () => void | Promise<void>;
};

export default function BoutonCreerAvoirFacture({
  factureId,
  numero,
  statut,
  estAvoir,
  avoirAnnuleFacture,
  onAvoirCree,
}: Props) {
  const [modalOuverte, setModalOuverte] = useState(false);
  const [chargement, setChargement] = useState(false);
  const [motif, setMotif] = useState(
    "Avoir établi suite à une erreur ou une annulation de facture."
  );
  const [messageErreur, setMessageErreur] = useState("");
  const [messageSucces, setMessageSucces] = useState("");

  const factureDejaAnnulee = statut === "annulee" || !!avoirAnnuleFacture;
  const factureArchivee = statut === "archive";
  const factureBrouillon = statut === "brouillon";

  const boutonDesactive =
    !!estAvoir || factureDejaAnnulee || factureArchivee || factureBrouillon;

  function ouvrirModal() {
    setMessageErreur("");
    setMessageSucces("");
    setModalOuverte(true);
  }

  function fermerModal() {
    if (chargement) return;
    setModalOuverte(false);
  }

  async function creerAvoir() {
    try {
      setChargement(true);
      setMessageErreur("");
      setMessageSucces("");

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setMessageErreur("Session expirée. Veuillez vous reconnecter.");
        return;
      }

      const response = await fetch("/api/factures/creer-avoir", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          factureId,
          motif,
        }),
      });

      const resultat = await response.json().catch(() => null);

      if (!response.ok || !resultat?.success) {
        throw new Error(resultat?.error || "Impossible de créer l’avoir.");
      }

      setMessageSucces(resultat.message || "Avoir créé avec succès.");

      if (onAvoirCree) {
        await onAvoirCree();
      }

      setTimeout(() => {
        setModalOuverte(false);
      }, 900);
    } catch (error: any) {
      console.error("Erreur création avoir :", error);
      setMessageErreur(error?.message || "Impossible de créer l’avoir.");
    } finally {
      setChargement(false);
    }
  }

  if (estAvoir) {
    return (
      <span className="rounded-xl border border-purple-200 bg-purple-50 px-3 py-2 text-xs font-medium text-purple-700">
        Avoir
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={ouvrirModal}
        disabled={boutonDesactive}
        title={
          factureBrouillon
            ? "Un brouillon doit être modifié, pas avoirisé."
            : factureDejaAnnulee
            ? "Cette facture possède déjà un avoir ou est annulée."
            : factureArchivee
            ? "Cette facture est archivée."
            : "Créer un avoir pour cette facture"
        }
        className="rounded-xl border border-purple-200 px-3 py-2 text-xs font-medium text-purple-700 hover:bg-purple-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Créer avoir
      </button>

      {modalOuverte && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/40 px-4 py-6">
          <div className="w-full max-w-xl rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 p-5">
              <div>
                <h2 className="text-xl font-bold text-slate-950">
                  Créer un avoir
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {numero
                    ? `Facture concernée : ${numero}`
                    : "Facture concernée"}
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
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Un avoir va être créé automatiquement avec des montants négatifs
                et la facture d’origine sera passée en annulée. Cette action
                garde l’historique comptable.
              </div>

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

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Motif de l’avoir
                </label>
                <textarea
                  value={motif}
                  onChange={(event) => setMotif(event.target.value)}
                  rows={5}
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
                onClick={creerAvoir}
                disabled={chargement || motif.trim().length === 0}
                className="rounded-2xl bg-purple-600 px-5 py-3 text-sm font-semibold text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {chargement ? "Création..." : "Créer l’avoir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}