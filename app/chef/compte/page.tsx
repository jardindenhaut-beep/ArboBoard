"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
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
  couleur: "emerald" | "blue" | "violet" | "amber";
};

const CARTES: CarteCompte[] = [
  {
    titre: "Profil",
    description:
      "Modifiez vos informations personnelles, votre nom et vos coordonnées.",
    href: "/chef/profil",
    emoji: "🙋",
    action: "Gérer le profil",
    couleur: "emerald",
  },
  {
    titre: "Abonnement",
    description:
      "Consultez votre offre, vos limites et accédez au portail de facturation.",
    href: "/chef/abonnement",
    emoji: "💳",
    action: "Voir l’abonnement",
    couleur: "blue",
  },
  {
    titre: "Paramètres entreprise",
    description:
      "Gérez le logo, les coordonnées, les documents et les préférences.",
    href: "/chef/parametres",
    emoji: "⚙️",
    action: "Ouvrir les paramètres",
    couleur: "amber",
  },
  {
    titre: "Sécurité & conformité",
    description:
      "Centralisez les sauvegardes, le RGPD, les consentements et les documents légaux.",
    href: "/chef/securite",
    emoji: "🛡️",
    action: "Ouvrir la sécurité",
    couleur: "violet",
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

function initiales(profil: ContexteCompte["profil"] | null) {
  if (!profil) return "A";

  const valeurs = [profil.prenom, profil.nom]
    .filter(Boolean)
    .map((valeur) => String(valeur).trim().charAt(0).toUpperCase())
    .join("");

  if (valeurs) return valeurs.slice(0, 2);

  return String(profil.email || "A").charAt(0).toUpperCase();
}

function classeCarte(couleur: CarteCompte["couleur"]) {
  if (couleur === "blue") {
    return {
      bordure: "hover:border-blue-300",
      icone: "bg-blue-50 text-blue-700",
      action: "text-blue-700",
    };
  }

  if (couleur === "violet") {
    return {
      bordure: "hover:border-violet-300",
      icone: "bg-violet-50 text-violet-700",
      action: "text-violet-700",
    };
  }

  if (couleur === "amber") {
    return {
      bordure: "hover:border-amber-300",
      icone: "bg-amber-50 text-amber-700",
      action: "text-amber-700",
    };
  }

  return {
    bordure: "hover:border-emerald-300",
    icone: "bg-emerald-50 text-emerald-700",
    action: "text-emerald-700",
  };
}

function libelleStatutAbonnement(statut: string | null | undefined) {
  const valeur = String(statut || "essai").replaceAll("_", " ");
  return valeur.charAt(0).toUpperCase() + valeur.slice(1);
}

export default function CompteChefPage() {
  const [contexte, setContexte] = useState<ContexteCompte | null>(null);
  const [chargement, setChargement] = useState(true);
  const [actualisation, setActualisation] = useState(false);
  const [erreur, setErreur] = useState("");
  const [messageSucces, setMessageSucces] = useState("");

  const chargerCompte = useCallback(async (chargementInitial = false) => {
    try {
      if (chargementInitial) {
        setChargement(true);
      } else {
        setActualisation(true);
      }

      setErreur("");
      setMessageSucces("");

      const resultat = await chargerContexteEntreprise();

      if (resultat.erreur || !resultat.contexte) {
        throw new Error(
          resultat.erreur ||
            "Impossible de charger les informations du compte."
        );
      }

      setContexte(resultat.contexte as ContexteCompte);

      if (!chargementInitial) {
        setMessageSucces("Informations du compte actualisées.");
      }
    } catch (error: unknown) {
      console.error("Erreur page compte :", error);
      setErreur(
        error instanceof Error && error.message
          ? error.message
          : "Impossible de charger les informations du compte."
      );
    } finally {
      setChargement(false);
      setActualisation(false);
    }
  }, []);

  useEffect(() => {
    void chargerCompte(true);
  }, [chargerCompte]);

  const abonnementBloque = useMemo(
    () =>
      contexte ? abonnementEstBloque(contexte.entreprise) : false,
    [contexte]
  );

  if (chargement) {
    return (
      <div className="min-h-screen bg-slate-50 px-3 py-5 sm:px-4 sm:py-6">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-2xl">
              ⏳
            </div>
            <p className="font-semibold text-slate-950">
              Chargement de votre compte…
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Récupération du profil, de l’entreprise et de l’abonnement.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (erreur || !contexte) {
    return (
      <div className="min-h-screen bg-slate-50 px-3 py-5 sm:px-4 sm:py-6">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-2xl">
              ⚠️
            </div>
            <h1 className="mt-4 text-xl font-black text-red-700">
              Compte indisponible
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {erreur || "Impossible de charger votre compte."}
            </p>
            <button
              type="button"
              onClick={() => void chargerCompte(true)}
              className="mt-5 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700"
            >
              Réessayer
            </button>
          </div>
        </div>
      </div>
    );
  }

  const profil = contexte.profil;
  const entreprise = contexte.entreprise;

  return (
    <div className="min-h-screen bg-slate-50 px-3 py-5 sm:px-4 sm:py-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="h-1.5 bg-emerald-600" />

          <div className="bg-gradient-to-br from-emerald-50 via-white to-white p-5 sm:p-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-lg font-black text-white shadow-sm">
                  {initiales(profil)}
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600">
                    Mon compte
                  </p>
                  <h1 className="mt-1 break-words text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                    {nomComplet(profil)}
                  </h1>
                  <p className="mt-2 break-all text-sm text-slate-500">
                    {profil.email || "Adresse email non renseignée"}
                  </p>
                </div>
              </div>

              <div className="grid w-full gap-2 sm:grid-cols-2 lg:w-auto">
                <button
                  type="button"
                  onClick={() => void chargerCompte(false)}
                  disabled={actualisation}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span aria-hidden="true">↻</span>
                  {actualisation ? "Actualisation…" : "Actualiser"}
                </button>

                <Link
                  href="/chef/profil"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                >
                  <span aria-hidden="true">✏️</span>
                  Modifier mon profil
                </Link>
              </div>
            </div>
          </div>
        </header>

        {messageSucces && (
          <div
            role="status"
            className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700"
          >
            {messageSucces}
          </div>
        )}

        {abonnementBloque && (
          <section className="rounded-3xl border border-red-200 bg-red-50 p-5 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-red-600">
                  Abonnement à régulariser
                </p>
                <h2 className="mt-1 text-lg font-black text-red-950">
                  L’accès à certaines fonctions est actuellement limité
                </h2>
                <p className="mt-2 text-sm leading-6 text-red-700">
                  Consultez la page abonnement pour vérifier l’offre et la situation de facturation.
                </p>
              </div>

              <Link
                href="/chef/abonnement"
                className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-2xl bg-red-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-800"
              >
                Voir l’abonnement
              </Link>
            </div>
          </section>
        )}

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Entreprise
            </p>
            <p className="mt-2 break-words text-lg font-black text-slate-950">
              {entreprise.nom_entreprise || "Entreprise"}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Rôle
            </p>
            <p className="mt-2 text-lg font-black capitalize text-slate-950">
              {profil.role || "Chef"}
            </p>
          </div>

          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
              Offre actuelle
            </p>
            <p className="mt-2 text-lg font-black capitalize text-emerald-950">
              Plan {entreprise.plan_abonnement || "essai"}
            </p>
          </div>

          <div
            className={`rounded-3xl border p-5 shadow-sm ${
              abonnementBloque
                ? "border-red-200 bg-red-50"
                : "border-blue-200 bg-blue-50"
            }`}
          >
            <p
              className={`text-xs font-semibold uppercase tracking-wide ${
                abonnementBloque ? "text-red-600" : "text-blue-600"
              }`}
            >
              Statut abonnement
            </p>
            <p
              className={`mt-2 text-lg font-black ${
                abonnementBloque ? "text-red-950" : "text-blue-950"
              }`}
            >
              {libelleStatutAbonnement(entreprise.statut_abonnement)}
            </p>
          </div>
        </section>

        <section>
          <div className="mb-3">
            <h2 className="text-lg font-black text-slate-950">
              Gestion du compte
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Accédez directement aux informations et réglages de votre espace.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {CARTES.map((carte) => {
              const styles = classeCarte(carte.couleur);

              return (
                <Link
                  key={carte.href}
                  href={carte.href}
                  className={`group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-6 ${styles.bordure}`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xl ${styles.icone}`}
                    >
                      {carte.emoji}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg font-black text-slate-950">
                        {carte.titre}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {carte.description}
                      </p>
                      <p className={`mt-4 text-sm font-semibold ${styles.action}`}>
                        {carte.action} →
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <section
          id="a-propos"
          className="scroll-mt-24 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="border-b border-slate-200 bg-slate-50 p-5 sm:p-6">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600">
              À propos
            </p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">
              Arboboard
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              Solution de gestion destinée aux paysagistes, élagueurs et entreprises d’espaces verts : clients, devis, factures, interventions, équipes et planning dans un espace unique.
            </p>
          </div>

          <div className="grid gap-3 p-5 sm:grid-cols-3 sm:p-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Version
              </p>
              <p className="mt-2 text-sm font-black text-slate-900">V1 Web</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Application
              </p>
              <p className="mt-2 text-sm font-black text-slate-900">
                arboboard.fr
              </p>
            </div>

            <a
              href="mailto:contact@arboboard.fr"
              className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-emerald-300 hover:bg-emerald-50"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Support
              </p>
              <p className="mt-2 text-sm font-black text-emerald-700">
                contact@arboboard.fr
              </p>
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}