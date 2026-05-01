"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  abonnementEstBloque,
  chargerContexteEntreprise,
  joursRestantsEssai,
} from "@/lib/entreprise";

type PlanAbonnement = {
  code: string;
  nom: string;
  emoji: string;
  badge: string;
  description: string;
  prix_mensuel_ht: number;
  prix_annuel_ht: number;
  max_utilisateurs: number;
  max_salaries: number;
  max_clients: number;
  max_chantiers: number;
  devis_factures: boolean;
  planning_equipe: boolean;
  chantiers: boolean;
  materiel: boolean;
  pointage: boolean;
  exports: boolean;
  kpi_avances: boolean;
  support_prioritaire: boolean;
  fonctionnalites: string[];
  ordre: number;
};

type ReponseApiStripe = {
  success?: boolean;
  url?: string;
  error?: string;
  detail?: string;
  sessionId?: string;
};

export default function AbonnementChefPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [nomEntreprise, setNomEntreprise] = useState("");
  const [emailContact, setEmailContact] = useState("");
  const [telephone, setTelephone] = useState("");
  const [planAbonnement, setPlanAbonnement] = useState("");
  const [planSouhaite, setPlanSouhaite] = useState("");
  const [statutAbonnement, setStatutAbonnement] = useState("");
  const [slug, setSlug] = useState("");
  const [dateDebutEssai, setDateDebutEssai] = useState<string | null>(null);
  const [dateFinEssai, setDateFinEssai] = useState<string | null>(null);
  const [joursEssai, setJoursEssai] = useState<number | null>(null);
  const [bloque, setBloque] = useState(false);

  const [plans, setPlans] = useState<PlanAbonnement[]>([]);
  const [chargement, setChargement] = useState(true);
  const [selection, setSelection] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    chargerPage();

    const retourStripe = searchParams.get("stripe");
    const retourPortal = searchParams.get("portal");

    if (retourStripe === "success") {
      setMessage(
        "Paiement validé ✅ Ton abonnement est en cours d’activation. Si ce n’est pas encore affiché, recharge la page dans quelques secondes."
      );
    }

    if (retourStripe === "cancel") {
      setMessage("Paiement annulé. Aucun abonnement n’a été activé.");
    }

    if (retourPortal === "return") {
      setMessage("Retour du portail Stripe. Tes informations d’abonnement ont été prises en compte.");
    }
  }, [searchParams]);

  async function chargerPage() {
    setChargement(true);
    setMessage("");

    await Promise.all([chargerAbonnement(), chargerPlans()]);

    setChargement(false);
  }

  async function chargerAbonnement() {
    const { contexte, erreur } = await chargerContexteEntreprise();

    if (erreur || !contexte) {
      setMessage(erreur || "Impossible de charger l'abonnement.");

      setTimeout(() => {
        router.push("/connexion");
      }, 1200);

      return;
    }

    if (contexte.profil.role !== "chef") {
      setMessage("Ce compte n'est pas un compte chef.");

      setTimeout(() => {
        router.push("/connexion");
      }, 1200);

      return;
    }

    setNomEntreprise(contexte.entreprise.nom_entreprise || "");
    setEmailContact(contexte.entreprise.email_contact || "");
    setTelephone(contexte.entreprise.telephone || "");
    setPlanAbonnement(contexte.entreprise.plan_abonnement || "essai");
    setPlanSouhaite(contexte.entreprise.plan_souhaite || "");
    setStatutAbonnement(contexte.entreprise.statut_abonnement || "essai");
    setSlug(contexte.entreprise.slug || "");
    setDateDebutEssai(contexte.entreprise.date_debut_essai || null);
    setDateFinEssai(contexte.entreprise.date_fin_essai || null);
    setJoursEssai(
      joursRestantsEssai(contexte.entreprise.date_fin_essai || null)
    );
    setBloque(abonnementEstBloque(contexte.entreprise));
  }

  async function chargerPlans() {
    const { data, error } = await supabase
      .from("plans_abonnement")
      .select("*")
      .eq("actif", true)
      .order("ordre", { ascending: true });

    if (error) {
      setMessage(error.message || "Impossible de charger les plans.");
      return;
    }

    setPlans((data || []) as PlanAbonnement[]);
  }

  async function choisirPlan(plan: string) {
    setSelection(true);
    setMessage("Ouverture de Stripe Checkout...");

    try {
      const {
        data: { session },
        error: erreurSession,
      } = await supabase.auth.getSession();

      if (erreurSession || !session?.access_token) {
        setMessage("Session chef introuvable. Reconnecte-toi.");
        setSelection(false);
        return;
      }

      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          plan,
          frequence: "mensuel",
        }),
      });

      const resultat = (await response.json()) as ReponseApiStripe;

      if (!response.ok) {
        setMessage(
          resultat.error ||
            "Impossible d'ouvrir le paiement Stripe pour ce plan."
        );
        setSelection(false);
        return;
      }

      if (!resultat.url) {
        setMessage("Stripe n'a pas renvoyé d'URL de paiement.");
        setSelection(false);
        return;
      }

      window.location.href = resultat.url;
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Erreur inconnue lors de l'ouverture Stripe."
      );
      setSelection(false);
    }
  }

  async function gererAbonnement() {
    setSelection(true);
    setMessage("Ouverture du portail Stripe...");

    try {
      const {
        data: { session },
        error: erreurSession,
      } = await supabase.auth.getSession();

      if (erreurSession || !session?.access_token) {
        setMessage("Session chef introuvable. Reconnecte-toi.");
        setSelection(false);
        return;
      }

      const response = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const resultat = (await response.json()) as ReponseApiStripe;

      if (!response.ok) {
        setMessage(
          resultat.error ||
            "Impossible d'ouvrir le portail de gestion Stripe."
        );
        setSelection(false);
        return;
      }

      if (!resultat.url) {
        setMessage("Stripe n'a pas renvoyé d'URL de portail.");
        setSelection(false);
        return;
      }

      window.location.href = resultat.url;
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Erreur inconnue lors de l'ouverture du portail Stripe."
      );
      setSelection(false);
    }
  }

  function labelStatut(statut: string) {
    if (statut === "actif") {
      return "Actif";
    }

    if (statut === "essai") {
      return "Essai gratuit";
    }

    if (statut === "suspendu") {
      return "Suspendu";
    }

    if (statut === "annule" || statut === "annulé") {
      return "Annulé";
    }

    if (statut === "dev") {
      return "Développement";
    }

    return statut || "Non défini";
  }

  function labelPlan(plan: string) {
    if (plan === "essentiel") {
      return "Essentiel";
    }

    if (plan === "pro") {
      return "Pro";
    }

    if (plan === "expert") {
      return "Expert";
    }

    if (plan === "essai") {
      return "Essai";
    }

    if (plan === "dev") {
      return "Développement";
    }

    return plan || "Non défini";
  }

  function afficherDate(date: string | null) {
    if (!date) {
      return "—";
    }

    return new Date(date).toLocaleDateString("fr-FR");
  }

  function formatPrix(nombre: number) {
    return Number(nombre || 0).toLocaleString("fr-FR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function couleurStatut() {
    if (bloque) {
      return "bg-red-700";
    }

    if (statutAbonnement === "actif" || statutAbonnement === "dev") {
      return "bg-green-700";
    }

    if (statutAbonnement === "essai") {
      return "bg-slate-900";
    }

    return "bg-orange-700";
  }

  function texteAlerte() {
    if (statutAbonnement === "dev") {
      return "Mode développement actif : aucune limitation d'abonnement.";
    }

    if (statutAbonnement === "actif") {
      return "Ton abonnement est actif. Toutes les fonctionnalités sont disponibles.";
    }

    if (statutAbonnement === "essai" && bloque) {
      return "Ton essai gratuit est terminé. L'accès aux fonctionnalités est limité jusqu'à activation d'un abonnement.";
    }

    if (statutAbonnement === "essai" && joursEssai !== null) {
      return `Ton essai gratuit est actif. Il reste ${joursEssai} jour${
        joursEssai > 1 ? "s" : ""
      } d'essai.`;
    }

    if (statutAbonnement === "suspendu") {
      return "Ton abonnement est suspendu. L'accès aux fonctionnalités est limité.";
    }

    if (statutAbonnement === "annule" || statutAbonnement === "annulé") {
      return "Ton abonnement est annulé. L'accès aux fonctionnalités est limité.";
    }

    return "Statut d'abonnement à vérifier.";
  }

  function boutonPlan(plan: PlanAbonnement) {
    if (selection) {
      return "Ouverture Stripe...";
    }

    if (planAbonnement === plan.code && statutAbonnement === "actif") {
      return "Plan actuel";
    }

    return `Choisir ${plan.nom}`;
  }

  function boutonDesactive(plan: PlanAbonnement) {
    return (
      selection ||
      (planAbonnement === plan.code && statutAbonnement === "actif")
    );
  }

  if (chargement) {
    return (
      <main className="min-h-screen bg-slate-100 p-8">
        <p className="text-slate-700">Chargement de l&apos;abonnement...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Abonnement</h1>

          <p className="mt-2 text-slate-600">
            Consulte ton essai gratuit et choisis le plan SaaS de ton entreprise.
          </p>
        </div>

        {message && (
          <p className="mb-6 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-800">
            {message}
          </p>
        )}

        <div
          className={
            bloque
              ? "mb-8 rounded-2xl bg-red-50 p-6 text-red-900 shadow-sm"
              : "mb-8 rounded-2xl bg-green-50 p-6 text-green-900 shadow-sm"
          }
        >
          <h2 className="text-xl font-bold">
            {bloque ? "Accès limité" : "Accès autorisé"}
          </h2>

          <p className="mt-2 text-sm">{texteAlerte()}</p>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">Entreprise</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {nomEntreprise || "Entreprise"}
            </p>

            {slug && (
              <p className="mt-2 text-sm text-slate-500">
                Identifiant : {slug}
              </p>
            )}
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">Plan actuel</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {labelPlan(planAbonnement)}
            </p>

            {planSouhaite && (
              <p className="mt-2 text-sm text-slate-500">
                Plan souhaité : {labelPlan(planSouhaite)}
              </p>
            )}
          </div>

          <div className={`rounded-2xl p-6 text-white shadow-sm ${couleurStatut()}`}>
            <p className="text-sm text-white/80">Statut</p>
            <p className="mt-2 text-2xl font-bold">
              {labelStatut(statutAbonnement)}
            </p>
          </div>
        </div>

        {statutAbonnement === "actif" && (
          <div className="mb-8 rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">
              Gestion de mon abonnement
            </h2>

            <p className="mt-2 text-sm text-slate-600">
              Accède au portail sécurisé Stripe pour modifier ton moyen de paiement,
              consulter tes factures ou gérer ton abonnement.
            </p>

            <button
              onClick={gererAbonnement}
              disabled={selection}
              className="mt-5 rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {selection ? "Ouverture..." : "Gérer mon abonnement"}
            </button>
          </div>
        )}

        <div className="mb-8 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-semibold text-slate-900">
            Essai gratuit
          </h2>

          <div className="grid gap-5 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Début essai
              </label>

              <input
                value={afficherDate(dateDebutEssai)}
                readOnly
                className="w-full rounded-xl border border-slate-300 bg-slate-100 px-4 py-3 text-slate-700 outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Fin essai
              </label>

              <input
                value={afficherDate(dateFinEssai)}
                readOnly
                className="w-full rounded-xl border border-slate-300 bg-slate-100 px-4 py-3 text-slate-700 outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Jours restants
              </label>

              <input
                value={
                  joursEssai === null
                    ? "—"
                    : `${joursEssai} jour${joursEssai > 1 ? "s" : ""}`
                }
                readOnly
                className="w-full rounded-xl border border-slate-300 bg-slate-100 px-4 py-3 text-slate-700 outline-none"
              />
            </div>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="mb-5 text-xl font-semibold text-slate-900">
            Choisir un plan
          </h2>

          {plans.length === 0 ? (
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <p className="text-slate-600">
                Aucun plan disponible pour le moment.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 lg:grid-cols-3">
              {plans.map((plan) => (
                <div
                  key={plan.code}
                  className={
                    plan.code === "pro"
                      ? "rounded-3xl border-2 border-slate-900 bg-white p-6 shadow-md"
                      : "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                  }
                >
                  <div className="mb-5 flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-2xl font-bold text-slate-900">
                        <span className="mr-2">{plan.emoji}</span>
                        {plan.nom}
                      </h3>

                      {plan.badge && (
                        <p className="mt-2 inline-block rounded-full bg-yellow-100 px-3 py-1 text-sm font-semibold text-yellow-800">
                          ⭐ {plan.badge}
                        </p>
                      )}
                    </div>
                  </div>

                  <p className="min-h-16 text-sm text-slate-600">
                    {plan.description}
                  </p>

                  <div className="mt-6">
                    <p className="text-4xl font-bold text-slate-900">
                      {formatPrix(plan.prix_mensuel_ht)} €
                    </p>

                    <p className="text-sm text-slate-500">HT / mois</p>
                  </div>

                  <div className="mt-5 rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
                    {plan.max_utilisateurs} utilisateur
                    {plan.max_utilisateurs > 1 ? "s" : ""} inclus
                  </div>

                  <ul className="mt-6 grid gap-3 text-sm text-slate-700">
                    {(plan.fonctionnalites || []).map((fonction) => (
                      <li key={fonction} className="flex gap-2">
                        <span className="font-bold text-green-700">✓</span>
                        <span>{fonction}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => choisirPlan(plan.code)}
                    disabled={boutonDesactive(plan)}
                    className={
                      plan.code === "pro"
                        ? "mt-6 w-full rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
                        : "mt-6 w-full rounded-xl bg-slate-200 px-5 py-3 font-semibold text-slate-800 hover:bg-slate-300 disabled:opacity-50"
                    }
                  >
                    {boutonPlan(plan)}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mb-8 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-semibold text-slate-900">
            Informations de contact
          </h2>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Email contact
              </label>

              <input
                value={emailContact || "Non renseigné"}
                readOnly
                className="w-full rounded-xl border border-slate-300 bg-slate-100 px-4 py-3 text-slate-700 outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Téléphone
              </label>

              <input
                value={telephone || "Non renseigné"}
                readOnly
                className="w-full rounded-xl border border-slate-300 bg-slate-100 px-4 py-3 text-slate-700 outline-none"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/chef/parametres"
            className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-700"
          >
            Paramètres entreprise
          </Link>

          <Link
            href="/chef/profil"
            className="rounded-xl bg-slate-200 px-5 py-3 font-semibold text-slate-800 hover:bg-slate-300"
          >
            Profil chef
          </Link>

          <Link
            href="/chef/dashboard"
            className="rounded-xl bg-slate-200 px-5 py-3 font-semibold text-slate-800 hover:bg-slate-300"
          >
            Retour dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}