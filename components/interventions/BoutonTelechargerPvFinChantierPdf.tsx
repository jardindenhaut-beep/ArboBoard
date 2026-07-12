"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Props = {
  ficheId: string;
  disabled?: boolean;
};

export default function BoutonTelechargerPvFinChantierPdf({
  ficheId,
  disabled = false,
}: Props) {
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState("");

  async function telechargerPdf() {
    if (!ficheId) return;

    try {
      setChargement(true);
      setErreur("");

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setErreur("Session expirée. Reconnectez-vous.");
        return;
      }

      const response = await fetch("/api/interventions/pv-fin-chantier/pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          ficheId,
        }),
      });

      if (!response.ok) {
        let message = "Impossible de générer le PDF.";

        try {
          const json = await response.json();
          message = json?.error || message;
        } catch {
          const texte = await response.text();
          message = texte || message;
        }

        throw new Error(message);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const disposition = response.headers.get("content-disposition") || "";
      const match = disposition.match(/filename="(.+)"/);
      const nomFichier = match?.[1] || `pv-fin-chantier-${ficheId}.pdf`;

      const lien = document.createElement("a");
      lien.href = url;
      lien.download = nomFichier;
      document.body.appendChild(lien);
      lien.click();
      lien.remove();

      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error("Erreur téléchargement PDF PV :", error);
      setErreur(error?.message || "Impossible de télécharger le PDF.");
    } finally {
      setChargement(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={telechargerPdf}
        disabled={disabled || chargement}
        className="rounded-xl border border-emerald-200 px-4 py-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {chargement ? "Génération du PDF..." : "Télécharger le PV PDF"}
      </button>

      {erreur && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {erreur}
        </p>
      )}
    </div>
  );
}