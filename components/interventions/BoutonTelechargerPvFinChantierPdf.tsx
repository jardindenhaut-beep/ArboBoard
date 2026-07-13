"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Props = {
  ficheId: string;
  disabled?: boolean;
  className?: string;
};

function extraireNomFichier(contentDisposition: string | null, ficheId: string) {
  const nomParDefaut = `pv-fin-chantier-${ficheId}.pdf`;

  if (!contentDisposition) {
    return nomParDefaut;
  }

  const nomUtf8 = contentDisposition.match(
    /filename\*=UTF-8''([^;]+)/i
  )?.[1];

  if (nomUtf8) {
    try {
      return decodeURIComponent(nomUtf8.replace(/["']/g, ""));
    } catch {
      return nomUtf8.replace(/["']/g, "");
    }
  }

  const nomSimple =
    contentDisposition.match(/filename="([^"]+)"/i)?.[1] ||
    contentDisposition.match(/filename=([^;]+)/i)?.[1];

  return nomSimple?.trim().replace(/^["']|["']$/g, "") || nomParDefaut;
}

async function lireErreurResponse(response: Response) {
  const typeContenu = response.headers.get("content-type") || "";

  if (typeContenu.includes("application/json")) {
    try {
      const resultat = await response.json();

      return (
        resultat?.erreur ||
        resultat?.error ||
        resultat?.message ||
        "Impossible de générer le PDF."
      );
    } catch {
      return "Impossible de générer le PDF.";
    }
  }

  try {
    const texte = await response.text();
    return texte.trim() || "Impossible de générer le PDF.";
  } catch {
    return "Impossible de générer le PDF.";
  }
}

export default function BoutonTelechargerPvFinChantierPdf({
  ficheId,
  disabled = false,
  className = "",
}: Props) {
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState("");

  async function telechargerPdf() {
    if (!ficheId || disabled || chargement) return;

    try {
      setChargement(true);
      setErreur("");

      const { data, error: erreurSession } =
        await supabase.auth.getSession();

      if (erreurSession) {
        throw new Error(
          erreurSession.message ||
            "Impossible de vérifier votre session utilisateur."
        );
      }

      const jeton = data.session?.access_token;

      if (!jeton) {
        throw new Error(
          "Votre session a expiré. Veuillez vous reconnecter."
        );
      }

      const response = await fetch(
        "/api/interventions/pv-fin-chantier/pdf",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${jeton}`,
          },
          body: JSON.stringify({
            ficheId,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(await lireErreurResponse(response));
      }

      const typeContenu = response.headers.get("content-type") || "";

      if (
        typeContenu &&
        !typeContenu.includes("application/pdf") &&
        !typeContenu.includes("application/octet-stream")
      ) {
        throw new Error(
          "Le serveur n’a pas renvoyé un fichier PDF valide."
        );
      }

      const blob = await response.blob();

      if (blob.size === 0) {
        throw new Error("Le fichier PDF généré est vide.");
      }

      const nomFichier = extraireNomFichier(
        response.headers.get("content-disposition"),
        ficheId
      );

      const urlObjet = window.URL.createObjectURL(blob);
      const lien = document.createElement("a");

      lien.href = urlObjet;
      lien.download = nomFichier;
      lien.rel = "noopener";
      lien.style.display = "none";

      document.body.appendChild(lien);
      lien.click();
      lien.remove();

      window.setTimeout(() => {
        window.URL.revokeObjectURL(urlObjet);
      }, 1500);
    } catch (error: unknown) {
      console.error("Erreur téléchargement PDF PV :", error);

      setErreur(
        error instanceof Error
          ? error.message
          : "Impossible de télécharger le PDF."
      );
    } finally {
      setChargement(false);
    }
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <button
        type="button"
        onClick={telechargerPdf}
        disabled={disabled || chargement || !ficheId}
        aria-busy={chargement}
        className="inline-flex w-full items-center justify-center rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {chargement ? "Génération du PDF..." : "Télécharger le PV PDF"}
      </button>

      {erreur && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
        >
          {erreur}
        </p>
      )}
    </div>
  );
}