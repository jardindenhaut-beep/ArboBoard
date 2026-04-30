"use client";

import Link from "next/link";
import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  abonnementEstBloque,
  chargerContexteEntreprise,
} from "@/lib/entreprise";

export default function ChefLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [autorise, setAutorise] = useState(false);
  const [chargement, setChargement] = useState(true);
  const [nomEntreprise, setNomEntreprise] = useState("");
  const [nomUtilisateur, setNomUtilisateur] = useState("");
  const [statutAbonnement, setStatutAbonnement] = useState("");
  const [planAbonnement, setPlanAbonnement] = useState("");

  useEffect(() => {
    verifierAccesChef();
  }, [pathname]);

  async function verifierAccesChef() {
    setChargement(true);
    setAutorise(false);

    const { contexte, erreur } = await chargerContexteEntreprise();

    if (erreur || !contexte) {
      setChargement(false);
      router.replace("/connexion");
      return;
    }

    if (contexte.profil.role !== "chef") {
      await supabase.auth.signOut();
      setChargement(false);
      router.replace("/connexion");
      return;
    }

    const statut = contexte.entreprise.statut_abonnement || "essai";

    const cheminAutoriseSiBloque =
      pathname.startsWith("/chef/abonnement") ||
      pathname.startsWith("/chef/profil");

    const abonnementBloque = abonnementEstBloque(contexte.entreprise);

    if (abonnementBloque && !cheminAutoriseSiBloque) {
      setChargement(false);
      router.replace("/chef/abonnement");
      return;
    }

    const nomComplet = `${contexte.profil.prenom || ""} ${
      contexte.profil.nom || ""
    }`.trim();

    setNomEntreprise(contexte.entreprise.nom_entreprise || "");
    setNomUtilisateur(nomComplet || contexte.profil.email || "Chef");
    setStatutAbonnement(statut);
    setPlanAbonnement(contexte.entreprise.plan_abonnement || "essai");

    setAutorise(true);
    setChargement(false);
  }

  async function seDeconnecter() {
    await supabase.auth.signOut();
    router.push("/connexion");
  }

  const liens = [
    { href: "/chef/dashboard", label: "Dashboard" },
    { href: "/chef/clients", label: "Clients" },
    { href: "/chef/salaries", label: "Salariés" },
    { href: "/chef/salaries/acces", label: "Accès salariés" },
    { href: "/chef/planning", label: "Planning" },
    { href: "/chef/demandes", label: "Demandes" },
    { href: "/chef/chantiers", label: "Chantiers" },
    { href: "/chef/devis", label: "Devis" },
    { href: "/chef/factures", label: "Factures" },
    { href: "/chef/abonnement", label: "Abonnement" },
    { href: "/chef/profil", label: "Profil" },
    { href: "/chef/parametres", label: "Paramètres" },
  ];

 const abonnementBloque =
  statutAbonnement === "suspendu" ||
  statutAbonnement === "annule" ||
  statutAbonnement === "annulé";
  
  if (chargement) {
    return (
      <main className="min-h-screen bg-slate-100 p-8">
        <p className="text-slate-700">Vérification de l&apos;accès chef...</p>
      </main>
    );
  }

  if (!autorise) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Link
              href="/chef/dashboard"
              className="text-xl font-bold text-slate-900"
            >
              Arboboard
            </Link>

            <p className="text-sm text-slate-500">
              Espace chef — {nomEntreprise || "Entreprise"}
            </p>

            <p className="text-xs text-slate-400">
              Plan : {planAbonnement || "essai"} — Statut :{" "}
              {statutAbonnement || "essai"}
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

          <div className="flex flex-col gap-2 lg:items-end">
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

        {abonnementBloque && (
          <div className="border-t border-orange-200 bg-orange-50 px-6 py-3 text-sm text-orange-800">
            Ton abonnement est actuellement bloqué. L’accès aux fonctionnalités
            est limité. Consulte la page Abonnement.
          </div>
        )}
      </header>

      {children}
    </div>
  );
}