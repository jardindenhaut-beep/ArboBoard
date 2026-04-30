"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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

export default function AbonnementChefPage() {
  const router = useRouter();

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
  }, []);

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
    setMessage(`Test Stripe lancé pour le plan : ${plan}`);

    try {
      const {
        data: { session },
        error: erreurSession,
      } = await supabase.auth.getSession();

      if (erreurSession || !session?.access_token) {
        setMessage(
          `Erreur session : ${
            erreurSession?.message || "Aucun token chef trouvé."
          }`
        );
        setSelection(false);
        return;
      }

      setMessage("Session chef OK. Appel de l'API Stripe...");

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

      const texteBrut = await response.text();

      let resultat: any = {};

      try {
        resultat = JSON.parse(texteBrut);
      } catch {
        setMessage(
          `L'API n'a pas répondu en JSON. Réponse brute : ${texteBrut.slice(
            0,
            300
          )}`
        );
        setSelection(false);
        return;
      }

      if (!response.ok) {
        setMessage(
          `Erreur API Stripe : ${
            resultat.error || "Erreur inconnue"
          } ${resultat.detail ? `— ${resultat.detail}` : ""}`
        );
        setSelection(false);
        return;
      }

      if (!resultat.url) {
        setMessage(
          `API OK mais aucune URL Stripe reçue. Réponse : ${JSON.stringify(
            resultat
          )}`
        );
        setSelection(false);
        return;
      }

      setMessage("URL Stripe reçue. Redirection en cours...");
      window.location.href = resultat.url;
    } catch (error) {
      setMessage(
        error instanceof Error
          ? `Erreur JS : ${error.message}`
          : "Erreur inconnue lors de l'ouverture Stripe."
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

          <div className="mt-6 rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
            Le bouton ouvre maintenant la page de paiement sécurisée Stripe.
            Si Stripe ne s’ouvre pas, un message d’erreur détaillé s’affichera
            au-dessus de la page.
          </div>
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