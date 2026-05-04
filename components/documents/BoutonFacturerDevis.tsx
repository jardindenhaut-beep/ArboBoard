"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Props = {
  devisId: string;
  numero?: string | null;
  statut?: string | null;
  onFacture?: () => void | Promise<void>;
};

export default function BoutonFacturerDevis({
  devisId,
  numero,
  statut,
  onFacture,
}: Props) {
  const router = useRouter();

  const [chargement, setChargement] = useState(false);
  const [messageErreur, setMessageErreur] = useState("");

  const devisAccepte = statut === "accepte";

  if (!devisAccepte) {
    return null;
  }

  async function facturerDevis() {
    const confirmation = window.confirm(
      `Créer une facture à partir du devis ${numero || ""} ?`
    );

    if (!confirmation) return;

    try {
      setChargement(true);
      setMessageErreur("");

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setMessageErreur("Session expirée. Veuillez vous reconnecter.");
        return;
      }

      const response = await fetch("/api/factures/depuis-devis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          devisId,
        }),
      });

      const resultat = await response.json().catch(() => null);

      if (!response.ok || !resultat?.success) {
        throw new Error(
          resultat?.error || "Impossible de créer la facture depuis ce devis."
        );
      }

      if (onFacture) {
        await onFacture();
      }

      router.push("/chef/factures");
    } catch (error: any) {
      console.error("Erreur facturation devis :", error);
      setMessageErreur(
        error?.message || "Impossible de créer la facture depuis ce devis."
      );
    } finally {
      setChargement(false);
    }
  }

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={facturerDevis}
        disabled={chargement}
        className="rounded-xl border border-purple-200 px-3 py-2 text-xs font-medium text-purple-700 hover:bg-purple-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {chargement ? "Création..." : "Facturer"}
      </button>

      {messageErreur && (
        <p className="max-w-[220px] text-right text-[11px] text-red-600">
          {messageErreur}
        </p>
      )}
    </div>
  );
}