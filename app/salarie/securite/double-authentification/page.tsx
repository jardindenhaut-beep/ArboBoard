"use client";

import Link from "next/link";
import GestionMfaApplication from "@/components/securite/GestionMfaTelephone";

export default function DoubleAuthentificationSalariePage() {
  return (
    <div className="space-y-6">
      <Link
        href="/salarie/profil"
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-950"
      >
        ← Retour à mon profil
      </Link>

      <GestionMfaApplication espace="salarie" />
    </div>
  );
}