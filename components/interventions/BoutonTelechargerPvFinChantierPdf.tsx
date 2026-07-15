"use client";

import { useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Props = {
  ficheId: string;
  disabled?: boolean;
  className?: string;
};

const DELAI_MAX_GENERATION_MS = 90_000;

function nettoyerNomFichier(valeur: string, ficheId: string) {
  const nomParDefaut = `pv-fin-chantier-${ficheId}.pdf`;

  const nom = String(valeur || "")
    .trim()
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .replace(/^\.+/, "");

  if (!nom) return nomParDefaut;

  return nom.toLowerCase().endsWith(".pdf")
    ? nom
    : `${nom}.pdf`;
}

function extraireNomFichier(
  contentDisposition: string | null,
  ficheId: string
) {
  const nomParDefaut = `pv-fin-chantier-${ficheId}.pdf`;

  if (!contentDisposition) {
    return nomParDefaut;
  }

  const nomUtf8 = contentDisposition.match(
    /filename\*=UTF-8''([^;]+)/i
  )?.[1];

  if (nomUtf8) {
    try {
      return nettoyerNomFichier(
        decodeURIComponent(nomUtf8.replace(/["']/g, "")),
        ficheId
      );
    } catch {
      return nettoyerNomFichier(
        nomUtf8.replace(/["']/g, ""),
        ficheId
      );
    }
  }

  const nomSimple =
    contentDisposition.match(/filename="([^"]+)"/i)?.[1] ||
    contentDisposition.match(/filename=([^;]+)/i)?.[1];

  return nettoyerNomFichier(
    nomSimple?.trim().replace(/^["']|["']$/g, "") || nomParDefaut,
    ficheId
  );
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

async function blobEstUnPdf(blob: Blob) {
  if (blob.size < 5) return false;

  try {
    const debut = await blob.slice(0, 5).arrayBuffer();
    const octets = new Uint8Array(debut);
    const signature = String.fromCharCode(...octets);

    return signature === "%PDF-";
  } catch {
    return false;
  }
}

export default function BoutonTelechargerPvFinChantierPdf({
  ficheId,
  disabled = false,
  className = "",
}: Props) {
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState("");

  const telechargementActifRef = useRef(false);
  const urlObjetRef = useRef<string | null>(null);

  function libererUrlObjet() {
    if (!urlObjetRef.current) return;

    window.URL.revokeObjectURL(urlObjetRef.current);
    urlObjetRef.current = null;
  }

  async function telechargerPdf() {
    if (
      !ficheId ||
      disabled ||
      chargement ||
      telechargementActifRef.current
    ) {
      return;
    }

    const controleur = new AbortController();
    const minuterie = window.setTimeout(() => {
      controleur.abort();
    }, DELAI_MAX_GENERATION_MS);

    try {
      telechargementActifRef.current = true;
      setChargement(true);
      setErreur("");

      libererUrlObjet();

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

      let response: Response;

      try {
        response = await fetch(
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
            cache: "no-store",
            signal: controleur.signal,
          }
        );
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          throw new Error(
            "La génération du PDF prend trop de temps. Réessayez dans quelques instants."
          );
        }

        throw new Error(
          "Le serveur est inaccessible. Vérifiez votre connexion puis réessayez."
        );
      }

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

      const pdfValide = await blobEstUnPdf(blob);

      if (!pdfValide) {
        throw new Error(
          "Le fichier reçu ne correspond pas à un document PDF valide."
        );
      }

      const nomFichier = extraireNomFichier(
        response.headers.get("content-disposition"),
        ficheId
      );

      const urlObjet = window.URL.createObjectURL(blob);
      urlObjetRef.current = urlObjet;

      const lien = document.createElement("a");

      lien.href = urlObjet;
      lien.download = nomFichier;
      lien.rel = "noopener";
      lien.style.display = "none";

      document.body.appendChild(lien);
      lien.click();
      lien.remove();

      window.setTimeout(() => {
        libererUrlObjet();
      }, 2_000);
    } catch (error: unknown) {
      console.error("Erreur téléchargement PDF PV :", error);

      setErreur(
        error instanceof Error
          ? error.message
          : "Impossible de télécharger le PDF."
      );
    } finally {
      window.clearTimeout(minuterie);
      telechargementActifRef.current = false;
      setChargement(false);
    }
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <button
        type="button"
        onClick={() => void telechargerPdf()}
        disabled={disabled || chargement || !ficheId}
        aria-busy={chargement}
        aria-disabled={disabled || chargement || !ficheId}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        <span aria-hidden="true">
          {chargement ? "⏳" : "⬇️"}
        </span>

        <span>
          {chargement
            ? "Génération du PDF…"
            : "Télécharger le PV PDF"}
        </span>
      </button>

      {erreur ? (
        <p
          role="alert"
          aria-live="assertive"
          className="max-w-md rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs leading-5 text-red-700"
        >
          {erreur}
        </p>
      ) : null}
    </div>
  );
}