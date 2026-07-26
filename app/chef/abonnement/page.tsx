"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  abonnementEstBloque,
  chargerContexteEntreprise,
  joursRestantsAbonnement,
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

type TypeMessage =
  | "information"
  | "succes"
  | "erreur"
  | "avertissement";

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
  const [dateFinAbonnement, setDateFinAbonnement] = useState<string | null>(
    null
  );

  const [joursEssai, setJoursEssai] = useState<number | null>(null);
  const [joursAbonnement, setJoursAbonnement] = useState<number | null>(null);
  const [bloque, setBloque] = useState(false);

  const [plans, setPlans] = useState<PlanAbonnement[]>([]);
  const [chargement, setChargement] = useState(true);
  const [actualisation, setActualisation] = useState(false);
  const [selection, setSelection] = useState(false);
  const [planEnSelection, setPlanEnSelection] = useState("");
  const [message, setMessage] = useState("");
  const [typeMessage, setTypeMessage] =
    useState<TypeMessage>("information");
  const [acceptationCgv, setAcceptationCgv] =
    useState(false);

  const chargerPage = useCallback(
    async (chargementInitial = false) => {
      try {
        if (chargementInitial) {
          setChargement(true);
        } else {
          setActualisation(true);
        }

        if (!chargementInitial) {
          setMessage("");
          setTypeMessage("information");
        }

        await Promise.all([
          chargerAbonnement(),
          chargerPlans(),
        ]);

        if (!chargementInitial) {
          setMessage(
            "Les informations d’abonnement ont été actualisées."
          );
          setTypeMessage("succes");
        }
      } finally {
        setChargement(false);
        setActualisation(false);
      }
    },
    []
  );

  useEffect(() => {
    void chargerPage(true);

    const params = new URLSearchParams(
      window.location.search
    );

    const retourStripe = params.get("stripe");
    const retourPortal = params.get("portal");

    if (retourStripe === "success") {
      setMessage(
        "Paiement validé. L’abonnement est en cours d’activation. Actualisez la page dans quelques secondes si le nouveau plan n’apparaît pas encore."
      );
      setTypeMessage("succes");
    }

    if (retourStripe === "cancel") {
      setMessage(
        "Paiement annulé. Aucun abonnement n’a été activé."
      );
      setTypeMessage("avertissement");
    }

    if (retourPortal === "return") {
      setMessage(
        "Retour du portail Stripe. Les informations d’abonnement ont été prises en compte."
      );
      setTypeMessage("succes");
    }
  }, [chargerPage]);

  async function chargerAbonnement() {
    const { contexte, erreur } = await chargerContexteEntreprise();

    if (erreur || !contexte) {
      setMessage(
        erreur || "Impossible de charger l’abonnement."
      );
      setTypeMessage("erreur");

      window.setTimeout(() => {
        router.push("/connexion");
      }, 1200);

      return;
    }

    const roleNormalise = String(
      contexte.profil.role || ""
    )
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase();

    if (
      ![
        "chef",
        "admin",
        "administrateur",
        "gerant",
        "dirigeant",
        "patron",
      ].includes(roleNormalise)
    ) {
      setMessage(
        "Ce compte n’est pas autorisé à gérer l’abonnement."
      );
      setTypeMessage("erreur");

      window.setTimeout(() => {
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
    setDateFinAbonnement(contexte.entreprise.date_fin_abonnement || null);

    setJoursEssai(
      joursRestantsEssai(contexte.entreprise.date_fin_essai || null)
    );

    setJoursAbonnement(
      joursRestantsAbonnement(contexte.entreprise.date_fin_abonnement || null)
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
      setMessage(
        error.message ||
          "Impossible de charger les plans."
      );
      setTypeMessage("erreur");
      return;
    }

    setPlans((data || []) as PlanAbonnement[]);
  }

  async function choisirPlan(plan: string) {
    if (!acceptationCgv) {
      setMessage(
        "Vous devez accepter les Conditions générales de vente avant de choisir un plan."
      );
      setTypeMessage("avertissement");
      return;
    }

    setSelection(true);
    setPlanEnSelection(plan);
    setMessage("Ouverture du paiement sécurisé Stripe…");
    setTypeMessage("information");

    try {
      const {
        data: { session },
        error: erreurSession,
      } = await supabase.auth.getSession();

      if (erreurSession || !session?.access_token) {
        setMessage(
          "Session chef introuvable. Veuillez vous reconnecter."
        );
        setTypeMessage("erreur");
        setSelection(false);
        setPlanEnSelection("");
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
          acceptation_cgv: true,
        }),
      });

      const resultat = (await response.json()) as ReponseApiStripe;

      if (!response.ok) {
        setMessage(
          resultat.error ||
            "Impossible d’ouvrir le paiement Stripe pour ce plan."
        );
        setTypeMessage("erreur");
        setSelection(false);
        setPlanEnSelection("");
        return;
      }

      if (!resultat.url) {
        setMessage(
          "Stripe n’a pas renvoyé d’URL de paiement."
        );
        setTypeMessage("erreur");
        setSelection(false);
        setPlanEnSelection("");
        return;
      }

      window.location.href = resultat.url;
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Erreur inconnue lors de l’ouverture de Stripe."
      );
      setTypeMessage("erreur");
      setSelection(false);
      setPlanEnSelection("");
    }
  }

  async function gererAbonnement() {
    setSelection(true);
    setPlanEnSelection("");
    setMessage("Ouverture du portail sécurisé Stripe…");
    setTypeMessage("information");

    try {
      const {
        data: { session },
        error: erreurSession,
      } = await supabase.auth.getSession();

      if (erreurSession || !session?.access_token) {
        setMessage(
          "Session chef introuvable. Veuillez vous reconnecter."
        );
        setTypeMessage("erreur");
        setSelection(false);
        setPlanEnSelection("");
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
            "Impossible d’ouvrir le portail de gestion Stripe."
        );
        setTypeMessage("erreur");
        setSelection(false);
        return;
      }

      if (!resultat.url) {
        setMessage(
          "Stripe n’a pas renvoyé d’URL de portail."
        );
        setTypeMessage("erreur");
        setSelection(false);
        return;
      }

      window.location.href = resultat.url;
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Erreur inconnue lors de l’ouverture du portail Stripe."
      );
      setTypeMessage("erreur");
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

    if (statutAbonnement === "actif" && dateFinAbonnement && !bloque) {
      return `Ton abonnement reste actif jusqu’au ${afficherDate(
        dateFinAbonnement
      )}.`;
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

  const planActuelDetails = useMemo(
    () =>
      plans.find(
        (plan) => plan.code === planAbonnement
      ) || null,
    [planAbonnement, plans]
  );

  function classeMessage() {
    if (typeMessage === "succes") {
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    }

    if (typeMessage === "erreur") {
      return "border-red-200 bg-red-50 text-red-700";
    }

    if (typeMessage === "avertissement") {
      return "border-amber-200 bg-amber-50 text-amber-800";
    }

    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  function styleCartePlan(plan: PlanAbonnement) {
    const actuel =
      planAbonnement === plan.code &&
      statutAbonnement === "actif";

    if (actuel) {
      return "border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-100";
    }

    if (plan.code === "pro") {
      return "border-slate-900 bg-white ring-1 ring-slate-900";
    }

    return "border-slate-200 bg-white";
  }

  function boutonPlan(plan: PlanAbonnement) {
    if (selection && planEnSelection === plan.code) {
      return "Ouverture de Stripe…";
    }

    if (selection) {
      return "Veuillez patienter…";
    }

    if (planAbonnement === plan.code && statutAbonnement === "actif") {
      return "Plan actuel";
    }

    return `Choisir ${plan.nom}`;
  }

  function boutonDesactive(plan: PlanAbonnement) {
    return (
      selection ||
      !acceptationCgv ||
      (planAbonnement === plan.code && statutAbonnement === "actif")
    );
  }

  if (chargement) {
    return (
      <div className="min-h-screen bg-slate-50 px-3 py-5 sm:px-4 sm:py-6">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-2xl">
              ⏳
            </div>

            <p className="font-semibold text-slate-950">
              Chargement de l’abonnement…
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Récupération de votre offre et des plans disponibles.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-3 py-5 sm:px-4 sm:py-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="h-1.5 bg-emerald-600" />

          <div className="bg-gradient-to-br from-emerald-50 via-white to-white p-5 sm:p-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-2xl text-white shadow-sm">
                  💳
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600">
                    Mon compte
                  </p>

                  <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                    Abonnement
                  </h1>

                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                    Consultez l’offre de {nomEntreprise || "votre entreprise"},
                    gérez la facturation Stripe et choisissez le plan adapté à
                    votre équipe.
                  </p>
                </div>
              </div>

              <div className="grid w-full gap-2 sm:grid-cols-2 lg:w-auto">
                <button
                  type="button"
                  onClick={() => void chargerPage(false)}
                  disabled={actualisation || selection}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span aria-hidden="true">↻</span>
                  {actualisation ? "Actualisation…" : "Actualiser"}
                </button>

                <Link
                  href="/chef/compte"
                  className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
                >
                  ← Mon compte
                </Link>
              </div>
            </div>
          </div>
        </header>

        {message && (
          <div
            role={typeMessage === "erreur" ? "alert" : "status"}
            className={`rounded-2xl border px-4 py-3 text-sm font-medium ${classeMessage()}`}
          >
            {message}
          </div>
        )}

        <section
          className={`rounded-3xl border p-5 shadow-sm sm:p-6 ${
            bloque
              ? "border-red-200 bg-red-50"
              : statutAbonnement === "essai"
                ? "border-blue-200 bg-blue-50"
                : "border-emerald-200 bg-emerald-50"
          }`}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p
                className={`text-xs font-bold uppercase tracking-wide ${
                  bloque
                    ? "text-red-600"
                    : statutAbonnement === "essai"
                      ? "text-blue-600"
                      : "text-emerald-600"
                }`}
              >
                État de l’accès
              </p>

              <h2
                className={`mt-1 text-xl font-black ${
                  bloque
                    ? "text-red-950"
                    : statutAbonnement === "essai"
                      ? "text-blue-950"
                      : "text-emerald-950"
                }`}
              >
                {bloque ? "Accès limité" : "Accès autorisé"}
              </h2>

              <p
                className={`mt-2 max-w-4xl text-sm leading-6 ${
                  bloque
                    ? "text-red-700"
                    : statutAbonnement === "essai"
                      ? "text-blue-700"
                      : "text-emerald-700"
                }`}
              >
                {texteAlerte()}
              </p>
            </div>

            <span
              className={`w-fit rounded-full border px-3 py-1.5 text-xs font-bold ${
                bloque
                  ? "border-red-200 bg-white text-red-700"
                  : "border-emerald-200 bg-white text-emerald-700"
              }`}
            >
              {labelStatut(statutAbonnement)}
            </span>
          </div>
        </section>

        {statutAbonnement === "actif" &&
          dateFinAbonnement &&
          !bloque && (
            <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm sm:p-6">
              <p className="text-xs font-bold uppercase tracking-wide text-amber-600">
                Fin de période programmée
              </p>

              <h2 className="mt-1 text-lg font-black text-amber-950">
                Accès maintenu jusqu’au{" "}
                {afficherDate(dateFinAbonnement)}
              </h2>

              <p className="mt-2 text-sm leading-6 text-amber-800">
                L’abonnement a été résilié, mais toutes les fonctionnalités
                restent accessibles jusqu’à la fin de la période déjà payée.
              </p>

              {joursAbonnement !== null && (
                <p className="mt-3 text-sm font-bold text-amber-900">
                  Il reste {joursAbonnement} jour
                  {joursAbonnement === 1 ? "" : "s"} d’accès.
                </p>
              )}
            </section>
          )}

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Entreprise
            </p>

            <p className="mt-2 break-words text-lg font-black text-slate-950">
              {nomEntreprise || "Entreprise"}
            </p>

            {slug && (
              <p className="mt-1 break-all text-xs text-slate-500">
                Identifiant : {slug}
              </p>
            )}
          </div>

          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
              Plan actuel
            </p>

            <p className="mt-2 text-lg font-black text-emerald-950">
              {labelPlan(planAbonnement)}
            </p>

            {planActuelDetails && (
              <p className="mt-1 text-xs font-semibold text-emerald-700">
                {formatPrix(planActuelDetails.prix_mensuel_ht)} € HT / mois
              </p>
            )}
          </div>

          <div
            className={`rounded-3xl border p-5 shadow-sm ${
              bloque
                ? "border-red-200 bg-red-50"
                : "border-blue-200 bg-blue-50"
            }`}
          >
            <p
              className={`text-xs font-semibold uppercase tracking-wide ${
                bloque ? "text-red-600" : "text-blue-600"
              }`}
            >
              Statut
            </p>

            <p
              className={`mt-2 text-lg font-black ${
                bloque ? "text-red-950" : "text-blue-950"
              }`}
            >
              {labelStatut(statutAbonnement)}
            </p>

            {planSouhaite && (
              <p
                className={`mt-1 text-xs font-semibold ${
                  bloque ? "text-red-700" : "text-blue-700"
                }`}
              >
                Plan souhaité : {labelPlan(planSouhaite)}
              </p>
            )}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Utilisateurs inclus
            </p>

            <p className="mt-2 text-lg font-black text-slate-950">
              {planActuelDetails?.max_utilisateurs ?? "—"}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Selon le plan actuellement enregistré
            </p>
          </div>
        </section>

        {statutAbonnement === "actif" && (
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-950">
                  Gestion de l’abonnement
                </h2>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  Ouvrez le portail sécurisé Stripe pour modifier le moyen de
                  paiement, consulter les factures Stripe ou gérer
                  l’abonnement.
                </p>
              </div>

              <button
                type="button"
                onClick={() => void gererAbonnement()}
                disabled={selection}
                className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {selection && !planEnSelection
                  ? "Ouverture…"
                  : "Gérer mon abonnement"}
              </button>
            </div>
          </section>
        )}

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50 p-5 sm:p-6">
            <h2 className="text-lg font-black text-slate-950">
              Essai gratuit
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Période d’essai associée à cette entreprise.
            </p>
          </div>

          <div className="grid gap-3 p-5 sm:grid-cols-3 sm:p-6">
            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Début de l’essai
              </p>

              <p className="mt-2 font-black text-slate-950">
                {afficherDate(dateDebutEssai)}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Fin de l’essai
              </p>

              <p className="mt-2 font-black text-slate-950">
                {afficherDate(dateFinEssai)}
              </p>
            </div>

            <div
              className={`rounded-2xl border p-4 ${
                statutAbonnement === "essai" && bloque
                  ? "border-red-200 bg-red-50"
                  : "border-blue-200 bg-blue-50"
              }`}
            >
              <p
                className={`text-xs font-semibold uppercase tracking-wide ${
                  statutAbonnement === "essai" && bloque
                    ? "text-red-600"
                    : "text-blue-600"
                }`}
              >
                Jours restants
              </p>

              <p
                className={`mt-2 font-black ${
                  statutAbonnement === "essai" && bloque
                    ? "text-red-950"
                    : "text-blue-950"
                }`}
              >
                {joursEssai === null
                  ? "—"
                  : `${joursEssai} jour${joursEssai === 1 ? "" : "s"}`}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-violet-200 bg-violet-50 p-5 shadow-sm sm:p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-xl">
              📄
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-black text-violet-950">
                Conditions de souscription
              </h2>

              <p className="mt-2 text-sm leading-6 text-violet-800">
                Avant d’ouvrir le paiement Stripe, vous devez accepter
                les Conditions générales de vente actuellement publiées.
                Cette acceptation est enregistrée avec sa version et son
                horodatage.
              </p>

              <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border border-violet-200 bg-white p-4">
                <input
                  type="checkbox"
                  checked={acceptationCgv}
                  onChange={(event) => {
                    setAcceptationCgv(
                      event.target.checked
                    );
                    setMessage("");
                  }}
                  disabled={selection}
                  className="mt-1 h-4 w-4 rounded border-violet-300"
                />

                <span className="text-sm leading-6 text-slate-700">
                  J’accepte les{" "}
                  <Link
                    href="/cgv"
                    target="_blank"
                    className="font-bold text-violet-800 underline"
                  >
                    Conditions générales de vente
                  </Link>{" "}
                  applicables à l’abonnement sélectionné.
                </span>
              </label>
            </div>
          </div>
        </section>

        <section>
          <div className="mb-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600">
              Offres Arboboard
            </p>

            <h2 className="mt-1 text-2xl font-black text-slate-950">
              Choisir un plan
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Le paiement est réalisé mensuellement via Stripe Checkout.
            </p>
          </div>

          {plans.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-xl">
                💳
              </div>

              <p className="mt-3 font-semibold text-slate-700">
                Aucun plan disponible pour le moment
              </p>
            </div>
          ) : (
            <div className="grid items-stretch gap-5 lg:grid-cols-3">
              {plans.map((plan) => {
                const planActuel =
                  planAbonnement === plan.code &&
                  statutAbonnement === "actif";

                return (
                  <article
                    key={plan.code}
                    className={`relative flex h-full flex-col rounded-3xl border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-6 ${styleCartePlan(
                      plan
                    )}`}
                  >
                    {planActuel && (
                      <span className="absolute right-4 top-4 rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
                        Plan actuel
                      </span>
                    )}

                    <div className="pr-20">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{plan.emoji}</span>

                        <h3 className="text-2xl font-black text-slate-950">
                          {plan.nom}
                        </h3>
                      </div>

                      {plan.badge && (
                        <p className="mt-3 inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                          ⭐ {plan.badge}
                        </p>
                      )}
                    </div>

                    <p className="mt-5 min-h-16 text-sm leading-6 text-slate-600">
                      {plan.description}
                    </p>

                    <div className="mt-5 border-y border-slate-200 py-5">
                      <div className="flex items-end gap-2">
                        <p className="text-4xl font-black tracking-tight text-slate-950">
                          {formatPrix(plan.prix_mensuel_ht)} €
                        </p>

                        <p className="pb-1 text-sm font-semibold text-slate-500">
                          HT / mois
                        </p>
                      </div>

                      {Number(plan.prix_annuel_ht || 0) > 0 && (
                        <p className="mt-2 text-xs text-slate-500">
                          Tarif annuel indicatif :{" "}
                          {formatPrix(plan.prix_annuel_ht)} € HT
                        </p>
                      )}
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-2xl bg-slate-50 p-3">
                        <p className="font-semibold text-slate-400">
                          Utilisateurs
                        </p>
                        <p className="mt-1 font-black text-slate-900">
                          {plan.max_utilisateurs}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-slate-50 p-3">
                        <p className="font-semibold text-slate-400">
                          Salariés
                        </p>
                        <p className="mt-1 font-black text-slate-900">
                          {plan.max_salaries}
                        </p>
                      </div>
                    </div>

                    <ul className="mt-5 flex-1 space-y-3 text-sm text-slate-700">
                      {(plan.fonctionnalites || []).map(
                        (fonction) => (
                          <li key={fonction} className="flex gap-2">
                            <span className="font-black text-emerald-600">
                              ✓
                            </span>
                            <span>{fonction}</span>
                          </li>
                        )
                      )}
                    </ul>

                    <button
                      type="button"
                      onClick={() => void choisirPlan(plan.code)}
                      disabled={boutonDesactive(plan)}
                      className={`mt-6 min-h-12 w-full rounded-2xl px-5 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                        planActuel
                          ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                          : plan.code === "pro"
                            ? "bg-slate-900 text-white hover:bg-slate-700"
                            : "border border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
                      }`}
                    >
                      {boutonPlan(plan)}
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50 p-5 sm:p-6">
            <h2 className="text-lg font-black text-slate-950">
              Informations de contact
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Coordonnées enregistrées pour cette entreprise.
            </p>
          </div>

          <div className="grid gap-3 p-5 sm:grid-cols-2 sm:p-6">
            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Email
              </p>

              <p className="mt-2 break-all text-sm font-black text-slate-900">
                {emailContact || "Non renseigné"}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Téléphone
              </p>

              <p className="mt-2 text-sm font-black text-slate-900">
                {telephone || "Non renseigné"}
              </p>
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Link
            href="/chef/parametres"
            className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Paramètres entreprise
          </Link>

          <Link
            href="/chef/profil"
            className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Profil chef
          </Link>

          <Link
            href="/chef"
            className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Retour au Dashboard
          </Link>
        </section>
      </div>
    </div>
  );
}