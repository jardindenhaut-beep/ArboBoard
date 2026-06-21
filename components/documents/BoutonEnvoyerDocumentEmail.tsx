"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type TypeDocument = "devis" | "facture" | "avoir";

type Props = {
  typeDocument: TypeDocument;
  documentId: string;
  numero?: string | null;
  defaultEmail?: string | null;
  defaultMessage?: string | null;
  onEnvoye?: () => void | Promise<void>;
};

function libelleDocument(typeDocument: TypeDocument) {
  if (typeDocument === "devis") return "devis";
  if (typeDocument === "avoir") return "avoir";
  return "facture";
}

function titreDocument(typeDocument: TypeDocument) {
  if (typeDocument === "devis") return "Devis";
  if (typeDocument === "avoir") return "Avoir";
  return "Facture";
}

function texteBouton(typeDocument: TypeDocument) {
  if (typeDocument === "devis") return "Envoyer devis";
  if (typeDocument === "avoir") return "Envoyer avoir";
  return "Envoyer facture";
}

function messageParDefaut(typeDocument: TypeDocument, numero?: string | null) {
  if (typeDocument === "devis") {
    return `Bonjour,

Veuillez trouver ci-joint votre devis ${numero || ""} au format PDF.

Cordialement.`;
  }

  if (typeDocument === "avoir") {
    return `Bonjour,

Veuillez trouver ci-joint votre avoir ${numero || ""} au format PDF.

Cet avoir vient rectifier ou annuler une facture précédemment émise.

Cordialement.`;
  }

  return `Bonjour,

Veuillez trouver ci-joint votre facture ${numero || ""} au format PDF.

Cordialement.`;
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
  const [chargement, setChargement] = useState(false);

  const [email, setEmail] = useState(defaultEmail || "");
  const [message, setMessage] = useState(
    defaultMessage || messageParDefaut(typeDocument, numero)
  );

  const [messageErreur, setMessageErreur] = useState("");
  const [messageSucces, setMessageSucces] = useState("");

  function ouvrirModal() {
    setEmail(defaultEmail || "");
    setMessage(defaultMessage || messageParDefaut(typeDocument, numero));
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

      const emailNettoye = email.trim().toLowerCase();

      if (!emailNettoye) {
        setMessageErreur("Veuillez renseigner une adresse email.");
        return;
      }

      if (!documentId) {
        setMessageErreur("Identifiant du document manquant.");
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
          email: emailNettoye,
          message,
        }),
      });

      const resultat = await response.json().catch(() => null);

      if (!response.ok || !resultat?.success) {
        throw new Error(
          resultat?.error ||
            `Impossible d’envoyer le ${libelleDocument(typeDocument)}.`
        );
      }

      setMessageSucces(
        resultat.message ||
          `${titreDocument(typeDocument)} envoyé par email avec succès.`
      );

      if (onEnvoye) {
        await onEnvoye();
      }

      setTimeout(() => {
        setModalOuverte(false);
      }, 900);
    } catch (error: any) {
      console.error("Erreur envoi email document :", error);
      setMessageErreur(
        error?.message ||
          `Impossible d’envoyer le ${libelleDocument(typeDocument)}.`
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
        {texteBouton(typeDocument)}
      </button>

      {modalOuverte && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/40 px-4 py-6">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 p-5">
              <div>
                <h2 className="text-xl font-bold text-slate-950">
                  Envoyer {libelleDocument(typeDocument)} par email
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {numero
                    ? `${titreDocument(typeDocument)} ${numero}`
                    : titreDocument(typeDocument)}
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

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Email destinataire
                </label>

                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="client@email.fr"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Message
                </label>

                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  rows={8}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                />

                <p className="mt-2 text-xs text-slate-500">
                  Le document sera envoyé avec son PDF en pièce jointe.
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
                onClick={envoyerEmail}
                disabled={chargement}
                className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {chargement
                  ? "Envoi..."
                  : `Envoyer ${libelleDocument(typeDocument)}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}