"use client";

import Link from "next/link";
import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  abonnementEstBloque,
  chargerContexteEntreprise,
} from "@/lib/entreprise";

export default function SalarieLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [autorise, setAutorise] = useState(false);
  const [chargement, setChargement] = useState(true);
  const [nomEntreprise, setNomEntreprise] = useState("");
  const [nomUtilisateur, setNomUtilisateur] = useState("");
  const [messageBlocage, setMessageBlocage] = useState("");

  useEffect(() => {
    verifierAccesSalarie();
  }, []);

  async function verifierAccesSalarie() {
    setChargement(true);

    const { contexte, erreur } = await chargerContexteEntreprise();

    if (erreur || !contexte) {
      router.push("/connexion/salarie");
      return;
    }

    if (contexte.profil.role !== "salarie") {
      await supabase.auth.signOut();
      router.push("/connexion/salarie");
      return;
    }

    const statut = contexte.entreprise.statut_abonnement || "essai";

    const abonnementBloque = abonnementEstBloque(contexte.entreprise);

    if (abonnementBloque) {
      setMessageBlocage(
        "L’espace salarié est temporairement indisponible car l’abonnement de l’entreprise est suspendu ou annulé."
      );
      setChargement(false);
      return;
    }

    const nomComplet = `${contexte.profil.prenom || ""} ${
      contexte.profil.nom || ""
    }`.trim();

    setNomEntreprise(contexte.entreprise.nom_entreprise || "");
    setNomUtilisateur(nomComplet || contexte.profil.email || "Salarié");
    setAutorise(true);
    setChargement(false);
  }

  async function seDeconnecter() {
    await supabase.auth.signOut();
    router.push("/connexion/salarie");
  }

  const liens = [
    { href: "/salarie/dashboard", label: "Dashboard" },
    { href: "/salarie/planning", label: "Planning" },
    { href: "/salarie/demandes", label: "Demandes" },
    { href: "/salarie/profil", label: "Profil" },
  ];

  if (chargement) {
    return (
      <main className="min-h-screen bg-slate-100 p-8">
        <p className="text-slate-700">Vérification de l&apos;accès salarié...</p>
      </main>
    );
  }

  if (messageBlocage) {
    return (
      <main className="min-h-screen bg-slate-100 p-8">
        <div className="mx-auto max-w-xl rounded-2xl bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">
            Accès salarié bloqué
          </h1>

          <p className="mt-3 text-slate-600">{messageBlocage}</p>

          <button
            onClick={seDeconnecter}
            className="mt-6 rounded-xl bg-red-700 px-5 py-3 font-semibold text-white hover:bg-red-600"
          >
            Se déconnecter
          </button>
        </div>
      </main>
    );
  }

  if (!autorise) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Link href="/salarie/dashboard" className="text-xl font-bold text-slate-900">
              Arboboard
            </Link>

            <p className="text-sm text-slate-500">
              Espace salarié — {nomEntreprise || "Entreprise"}
            </p>
          </div>

          <nav className="flex flex-wrap gap-2">
            {liens.map((lien) => {
              const actif = pathname === lien.href;

              return (
                <Link
                  key={lien.href}
                  href={lien.href}
                  className={
                    actif
                      ? "rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
                      : "rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
                  }
                >
                  {lien.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex flex-col gap-2 md:items-end">
            <p className="text-sm font-medium text-slate-700">
              {nomUtilisateur}
            </p>

            <button
              onClick={seDeconnecter}
              className="rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      {children}
    </div>
  );
}