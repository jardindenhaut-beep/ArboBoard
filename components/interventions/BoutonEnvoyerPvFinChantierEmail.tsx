"use client";

import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Props = {
  ficheId: string;
  clientEmail?: string | null;
  clientNom?: string | null;
  disabled?: boolean;
};

export default function BoutonEnvoyerPvFinChantierEmail({
  ficheId,
  clientEmail,
  clientNom,
  disabled,
}: Props) {
  const [emailDestinataire, setEmailDestinataire] = useState(clientEmail || "");
  const [message, setMessage] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");
  const [succes, setSucces] = useState("");
  const [ouvert, setOuvert] = useState(false);

  const emailValide = useMemo(() => {
    const email = emailDestinataire.trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }, [emailDestinataire]);

  async function envoyerEmail() {
    if (!ficheId || disabled || envoi) return;

    setErreur("");
    setSucces("");

    if (!emailValide) {
      setErreur("Renseigne une adresse email valide.");
      return;
    }

    try {
      setEnvoi(true);

      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError || !sessionData.session?.access_token) {
        throw new Error("Session utilisateur introuvable.");
      }

      const response = await fetch(
        "/api/interventions/pv-fin-chantier/envoyer-email",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionData.session.access_token}`,
          },
          body: JSON.stringify({
            ficheId,
            emailDestinataire: emailDestinataire.trim(),
            message: message.trim(),
          }),
        }
      );

      const resultat = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          resultat?.error || "Impossible d’envoyer le PV au client."
        );
      }

      setSucces("PV envoyé au client.");
      setOuvert(false);
    } catch (error: any) {
      console.error("Erreur envoi PV email :", error);
      setErreur(error?.message || "Impossible d’envoyer le PV au client.");
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold text-slate-950">
            Envoyer le PV au client
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Le PDF du PV sera envoyé en pièce jointe.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setOuvert((ancien) => !ancien)}
          disabled={disabled || envoi}
          className="rounded-xl border border-emerald-200 px-4 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {ouvert ? "Fermer" : "Préparer l’envoi"}
        </button>
      </div>

      {ouvert && (
        <div className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
              Email destinataire
            </label>
            <input
              value={emailDestinataire}
              onChange={(event) => setEmailDestinataire(event.target.value)}
              placeholder="client@email.fr"
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
              Message email
            </label>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={5}
              placeholder={`Bonjour${
                clientNom ? ` ${clientNom}` : ""
              },\n\nVeuillez trouver ci-joint le PV de fin de chantier.\n\nCordialement.`}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            />
          </div>

          <button
            type="button"
            onClick={envoyerEmail}
            disabled={disabled || envoi || !emailValide}
            className="w-full rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {envoi ? "Envoi en cours..." : "Envoyer le PV au client"}
          </button>
        </div>
      )}

      {erreur && (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {erreur}
        </div>
      )}

      {succes && (
        <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
          {succes}
        </div>
      )}
    </div>
  );
}