"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  abonnementEstBloque,
  chargerContexteEntreprise,
} from "@/lib/entreprise";

type ContexteEntreprise = {
  profil: any;
  entreprise: any;
};

type MenuItem = {
  label: string;
  href: string;
  emoji: string;
  plans: string[];
};

const TOUS_LES_PLANS = ["essai", "essentiel", "pro", "expert", "dev"];

const MENUS: MenuItem[] = [
  {
    label: "Dashboard",
    href: "/chef/dashboard",
    emoji: "🏠",
    plans: TOUS_LES_PLANS,
  },
  {
    label: "Clients",
    href: "/chef/clients",
    emoji: "👥",
    plans: TOUS_LES_PLANS,
  },
  {
    label: "Salariés",
    href: "/chef/salaries",
    emoji: "👷",
    plans: ["essai", "pro", "expert", "dev"],
  },
  {
    label: "Accès salariés",
    href: "/chef/salaries/acces",
    emoji: "🔐",
    plans: ["essai", "pro", "expert", "dev"],
  },
  {
    label: "Planning",
    href: "/chef/planning",
    emoji: "📅",
    plans: ["essai", "pro", "expert", "dev"],
  },
  {
    label: "Demandes",
    href: "/chef/demandes",
    emoji: "📩",
    plans: ["essai", "pro", "expert", "dev"],
  },
  {
  label: "Fiches intervention",
  href: "/chef/interventions",
  emoji: "📋",
  plans: ["essai", "pro", "expert", "dev"],
},
  {
    label: "Devis",
    href: "/chef/devis",
    emoji: "📝",
    plans: TOUS_LES_PLANS,
  },
  {
    label: "Factures",
    href: "/chef/factures",
    emoji: "🧾",
    plans: TOUS_LES_PLANS,
  },
  {
    label: "Abonnement",
    href: "/chef/abonnement",
    emoji: "💳",
    plans: TOUS_LES_PLANS,
  },
  {
    label: "Profil",
    href: "/chef/profil",
    emoji: "🙋",
    plans: TOUS_LES_PLANS,
  },
  {
    label: "Paramètres",
    href: "/chef/parametres",
    emoji: "⚙️",
    plans: TOUS_LES_PLANS,
  },
];

function normaliserPlan(plan: string | null | undefined) {
  return String(plan || "essai").toLowerCase().trim();
}

function routeAutoriseePourPlan(pathname: string, plan: string) {
  const planNormalise = normaliserPlan(plan);

  if (planNormalise === "dev") {
    return true;
  }

  if (
    pathname === "/chef" ||
    pathname.startsWith("/chef/dashboard") ||
    pathname.startsWith("/chef/abonnement") ||
    pathname.startsWith("/chef/profil") ||
    pathname.startsWith("/chef/parametres")
  ) {
    return true;
  }

  if (
    pathname.startsWith("/chef/clients") ||
    pathname.startsWith("/chef/devis") ||
    pathname.startsWith("/chef/factures")
  ) {
    return true;
  }

  if (
    planNormalise === "essai" ||
    planNormalise === "pro" ||
    planNormalise === "expert"
  ) {
    if (
      pathname.startsWith("/chef/salaries") ||
      pathname.startsWith("/chef/planning") ||
      pathname.startsWith("/chef/demandes") ||
     pathname.startsWith("/chef/interventions")
    ) {
      return true;
    }
  }

  return false;
}

export default function ChefLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [chargement, setChargement] = useState(true);
  const [contexte, setContexte] = useState<ContexteEntreprise | null>(null);
  const [messageErreur, setMessageErreur] = useState("");

  useEffect(() => {
    let actif = true;

    async function verifierAcces() {
      try {
        setChargement(true);
        setMessageErreur("");

        const resultat = await chargerContexteEntreprise();

        if (!actif) return;

        if (resultat.erreur || !resultat.contexte) {
          router.replace("/connexion");
          return;
        }

        const contexteEntreprise = resultat.contexte;

        if (!contexteEntreprise.profil || !contexteEntreprise.entreprise) {
          router.replace("/connexion");
          return;
        }

        const profil = contexteEntreprise.profil;
        const entreprise = contexteEntreprise.entreprise;

        if (profil.role !== "chef") {
          await supabase.auth.signOut();
          router.replace("/connexion");
          return;
        }

        if (profil.statut && profil.statut !== "actif") {
          await supabase.auth.signOut();
          router.replace("/connexion");
          return;
        }

        const abonnementBloque = abonnementEstBloque(entreprise);

        if (abonnementBloque && !pathname.startsWith("/chef/abonnement")) {
          router.replace("/chef/abonnement?acces=bloque");
          return;
        }

        const planActuel = normaliserPlan(entreprise.plan_abonnement);

        if (!routeAutoriseePourPlan(pathname, planActuel)) {
          router.replace("/chef/abonnement?acces=plan");
          return;
        }

        setContexte(contexteEntreprise);
        setChargement(false);
      } catch (error) {
        console.error("Erreur layout chef :", error);

        if (!actif) return;

        setMessageErreur(
          "Impossible de vérifier votre accès. Veuillez vous reconnecter."
        );
        setChargement(false);
      }
    }

    verifierAcces();

    return () => {
      actif = false;
    };
  }, [pathname, router]);

  const planActuel = useMemo(() => {
    return normaliserPlan(contexte?.entreprise?.plan_abonnement);
  }, [contexte]);

  const menusDisponibles = useMemo(() => {
    return MENUS.filter((menu) => menu.plans.includes(planActuel));
  }, [planActuel]);

  async function deconnexion() {
    await supabase.auth.signOut();
    router.replace("/connexion");
  }

  if (chargement) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 max-w-md w-full text-center">
          <div className="text-3xl mb-3">🌳</div>
          <h1 className="text-xl font-semibold text-slate-900">
            Chargement de votre espace
          </h1>
          <p className="text-sm text-slate-500 mt-2">
            Vérification de votre compte, de votre entreprise et de votre
            abonnement.
          </p>
        </div>
      </main>
    );
  }

  if (messageErreur) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-red-200 p-8 max-w-md w-full text-center">
          <div className="text-3xl mb-3">⚠️</div>
          <h1 className="text-xl font-semibold text-red-700">
            Accès impossible
          </h1>
          <p className="text-sm text-slate-600 mt-2">{messageErreur}</p>
          <button
            onClick={() => router.replace("/connexion")}
            className="mt-5 inline-flex items-center justify-center rounded-xl bg-slate-900 text-white px-5 py-2.5 text-sm font-medium hover:bg-slate-700"
          >
            Retour connexion
          </button>
        </div>
      </main>
    );
  }

  if (!contexte) {
    return null;
  }

  const entreprise = contexte.entreprise;
  const profil = contexte.profil;
  const abonnementBloque = abonnementEstBloque(entreprise);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <aside className="fixed left-0 top-0 hidden h-screen w-72 border-r border-slate-200 bg-white lg:flex lg:flex-col">
        <div className="border-b border-slate-200 p-5">
          <Link href="/chef/dashboard" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-2xl">
              🌳
            </div>
            <div>
              <p className="text-lg font-bold leading-tight">Arboboard</p>
              <p className="text-xs text-slate-500">
                Espace chef d’entreprise
              </p>
            </div>
          </Link>
        </div>

        <div className="border-b border-slate-200 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">
            Entreprise
          </p>
          <p className="mt-1 truncate text-sm font-semibold text-slate-900">
            {entreprise.nom_entreprise || "Entreprise"}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
              Plan {planActuel}
            </span>
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                abonnementBloque
                  ? "bg-red-100 text-red-700"
                  : "bg-emerald-100 text-emerald-700"
              }`}
            >
              {entreprise.statut_abonnement || "essai"}
            </span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-4">
          <div className="space-y-1">
            {menusDisponibles.map((menu) => {
              const actif =
                pathname === menu.href ||
                pathname.startsWith(`${menu.href}/`);

              return (
                <Link
                  key={menu.href}
                  href={menu.href}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    actif
                      ? "bg-emerald-50 text-emerald-700"
                      : "text-slate-700 hover:bg-slate-100 hover:text-slate-950"
                  }`}
                >
                  <span className="text-base">{menu.emoji}</span>
                  <span>{menu.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="border-t border-slate-200 p-4">
          <div className="mb-3">
            <p className="truncate text-sm font-semibold">
              {profil.prenom || ""} {profil.nom || ""}
            </p>
            <p className="truncate text-xs text-slate-500">{profil.email}</p>
          </div>

          <button
            onClick={deconnexion}
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Se déconnecter
          </button>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <Link href="/chef/dashboard" className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-xl">
                🌳
              </div>
              <div>
                <p className="font-bold leading-tight">Arboboard</p>
                <p className="text-xs text-slate-500">Espace chef</p>
              </div>
            </Link>

            <button
              onClick={deconnexion}
              className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium"
            >
              Déconnexion
            </button>
          </div>

          <div className="flex gap-2 overflow-x-auto px-4 pb-3">
            {menusDisponibles.map((menu) => {
              const actif =
                pathname === menu.href ||
                pathname.startsWith(`${menu.href}/`);

              return (
                <Link
                  key={menu.href}
                  href={menu.href}
                  className={`whitespace-nowrap rounded-full px-3 py-2 text-xs font-medium ${
                    actif
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {menu.emoji} {menu.label}
                </Link>
              );
            })}
          </div>
        </header>

        {abonnementBloque && (
          <div className="border-b border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 lg:px-8">
            Votre abonnement est bloqué, suspendu, annulé ou expiré. Vous pouvez
            accéder uniquement à la page abonnement pour régulariser la
            situation.
          </div>
        )}

        <main className="p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}