"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Props = {
  factureId: string;
  numero?: string | null;
  defaultEmail?: string | null;
  resteAPayer?: number | null;
  dateEcheance?: string | null;
  onRelanceEnvoyee?: () => void | Promise<void>;
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

function messageParDefaut(
  numero?: string | null,
  resteAPayer?: number | null,
  dateEcheance?: string | null
) {
  return `Bonjour,

Sauf erreur de notre part, la facture ${
    numero || ""
  } arrivée à échéance le ${formatDate(
    dateEcheance
  )} présente encore un solde restant dû de ${formatMontant(resteAPayer)}.

Vous trouverez la facture en pièce jointe de cet email.

Nous vous remercions de bien vouloir procéder au règlement dès que possible.

Cordialement.`;
}

export default function BoutonRelancerFacture({
  factureId,
  numero,
  defaultEmail,
  resteAPayer,
  dateEcheance,
  onRelanceEnvoyee,
}: Props) {
  const [modalOuverte, setModalOuverte] = useState(false);
  const [chargement, setChargement] = useState(false);

  const [email, setEmail] = useState(defaultEmail || "");
  const [message, setMessage] = useState(
    messageParDefaut(numero, resteAPayer, dateEcheance)
  );

  const [messageErreur, setMessageErreur] = useState("");
  const [messageSucces, setMessageSucces] = useState("");

  function ouvrirModal() {
    setEmail(defaultEmail || "");
    setMessage(messageParDefaut(numero, resteAPayer, dateEcheance));
    setMessageErreur("");
    setMessageSucces("");
    setModalOuverte(true);
  }

  function fermerModal() {
    if (chargement) return;
    setModalOuverte(false);
  }

  async function envoyerRelance() {
    try {
      setChargement(true);
      setMessageErreur("");
      setMessageSucces("");

      const emailNettoye = email.trim().toLowerCase();

      if (!emailNettoye) {
        setMessageErreur("Veuillez renseigner l’adresse email du client.");
        return;
      }

      if (!factureId) {
        setMessageErreur("Identifiant de facture manquant.");
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setMessageErreur("Session expirée. Veuillez vous reconnecter.");
        return;
      }

      const response = await fetch("/api/factures/relancer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          factureId,
          email: emailNettoye,
          message,
        }),
      });

      const resultat = await response.json().catch(() => null);

      if (!response.ok || !resultat?.success) {
        throw new Error(resultat?.error || "Impossible d’envoyer la relance.");
      }

      setMessageSucces(
        resultat.message || "Relance envoyée avec succès."
      );

      if (onRelanceEnvoyee) {
        await onRelanceEnvoyee();
      }

      setTimeout(() => {
        setModalOuverte(false);
      }, 900);
    } catch (error: any) {
      console.error("Erreur envoi relance facture :", error);
      setMessageErreur(error?.message || "Impossible d’envoyer la relance.");
    } finally {
      setChargement(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={ouvrirModal}
        className="rounded-xl border border-orange-200 px-3 py-2 text-xs font-medium text-orange-700 hover:bg-orange-50"
      >
        Relancer
      </button>

      {modalOuverte && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/40 px-4 py-6">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 p-5">
              <div>
                <h2 className="text-xl font-bold text-slate-950">
                  Relancer la facture
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

              <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
                <p className="text-sm font-semibold text-orange-900">
                  Récapitulatif
                </p>

                <div className="mt-2 space-y-1 text-sm text-orange-800">
                  <p>
                    Facture :{" "}
                    <span className="font-semibold">
                      {numero || "sans numéro"}
                    </span>
                  </p>

                  <p>
                    Échéance :{" "}
                    <span className="font-semibold">
                      {formatDate(dateEcheance)}
                    </span>
                  </p>

                  <p>
                    Reste à payer :{" "}
                    <span className="font-semibold">
                      {formatMontant(resteAPayer)}
                    </span>
                  </p>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Email destinataire
                </label>

                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="client@email.fr"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Message de relance
                </label>

                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  rows={9}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
                />

                <p className="mt-2 text-xs text-slate-500">
                  La relance sera envoyée avec la facture PDF en pièce jointe et
                  enregistrée dans l’historique des emails.
                </p>
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
                onClick={envoyerRelance}
                disabled={chargement}
                className="rounded-2xl bg-orange-600 px-5 py-3 text-sm font-semibold text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {chargement ? "Envoi..." : "Envoyer la relance"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}