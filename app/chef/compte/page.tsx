"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  abonnementEstBloque,
  chargerContexteEntreprise,
} from "@/lib/entreprise";

type ResultatContexteEntreprise = Awaited<
  ReturnType<typeof chargerContexteEntreprise>
>;

type ContexteCompteBrut = NonNullable<
  ResultatContexteEntreprise["contexte"]
>;

type ContexteCompte = {
  profil: NonNullable<ContexteCompteBrut["profil"]>;
  entreprise: NonNullable<ContexteCompteBrut["entreprise"]>;
};

type CarteCompte = {
  titre: string;
  description: string;
  href: string;
  emoji: string;
  action: string;
};

const CARTES: CarteCompte[] = [
  {
    titre: "Profil",
    description:
      "Modifiez vos informations personnelles, votre nom et vos coordonnées.",
    href: "/chef/profil",
    emoji: "🙋",
    action: "Gérer le profil",
  },
  {
    titre: "Abonnement",
    description:
      "Consultez votre offre, vos limites et accédez au portail de facturation.",
    href: "/chef/abonnement",
    emoji: "💳",
    action: "Voir l’abonnement",
  },
  {
    titre: "Paramètres entreprise",
    description:
      "Gérez le logo, les coordonnées, les documents et les préférences.",
    href: "/chef/parametres",
    emoji: "⚙️",
    action: "Ouvrir les paramètres",
  },
  {
    titre: "Sécurité & conformité",
    description:
      "Centralisez les sauvegardes, le RGPD, les consentements et les documents légaux.",
    href: "/chef/securite",
    emoji: "🛡️",
    action: "Ouvrir la sécurité",
  },
];

function nomComplet(profil: ContexteCompte["profil"] | null) {
  if (!profil) return "Utilisateur Arboboard";

  return (
    `${profil.prenom || ""} ${profil.nom || ""}`.trim() ||
    profil.email ||
    "Utilisateur Arboboard"
  );
}

export default function CompteChefPage() {
  const [contexte, setContexte] = useState<ContexteCompte | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    let actif = true;

    async function charger() {
      try {
        setChargement(true);
        setErreur("");

        const resultat = await chargerContexteEntreprise();

        if (!actif) return;

        if (resultat.erreur || !resultat.contexte) {
          setErreur(
            resultat.erreur ||
              "Impossible de charger les informations du compte."
          );
          return;
        }

        setContexte(resultat.contexte as ContexteCompte);
      } catch (error) {
        console.error("Erreur page compte :", error);

        if (actif) {
          setErreur(
            "Impossible de charger les informations du compte."
          );
        }
      } finally {
        if (actif) {
          setChargement(false);
        }
      }
    }

    charger();

    return () => {
      actif = false;
    };
  }, []);

  if (chargement) {
    return (
      <section className="mx-auto max-w-6xl">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm text-slate-500">
            Chargement de votre compte…
          </p>
        </div>
      </section>
    );
  }

  if (erreur || !contexte) {
    return (
      <section className="mx-auto max-w-3xl">
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-800">
          <h1 className="text-lg font-bold">Compte indisponible</h1>
          <p className="mt-2 text-sm">
            {erreur || "Impossible de charger votre compte."}
          </p>
        </div>
      </section>
    );
  }

  const abonnementBloque = abonnementEstBloque(contexte.entreprise);

  return (
    <section className="mx-auto max-w-6xl space-y-6">
      <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold text-emerald-700">
              Mon compte
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
              {nomComplet(contexte.profil)}
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              {contexte.profil.email || "Adresse email non renseignée"}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold capitalize text-slate-700">
              {contexte.profil.role || "chef"}
            </span>
            <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold capitalize text-emerald-700">
              Plan {contexte.entreprise.plan_abonnement || "essai"}
            </span>
            <span
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                abonnementBloque
                  ? "bg-red-50 text-red-700"
                  : "bg-blue-50 text-blue-700"
              }`}
            >
              {contexte.entreprise.statut_abonnement || "essai"}
            </span>
          </div>
        </div>

        <div className="mt-6 rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Entreprise
          </p>
          <p className="mt-1 font-semibold text-slate-900">
            {contexte.entreprise.nom_entreprise || "Entreprise"}
          </p>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {CARTES.map((carte) => (
          <Link
            key={carte.href}
            href={carte.href}
            className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-xl">
                {carte.emoji}
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-slate-950">
                  {carte.titre}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {carte.description}
                </p>
                <p className="mt-4 text-sm font-semibold text-emerald-700">
                  {carte.action} →
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <section
        id="a-propos"
        className="scroll-mt-24 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
      >
        <p className="text-sm font-semibold text-emerald-700">
          À propos
        </p>
        <h2 className="mt-1 text-2xl font-bold text-slate-950">
          Arboboard
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Solution de gestion destinée aux paysagistes, élagueurs et
          entreprises d’espaces verts : clients, devis, factures,
          interventions, équipes et planning dans un espace unique.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Version
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              V1 Web
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Application
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              arboboard.fr
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Support
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              contact@arboboard.fr
            </p>
          </div>
        </div>
      </section>
    </section>
  );
}