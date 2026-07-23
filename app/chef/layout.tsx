"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  verifierAppareilConfiance,
} from "@/lib/auth/appareilConfianceClient";
import {
  abonnementEstBloque,
  chargerContexteEntreprise,
} from "@/lib/entreprise";

type ResultatContexteEntreprise = Awaited<
  ReturnType<typeof chargerContexteEntreprise>
>;

type ContexteEntrepriseBrut = NonNullable<
  ResultatContexteEntreprise["contexte"]
>;

type ContexteEntreprise = {
  profil: NonNullable<ContexteEntrepriseBrut["profil"]>;
  entreprise: NonNullable<ContexteEntrepriseBrut["entreprise"]>;
};

type GroupeMenu = "Pilotage" | "Commercial" | "Équipe";

type MenuItem = {
  label: string;
  href: string;
  emoji: string;
  plans: string[];
  groupe: GroupeMenu;
};

type LienCompte = {
  label: string;
  description: string;
  href: string;
  emoji: string;
};

type NiveauAuthentification = "aal1" | "aal2" | null;

const TOUS_LES_PLANS = ["essai", "essentiel", "pro", "expert", "dev"];
const PLANS_EQUIPE = ["essai", "pro", "expert", "dev"];

const MENUS: MenuItem[] = [
  {
    label: "Dashboard",
    href: "/chef",
    emoji: "🏠",
    plans: TOUS_LES_PLANS,
    groupe: "Pilotage",
  },
  {
    label: "Planning",
    href: "/chef/planning",
    emoji: "📅",
    plans: PLANS_EQUIPE,
    groupe: "Pilotage",
  },
  {
    label: "Fiches d’intervention",
    href: "/chef/interventions",
    emoji: "🌳",
    plans: PLANS_EQUIPE,
    groupe: "Pilotage",
  },
  {
    label: "Clients",
    href: "/chef/clients",
    emoji: "👥",
    plans: TOUS_LES_PLANS,
    groupe: "Commercial",
  },
  {
    label: "Devis",
    href: "/chef/devis",
    emoji: "📝",
    plans: TOUS_LES_PLANS,
    groupe: "Commercial",
  },
  {
    label: "Factures",
    href: "/chef/factures",
    emoji: "🧾",
    plans: TOUS_LES_PLANS,
    groupe: "Commercial",
  },
  {
    label: "Salariés",
    href: "/chef/salaries",
    emoji: "👷",
    plans: PLANS_EQUIPE,
    groupe: "Équipe",
  },
  {
    label: "Accès salariés",
    href: "/chef/salaries/acces",
    emoji: "🔐",
    plans: PLANS_EQUIPE,
    groupe: "Équipe",
  },
  {
    label: "Demandes",
    href: "/chef/demandes",
    emoji: "📩",
    plans: PLANS_EQUIPE,
    groupe: "Équipe",
  },
];

const LIENS_COMPTE: LienCompte[] = [
  {
    label: "Mon compte",
    description: "Vue d’ensemble de votre compte",
    href: "/chef/compte",
    emoji: "👤",
  },
  {
    label: "Profil",
    description: "Informations personnelles",
    href: "/chef/profil",
    emoji: "🙋",
  },
  {
    label: "Abonnement",
    description: "Offre, facturation et portail Stripe",
    href: "/chef/abonnement",
    emoji: "💳",
  },
  {
    label: "Paramètres",
    description: "Entreprise et documents",
    href: "/chef/parametres",
    emoji: "⚙️",
  },
  {
    label: "Sécurité & conformité",
    description: "RGPD, sauvegardes et documents légaux",
    href: "/chef/securite",
    emoji: "🛡️",
  },
  {
    label: "À propos",
    description: "Version et informations Arboboard",
    href: "/chef/compte#a-propos",
    emoji: "ℹ️",
  },
];

function normaliserPlan(plan: string | null | undefined) {
  return String(plan || "essai").toLowerCase().trim();
}

function normaliserRole(role: string | null | undefined) {
  return String(role || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function roleChefAutorise(role: string | null | undefined) {
  return [
    "chef",
    "admin",
    "administrateur",
    "gerant",
    "dirigeant",
    "patron",
  ].includes(normaliserRole(role));
}

function lienMenuActif(pathname: string, href: string) {
  if (href === "/chef") {
    return pathname === "/chef" || pathname === "/chef/dashboard";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function libelleGroupeMenu(groupe: GroupeMenu) {
  return groupe;
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
    pathname.startsWith("/chef/parametres") ||
    pathname.startsWith("/chef/compte") ||
    pathname.startsWith("/chef/securite")
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
    ["essai", "pro", "expert"].includes(planNormalise) &&
    (
      pathname.startsWith("/chef/salaries") ||
      pathname.startsWith("/chef/planning") ||
      pathname.startsWith("/chef/demandes") ||
      pathname.startsWith("/chef/interventions")
    )
  ) {
    return true;
  }

  return false;
}

function nomComplet(profil: ContexteEntreprise["profil"]) {
  const nom = `${profil.prenom || ""} ${profil.nom || ""}`.trim();
  return nom || profil.email || "Utilisateur Arboboard";
}

function initiales(profil: ContexteEntreprise["profil"]) {
  const valeurs = [profil.prenom, profil.nom]
    .filter(Boolean)
    .map((valeur) => String(valeur).trim().charAt(0).toUpperCase())
    .join("");

  if (valeurs) return valeurs.slice(0, 2);

  return String(profil.email || "A").charAt(0).toUpperCase();
}

function MenuUtilisateur({
  profil,
  entreprise,
  ouvert,
  onBasculer,
  onFermer,
  onDeconnexion,
  mobile = false,
}: {
  profil: ContexteEntreprise["profil"];
  entreprise: ContexteEntreprise["entreprise"];
  ouvert: boolean;
  onBasculer: () => void;
  onFermer: () => void;
  onDeconnexion: () => Promise<void>;
  mobile?: boolean;
}) {
  if (mobile) {
    return (
      <div className="relative">
        <button
          type="button"
          onClick={onBasculer}
          aria-expanded={ouvert}
          aria-label="Ouvrir le menu utilisateur"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-800 transition hover:bg-emerald-200"
        >
          {initiales(profil)}
        </button>

        {ouvert ? (
          <div className="absolute right-0 top-12 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="border-b border-slate-200 p-4">
              <p className="truncate text-sm font-semibold text-slate-950">
                {nomComplet(profil)}
              </p>
              <p className="mt-0.5 truncate text-xs text-slate-500">
                {profil.email || "Adresse email non renseignée"}
              </p>
              <p className="mt-2 truncate text-xs font-medium text-emerald-700">
                {entreprise.nom_entreprise || "Entreprise"}
              </p>
            </div>

            <div className="max-h-[65vh] overflow-y-auto p-2">
              {LIENS_COMPTE.map((lien) => (
                <Link
                  key={lien.href}
                  href={lien.href}
                  onClick={onFermer}
                  className="flex items-start gap-3 rounded-xl px-3 py-3 transition hover:bg-slate-50"
                >
                  <span className="mt-0.5 text-base">{lien.emoji}</span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-slate-900">
                      {lien.label}
                    </span>
                    <span className="block text-xs text-slate-500">
                      {lien.description}
                    </span>
                  </span>
                </Link>
              ))}
            </div>

            <div className="border-t border-slate-200 p-2">
              <button
                type="button"
                onClick={onDeconnexion}
                className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-red-700 transition hover:bg-red-50"
              >
                Se déconnecter
              </button>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="relative">
      {ouvert ? (
        <div className="absolute bottom-[calc(100%+0.75rem)] left-0 z-50 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-200 p-4">
            <p className="truncate text-sm font-semibold text-slate-950">
              {nomComplet(profil)}
            </p>
            <p className="mt-0.5 truncate text-xs text-slate-500">
              {profil.email || "Adresse email non renseignée"}
            </p>
            <p className="mt-2 truncate text-xs font-medium text-emerald-700">
              {entreprise.nom_entreprise || "Entreprise"}
            </p>
          </div>

          <div className="max-h-[55vh] overflow-y-auto p-2">
            {LIENS_COMPTE.map((lien) => (
              <Link
                key={lien.href}
                href={lien.href}
                onClick={onFermer}
                className="flex items-start gap-3 rounded-xl px-3 py-3 transition hover:bg-slate-50"
              >
                <span className="mt-0.5 text-base">{lien.emoji}</span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-slate-900">
                    {lien.label}
                  </span>
                  <span className="block text-xs text-slate-500">
                    {lien.description}
                  </span>
                </span>
              </Link>
            ))}
          </div>

          <div className="border-t border-slate-200 p-2">
            <button
              type="button"
              onClick={onDeconnexion}
              className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-red-700 transition hover:bg-red-50"
            >
              Se déconnecter
            </button>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={onBasculer}
        aria-expanded={ouvert}
        className="flex w-full items-center gap-3 rounded-2xl border border-transparent p-2 text-left transition hover:border-slate-200 hover:bg-slate-50"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-800">
          {initiales(profil)}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-950">
            {nomComplet(profil)}
          </p>
          <p className="truncate text-xs text-slate-500">
            {profil.email || "Mon compte"}
          </p>
        </div>

        <span
          className={`text-xs text-slate-400 transition ${
            ouvert ? "rotate-180" : ""
          }`}
        >
          ▲
        </span>
      </button>
    </div>
  );
}

export default function ChefLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const menuUtilisateurDesktopRef = useRef<HTMLDivElement | null>(null);
  const menuUtilisateurMobileRef = useRef<HTMLDivElement | null>(null);

  const [chargement, setChargement] = useState(true);
  const [contexte, setContexte] = useState<ContexteEntreprise | null>(null);
  const [messageErreur, setMessageErreur] = useState("");
  const [menuUtilisateurOuvert, setMenuUtilisateurOuvert] = useState(false);
  const [niveauAuthentification, setNiveauAuthentification] =
    useState<NiveauAuthentification>(null);
  const [mfaRequise, setMfaRequise] = useState(false);
  const [appareilReconnu, setAppareilReconnu] =
    useState(false);

  useEffect(() => {
    let actif = true;

    async function verifierAcces() {
      try {
        setChargement(true);
        setMessageErreur("");
        setMfaRequise(false);
        setNiveauAuthentification(null);
        setAppareilReconnu(false);

        const resultat = await chargerContexteEntreprise();

        if (!actif) return;

        if (resultat.erreur || !resultat.contexte) {
          router.replace("/connexion");
          return;
        }

        const contexteEntreprise =
          resultat.contexte as ContexteEntreprise;

        if (
          !contexteEntreprise.profil ||
          !contexteEntreprise.entreprise
        ) {
          router.replace("/connexion");
          return;
        }

        const profil = contexteEntreprise.profil;
        const entreprise = contexteEntreprise.entreprise;

        if (!roleChefAutorise(profil.role)) {
          await supabase.auth.signOut({
        scope: "local",
      });
          router.replace("/connexion");
          return;
        }

        if (
          profil.statut &&
          normaliserRole(profil.statut) !== "actif"
        ) {
          await supabase.auth.signOut();
          router.replace("/connexion");
          return;
        }

        const {
          data: niveauMfa,
          error: niveauMfaError,
        } =
          await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

        if (!actif) return;

        if (niveauMfaError) {
          throw niveauMfaError;
        }

        const niveauActuel =
          niveauMfa.currentLevel as NiveauAuthentification;
        const prochainNiveau =
          niveauMfa.nextLevel as NiveauAuthentification;

        setNiveauAuthentification(niveauActuel);

        if (
          niveauActuel === "aal1" &&
          prochainNiveau === "aal2"
        ) {
          const confiance =
            await verifierAppareilConfiance();

          if (!actif) return;

          if (!confiance) {
            setMfaRequise(true);
            router.replace(
              "/connexion?mfa=required"
            );
            return;
          }

          setAppareilReconnu(true);
        }

        const abonnementBloque =
          abonnementEstBloque(entreprise);

        if (
          abonnementBloque &&
          !pathname.startsWith("/chef/abonnement")
        ) {
          router.replace("/chef/abonnement?acces=bloque");
          return;
        }

        const planActuel = normaliserPlan(
          entreprise.plan_abonnement
        );

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
          "Impossible de vérifier votre accès et le niveau de sécurité de la session. Veuillez vous reconnecter."
        );
        setChargement(false);
      }
    }

    void verifierAcces();

    return () => {
      actif = false;
    };
  }, [pathname, router]);

  useEffect(() => {
    setMenuUtilisateurOuvert(false);
  }, [pathname]);

  useEffect(() => {
    function fermerAuClicExterieur(event: MouseEvent) {
      const cible = event.target as Node;

      const clicDansMenuDesktop =
        menuUtilisateurDesktopRef.current?.contains(cible) ?? false;
      const clicDansMenuMobile =
        menuUtilisateurMobileRef.current?.contains(cible) ?? false;

      if (
        menuUtilisateurOuvert &&
        !clicDansMenuDesktop &&
        !clicDansMenuMobile
      ) {
        setMenuUtilisateurOuvert(false);
      }
    }

    function fermerAvecEchap(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuUtilisateurOuvert(false);
      }
    }

    document.addEventListener("mousedown", fermerAuClicExterieur);
    document.addEventListener("keydown", fermerAvecEchap);

    return () => {
      document.removeEventListener("mousedown", fermerAuClicExterieur);
      document.removeEventListener("keydown", fermerAvecEchap);
    };
  }, [menuUtilisateurOuvert]);

  const planActuel = useMemo(() => {
    return normaliserPlan(contexte?.entreprise?.plan_abonnement);
  }, [contexte]);

  const menusDisponibles = useMemo(() => {
    return MENUS.filter((menu) => menu.plans.includes(planActuel));
  }, [planActuel]);

  const groupesMenusDisponibles = useMemo(() => {
    const groupes: GroupeMenu[] = [
      "Pilotage",
      "Commercial",
      "Équipe",
    ];

    return groupes
      .map((groupe) => ({
        groupe,
        menus: menusDisponibles.filter(
          (menu) => menu.groupe === groupe
        ),
      }))
      .filter((section) => section.menus.length > 0);
  }, [menusDisponibles]);

  const pageGereSonEspacement = useMemo(() => {
    return (
      pathname === "/chef" ||
      pathname === "/chef/dashboard" ||
      pathname.startsWith("/chef/clients") ||
      pathname.startsWith("/chef/devis") ||
      pathname.startsWith("/chef/factures") ||
      pathname.startsWith("/chef/planning") ||
      pathname.startsWith("/chef/interventions")
    );
  }, [pathname]);

  async function deconnexion() {
    setMenuUtilisateurOuvert(false);

    try {
      await supabase.auth.signOut();
    } finally {
      router.replace("/connexion");
    }
  }

  if (chargement) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mb-3 text-3xl">🌳</div>
          <h1 className="text-xl font-semibold text-slate-900">
            Chargement de votre espace
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {mfaRequise
              ? "La double authentification doit être validée avant d’ouvrir cet espace."
              : "Vérification de votre compte, de votre entreprise, de votre abonnement et du niveau de sécurité de la session."}
          </p>
        </div>
      </main>
    );
  }

  if (messageErreur) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
          <div className="mb-3 text-3xl">⚠️</div>
          <h1 className="text-xl font-semibold text-red-700">
            Accès impossible
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {messageErreur}
          </p>
          <button
            type="button"
            onClick={() => router.replace("/connexion")}
            className="mt-5 inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-700"
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
      <aside className="fixed left-0 top-0 hidden h-screen w-72 flex-col border-r border-slate-200 bg-white shadow-sm lg:flex">
        <div className="border-b border-slate-200 bg-gradient-to-br from-emerald-50 via-white to-white p-5">
          <Link
            href="/chef"
            className="flex items-center gap-3"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-2xl text-white shadow-sm">
              🌳
            </div>
            <div>
              <p className="text-lg font-bold leading-tight">
                Arboboard
              </p>
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
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium capitalize text-slate-700">
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
            {niveauAuthentification === "aal2" ? (
              <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-violet-700">
                MFA vérifiée
              </span>
            ) : appareilReconnu ? (
              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                Appareil fiable
              </span>
            ) : null}
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-5">
          <div className="space-y-6">
            {groupesMenusDisponibles.map((section) => (
              <section key={section.groupe}>
                <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  {libelleGroupeMenu(section.groupe)}
                </p>

                <div className="space-y-1">
                  {section.menus.map((menu) => {
                    const actif = lienMenuActif(
                      pathname,
                      menu.href
                    );

                    return (
                      <Link
                        key={menu.href}
                        href={menu.href}
                        aria-current={actif ? "page" : undefined}
                        className={`group flex min-h-11 items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition ${
                          actif
                            ? "bg-emerald-600 text-white shadow-sm"
                            : "text-slate-700 hover:bg-slate-100 hover:text-slate-950"
                        }`}
                      >
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-base transition ${
                            actif
                              ? "bg-white/15"
                              : "bg-slate-50 group-hover:bg-white"
                          }`}
                        >
                          {menu.emoji}
                        </span>

                        <span className="min-w-0 flex-1 truncate">
                          {menu.label}
                        </span>

                        {actif ? (
                          <span
                            aria-hidden="true"
                            className="h-2 w-2 shrink-0 rounded-full bg-white"
                          />
                        ) : null}
                      </Link>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </nav>

        <div
          ref={menuUtilisateurDesktopRef}
          className="border-t border-slate-200 p-3"
        >
          <MenuUtilisateur
            profil={profil}
            entreprise={entreprise}
            ouvert={menuUtilisateurOuvert}
            onBasculer={() =>
              setMenuUtilisateurOuvert((valeur) => !valeur)
            }
            onFermer={() => setMenuUtilisateurOuvert(false)}
            onDeconnexion={deconnexion}
          />
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <Link
              href="/chef"
              className="flex items-center gap-2"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-xl">
                🌳
              </div>
              <div>
                <p className="font-bold leading-tight">Arboboard</p>
                <p className="text-xs text-slate-500">
                  Espace chef
                </p>
              </div>
            </Link>

            <div ref={menuUtilisateurMobileRef}>
              <MenuUtilisateur
                profil={profil}
                entreprise={entreprise}
                ouvert={menuUtilisateurOuvert}
                onBasculer={() =>
                  setMenuUtilisateurOuvert(
                    (valeur) => !valeur
                  )
                }
                onFermer={() =>
                  setMenuUtilisateurOuvert(false)
                }
                onDeconnexion={deconnexion}
                mobile
              />
            </div>
          </div>

          <nav
            aria-label="Navigation principale"
            className="flex gap-2 overflow-x-auto px-4 pb-3"
          >
            {menusDisponibles.map((menu) => {
              const actif = lienMenuActif(
                pathname,
                menu.href
              );

              return (
                <Link
                  key={menu.href}
                  href={menu.href}
                  aria-current={actif ? "page" : undefined}
                  className={`inline-flex min-h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-3 py-2 text-xs font-semibold transition ${
                    actif
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "border border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  <span>{menu.emoji}</span>
                  <span>{menu.label}</span>
                </Link>
              );
            })}
          </nav>
        </header>

        {abonnementBloque ? (
          <div className="border-b border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 lg:px-8">
            Votre abonnement est bloqué, suspendu, annulé ou expiré.
            Vous pouvez accéder uniquement à la page abonnement pour
            régulariser la situation.
          </div>
        ) : null}

        <main
          className={
            pageGereSonEspacement
              ? "min-w-0"
              : "min-w-0 p-4 lg:p-8"
          }
        >
          {children}
        </main>
      </div>
    </div>
  );
}