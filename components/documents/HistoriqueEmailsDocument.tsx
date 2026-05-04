"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type TypeDocument = "devis" | "facture";

type EmailEnvoye = {
  id: string;
  entreprise_id: string | null;
  type_document: string | null;
  document_id: string | null;
  email_destinataire: string | null;
  sujet: string | null;
  message: string | null;
  statut: string | null;
  resend_id: string | null;
  erreur: string | null;
  envoye_par: string | null;
  envoye_at: string | null;
  created_at: string | null;
};

type Props = {
  typeDocument: TypeDocument;
  documentId: string;
  numero?: string | null;
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
    return "—";
  }
}

function libelleStatut(statut: string | null | undefined) {
  if (statut === "envoye") return "Envoyé";
  if (statut === "erreur") return "Erreur";
  return statut || "—";
}

function badgeStatut(statut: string | null | undefined) {
  if (statut === "envoye") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (statut === "erreur") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-600";
}

export default function HistoriqueEmailsDocument({
  typeDocument,
  documentId,
  numero,
}: Props) {
  const [modalOuverte, setModalOuverte] = useState(false);
  const [chargement, setChargement] = useState(false);
  const [emails, setEmails] = useState<EmailEnvoye[]>([]);
  const [messageErreur, setMessageErreur] = useState("");

  const libelleDocument = typeDocument === "devis" ? "devis" : "facture";

  async function ouvrirHistorique() {
    setModalOuverte(true);
    await chargerHistorique();
  }

  function fermerHistorique() {
    setModalOuverte(false);
  }

  async function chargerHistorique() {
    try {
      setChargement(true);
      setMessageErreur("");

      const { data, error } = await supabase
        .from("documents_emails_envoyes")
        .select("*")
        .eq("type_document", typeDocument)
        .eq("document_id", documentId)
        .order("envoye_at", { ascending: false });

      if (error) throw error;

      setEmails((data || []) as EmailEnvoye[]);
    } catch (error: any) {
      console.error("Erreur chargement historique emails :", error);
      setMessageErreur(
        error?.message || "Impossible de charger l’historique des emails."
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
        className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
      >
        Historique
      </button>

      {modalOuverte && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/40 px-4 py-6">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 p-5">
              <div>
                <h2 className="text-xl font-bold text-slate-950">
                  Historique des emails
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {numero
                    ? `${libelleDocument.toUpperCase()} ${numero}`
                    : `Historique de ce ${libelleDocument}`}
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
                    Récupération des emails envoyés.
                  </p>
                </div>
              ) : emails.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-2xl">
                    📩
                  </div>
                  <p className="font-semibold text-slate-900">
                    Aucun email envoyé
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    L’historique apparaîtra ici après un premier envoi.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {emails.map((email) => (
                    <div
                      key={email.id}
                      className="rounded-2xl border border-slate-200 bg-white p-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="font-semibold text-slate-950">
                            {email.email_destinataire || "Email non renseigné"}
                          </p>

                          <p className="mt-1 text-sm text-slate-600">
                            {email.sujet || "Sujet non renseigné"}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            Envoyé le : {formatDateHeure(email.envoye_at)}
                          </p>
                        </div>

                        <span
                          className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold ${badgeStatut(
                            email.statut
                          )}`}
                        >
                          {libelleStatut(email.statut)}
                        </span>
                      </div>

                      {email.message && (
                        <div className="mt-3 rounded-xl bg-slate-50 p-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Message
                          </p>
                          <p className="mt-1 whitespace-pre-line text-sm text-slate-700">
                            {email.message}
                          </p>
                        </div>
                      )}

                      {email.resend_id && (
                        <p className="mt-3 text-xs text-slate-500">
                          ID Resend : {email.resend_id}
                        </p>
                      )}

                      {email.erreur && (
                        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                          {email.erreur}
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
                onClick={chargerHistorique}
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