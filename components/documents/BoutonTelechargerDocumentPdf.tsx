"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type TypeDocument = "devis" | "facture" | "avoir";

type Props = {
  typeDocument: TypeDocument;
  documentId: string;
  numero?: string | null;
  className?: string;
};

function libelleDocument(typeDocument: TypeDocument) {
  if (typeDocument === "devis") return "devis";
  if (typeDocument === "avoir") return "avoir";
  return "facture";
}

function prefixeDocument(typeDocument: TypeDocument) {
  if (typeDocument === "devis") return "devis";
  if (typeDocument === "avoir") return "avoir";
  return "facture";
}

function nomFichierParDefaut(typeDocument: TypeDocument, numero?: string | null) {
  const base = `${prefixeDocument(typeDocument)}-${numero || "document"}`;

  return `${base
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, "-")
    .trim()}.pdf`;
}

function extraireNomFichier(contentDisposition: string | null) {
  if (!contentDisposition) return null;

  const filenameUtf8 = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);

  if (filenameUtf8?.[1]) {
    try {
      return decodeURIComponent(filenameUtf8[1]);
    } catch {
      return filenameUtf8[1];
    }
  }

  const filenameSimple = contentDisposition.match(/filename="([^"]+)"/i);

  if (filenameSimple?.[1]) {
    return filenameSimple[1];
  }

  return null;
}

async function lireErreurResponse(response: Response) {
  const typeContenu = response.headers.get("content-type") || "";

  if (typeContenu.includes("application/json")) {
    const json = await response.json().catch(() => null);
    return json?.error || json?.message || null;
  }

  const texte = await response.text().catch(() => "");
  return texte || null;
}

export default function BoutonTelechargerDocumentPdf({
  typeDocument,
  documentId,
  numero,
  className,
}: Props) {
  const [chargement, setChargement] = useState(false);
  const [messageErreur, setMessageErreur] = useState("");

  async function telechargerPdf() {
    try {
      setChargement(true);
      setMessageErreur("");

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

      const response = await fetch("/api/documents/pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          typeDocument,
          documentId,
        }),
      });

      if (!response.ok) {
        const erreur = await lireErreurResponse(response);

        throw new Error(
          erreur ||
            `Impossible de télécharger le PDF du ${libelleDocument(
              typeDocument
            )}.`
        );
      }

      const blob = await response.blob();

      if (!blob || blob.size === 0) {
        throw new Error("Le PDF généré est vide.");
      }

      const nomFichier =
        extraireNomFichier(response.headers.get("content-disposition")) ||
        nomFichierParDefaut(typeDocument, numero);

      const url = window.URL.createObjectURL(blob);
      const lien = window.document.createElement("a");

      lien.href = url;
      lien.download = nomFichier;
      lien.style.display = "none";

      window.document.body.appendChild(lien);
      lien.click();
      lien.remove();

      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error("Erreur téléchargement PDF :", error);
      setMessageErreur(
        error?.message ||
          `Impossible de télécharger le PDF du ${libelleDocument(typeDocument)}.`
      );
    } finally {
      setChargement(false);
    }
  }

  return (
    <div className="inline-flex flex-col gap-1">
      <button
        type="button"
        onClick={telechargerPdf}
        disabled={chargement}
        className={
          className ||
          "rounded-xl border border-emerald-200 px-3 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
        }
      >
        {chargement ? "Génération..." : "Télécharger PDF"}
      </button>

      {messageErreur && (
        <p className="max-w-xs text-xs font-medium text-red-600">
          {messageErreur}
        </p>
      )}
    </div>
  );
}