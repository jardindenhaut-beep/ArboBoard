"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type TypeDocument = "devis" | "facture";

type Props = {
  typeDocument: TypeDocument;
  documentId: string;
  numero?: string | null;
  defaultEmail?: string | null;
  defaultMessage?: string;
  onEnvoye?: () => void | Promise<void>;
};

function emailValide(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function BoutonEnvoyerDocumentEmail({
  typeDocument,
  documentId,
  numero,
  defaultEmail,
  defaultMessage,
  onEnvoye,
}: Props) {
  const [modalOuverte, setModalOuverte] = useState(false);
  const [emailDestinataire, setEmailDestinataire] = useState(
    defaultEmail || ""
  );
  const [message, setMessage] = useState(
    defaultMessage ||
      (typeDocument === "devis"
        ? "Bonjour,\n\nVeuillez trouver ci-dessous votre devis.\n\nCordialement."
        : "Bonjour,\n\nVeuillez trouver ci-dessous votre facture.\n\nCordialement.")
  );

  const [chargement, setChargement] = useState(false);
  const [messageErreur, setMessageErreur] = useState("");
  const [messageSucces, setMessageSucces] = useState("");

  const libelleDocument = typeDocument === "devis" ? "devis" : "facture";

  function ouvrirModal() {
    setEmailDestinataire(defaultEmail || "");
    setMessageErreur("");
    setMessageSucces("");
    setModalOuverte(true);
  }

  function fermerModal() {
    if (chargement) return;
    setModalOuverte(false);
  }

  async function envoyerEmail() {
    try {
      setChargement(true);
      setMessageErreur("");
      setMessageSucces("");

      const emailNettoye = emailDestinataire.trim();

      if (!emailNettoye || !emailValide(emailNettoye)) {
        setMessageErreur("Renseignez une adresse email valide.");
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setMessageErreur("Session expirée. Veuillez vous reconnecter.");
        return;
      }

      const response = await fetch("/api/documents/envoyer-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          typeDocument,
          documentId,
          emailDestinataire: emailNettoye,
          message: message.trim(),
        }),
      });

      const resultat = await response.json().catch(() => null);

      if (!response.ok || !resultat?.success) {
        throw new Error(
          resultat?.error || "Impossible d’envoyer l’email pour le moment."
        );
      }

      setMessageSucces(`Email envoyé avec succès à ${emailNettoye}.`);

      if (onEnvoye) {
        await onEnvoye();
      }

      setTimeout(() => {
        setModalOuverte(false);
      }, 900);
    } catch (error: any) {
      console.error("Erreur envoi email document :", error);
      setMessageErreur(
        error?.message || "Impossible d’envoyer l’email pour le moment."
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
        className="rounded-xl border border-blue-200 px-3 py-2 text-xs font-medium text-blue-700 hover:bg-blue-50"
      >
        Email
      </button>

      {modalOuverte && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/40 px-4 py-6">
          <div className="w-full max-w-xl rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 p-5">
              <div>
                <h2 className="text-xl font-bold text-slate-950">
                  Envoyer le {libelleDocument} par email
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {numero
                    ? `${libelleDocument.toUpperCase()} ${numero}`
                    : `Envoyer ce ${libelleDocument}`}
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

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Email du client
                </label>
                <input
                  value={emailDestinataire}
                  onChange={(event) => setEmailDestinataire(event.target.value)}
                  placeholder="client@email.fr"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Si le client n’a pas d’email enregistré, vous pouvez le saisir
                  manuellement ici.
                </p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Message accompagnant l’email
                </label>
                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  rows={6}
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
                onClick={envoyerEmail}
                disabled={chargement}
                className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {chargement ? "Envoi en cours..." : "Envoyer l’email"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}