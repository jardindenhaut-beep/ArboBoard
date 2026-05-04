"use client";

import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Props = {
  factureId: string;
  numero?: string | null;
  statut?: string | null;
  totalTtc?: number | null;
  montantPaye?: number | null;
  resteAPayer?: number | null;
  onEncaisse?: () => void | Promise<void>;
};

function dateDuJour() {
  return new Date().toISOString().slice(0, 10);
}

function nombreDepuisTexte(valeur: string | number | null | undefined) {
  if (typeof valeur === "number") {
    return Number.isFinite(valeur) ? valeur : 0;
  }

  const nombre = Number.parseFloat(
    String(valeur || "")
      .replace(",", ".")
      .replace(/\s/g, "")
      .trim()
  );

  return Number.isFinite(nombre) ? nombre : 0;
}

function arrondir2(nombre: number) {
  return Math.round((nombre + Number.EPSILON) * 100) / 100;
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
  statut,
  totalTtc,
  montantPaye,
  resteAPayer,
  onEncaisse,
}: Props) {
  const [modalOuverte, setModalOuverte] = useState(false);
  const [chargement, setChargement] = useState(false);

  const [montant, setMontant] = useState("");
  const [modePaiement, setModePaiement] = useState("virement");
  const [referencePaiement, setReferencePaiement] = useState("");
  const [datePaiement, setDatePaiement] = useState(dateDuJour());
  const [note, setNote] = useState("");

  const [messageErreur, setMessageErreur] = useState("");
  const [messageSucces, setMessageSucces] = useState("");

  const resteCalcule = useMemo(() => {
    if (resteAPayer !== null && resteAPayer !== undefined) {
      return arrondir2(Number(resteAPayer || 0));
    }

    return arrondir2(
      Math.max(Number(totalTtc || 0) - Number(montantPaye || 0), 0)
    );
  }, [resteAPayer, totalTtc, montantPaye]);

  const factureBloquee =
    statut === "payee" || statut === "annulee" || statut === "archive";

  if (factureBloquee || resteCalcule <= 0) {
    return null;
  }

  function ouvrirModal() {
    setMontant(String(resteCalcule.toFixed(2)).replace(".", ","));
    setModePaiement("virement");
    setReferencePaiement("");
    setDatePaiement(dateDuJour());
    setNote("");
    setMessageErreur("");
    setMessageSucces("");
    setModalOuverte(true);
  }

  function fermerModal() {
    if (chargement) return;
    setModalOuverte(false);
  }

  async function encaisser() {
    try {
      setChargement(true);
      setMessageErreur("");
      setMessageSucces("");

      const montantNumber = arrondir2(nombreDepuisTexte(montant));

      if (montantNumber <= 0) {
        setMessageErreur("Le montant doit être supérieur à 0.");
        return;
      }

      if (montantNumber > resteCalcule + 0.01) {
        setMessageErreur(
          `Le paiement dépasse le reste à payer : ${formatMontant(resteCalcule)}.`
        );
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
          montant: montantNumber,
          modePaiement,
          referencePaiement,
          datePaiement,
          note,
        }),
      });

      const resultat = await response.json().catch(() => null);

      if (!response.ok || !resultat?.success) {
        throw new Error(
          resultat?.error || "Impossible d’enregistrer le paiement."
        );
      }

      setMessageSucces(resultat.message || "Paiement enregistré avec succès.");

      if (onEncaisse) {
        await onEncaisse();
      }

      setTimeout(() => {
        setModalOuverte(false);
      }, 900);
    } catch (error: any) {
      console.error("Erreur encaissement facture :", error);
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
          <div className="w-full max-w-xl rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 p-5">
              <div>
                <h2 className="text-xl font-bold text-slate-950">
                  Encaisser une facture
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {numero ? `Facture ${numero}` : "Facture"}
                </p>
                <p className="mt-1 text-sm font-semibold text-emerald-700">
                  Reste à payer : {formatMontant(resteCalcule)}
                </p>
              </div>

              <button
                type="button"
                onClick={fermerModal}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
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

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Montant encaissé
                  </label>
                  <input
                    value={montant}
                    onChange={(event) => setMontant(event.target.value)}
                    placeholder="0,00"
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Date paiement
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
                  <option value="carte">Carte bancaire</option>
                  <option value="prelevement">Prélèvement</option>
                  <option value="autre">Autre</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Référence paiement
                </label>
                <input
                  value={referencePaiement}
                  onChange={(event) =>
                    setReferencePaiement(event.target.value)
                  }
                  placeholder="Numéro chèque, référence virement..."
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
                  rows={3}
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
                onClick={encaisser}
                disabled={chargement}
                className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {chargement ? "Encaissement..." : "Enregistrer le paiement"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}