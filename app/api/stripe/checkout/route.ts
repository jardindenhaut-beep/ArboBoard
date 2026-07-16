import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

type FrequenceAbonnement = "mensuel" | "annuel";

type BodyCheckout = {
  plan?: unknown;
  frequence?: unknown;
};

function obtenirUrlSite(request: Request) {
  const urlConfiguree =
    process.env.NEXT_PUBLIC_SITE_URL?.trim();

  const origineRequete = new URL(request.url).origin;

  const valeur =
    urlConfiguree && urlConfiguree.length > 0
      ? urlConfiguree
      : origineRequete;

  const valeurAvecProtocole =
    /^https?:\/\//i.test(valeur)
      ? valeur
      : `https://${valeur}`;

  const url = new URL(valeurAvecProtocole);

  if (
    process.env.NODE_ENV === "production" &&
    ["localhost", "127.0.0.1"].includes(url.hostname)
  ) {
    throw new Error(
      "NEXT_PUBLIC_SITE_URL doit contenir l’adresse publique d’Arboboard en production."
    );
  }

  return url.origin;
}

function normaliserPlan(valeur: unknown) {
  return String(valeur || "")
    .trim()
    .toLowerCase();
}

function normaliserFrequence(
  valeur: unknown
): FrequenceAbonnement {
  if (valeur === undefined || valeur === null || valeur === "") {
    return "mensuel";
  }

  if (valeur === "mensuel" || valeur === "annuel") {
    return valeur;
  }

  throw new Error("Fréquence d’abonnement invalide.");
}

async function lireCorpsCheckout(request: Request) {
  let body: BodyCheckout;

  try {
    body = (await request.json()) as BodyCheckout;
  } catch {
    throw new Error("Le corps de la requête est invalide.");
  }

  return {
    planCode: normaliserPlan(body.plan),
    frequence: normaliserFrequence(body.frequence),
  };
}

export async function GET(request: Request) {
  try {
    return NextResponse.json({
      success: true,
      message: "API Stripe Checkout active.",
      hasStripeKey: Boolean(
        process.env.STRIPE_SECRET_KEY
      ),
      hasSupabaseUrl: Boolean(
        process.env.NEXT_PUBLIC_SUPABASE_URL
      ),
      hasServiceRole: Boolean(
        process.env.SUPABASE_SERVICE_ROLE_KEY
      ),
      siteUrl: obtenirUrlSite(request),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Configuration de l’URL du site invalide.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY;
    const stripeSecretKey =
      process.env.STRIPE_SECRET_KEY;
    const siteUrl = obtenirUrlSite(request);

    if (
      !supabaseUrl ||
      !serviceRoleKey ||
      !stripeSecretKey
    ) {
      return NextResponse.json(
        {
          error:
            "Configuration manquante. Vérifie NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY et STRIPE_SECRET_KEY dans .env.local.",
          debug: {
            hasSupabaseUrl: Boolean(supabaseUrl),
            hasServiceRoleKey: Boolean(serviceRoleKey),
            hasStripeSecretKey: Boolean(
              stripeSecretKey
            ),
          },
        },
        { status: 500 }
      );
    }

    if (stripeSecretKey.includes("A_REMPLACER")) {
      return NextResponse.json(
        {
          error:
            "Clé Stripe non configurée. Remplace STRIPE_SECRET_KEY dans .env.local.",
        },
        { status: 500 }
      );
    }

    const authHeader =
      request.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Utilisateur non authentifié." },
        { status: 401 }
      );
    }

    const token = authHeader
      .slice("Bearer ".length)
      .trim();

    if (!token) {
      return NextResponse.json(
        { error: "Jeton d’authentification manquant." },
        { status: 401 }
      );
    }

    let planCode: string;
    let frequence: FrequenceAbonnement;

    try {
      const corps = await lireCorpsCheckout(request);
      planCode = corps.planCode;
      frequence = corps.frequence;
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Requête d’abonnement invalide.",
        },
        { status: 400 }
      );
    }

    if (
      !["essentiel", "pro", "expert"].includes(
        planCode
      )
    ) {
      return NextResponse.json(
        { error: "Plan invalide." },
        { status: 400 }
      );
    }

    const supabaseAdmin = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const {
      data: { user },
      error: erreurUser,
    } = await supabaseAdmin.auth.getUser(token);

    if (erreurUser || !user) {
      return NextResponse.json(
        {
          error: "Session invalide. Reconnecte-toi.",
          detail: erreurUser?.message,
        },
        { status: 401 }
      );
    }

    const { data: profil, error: erreurProfil } =
      await supabaseAdmin
        .from("profils_utilisateurs")
        .select("id, email, role, entreprise_id")
        .eq("id", user.id)
        .maybeSingle();

    if (erreurProfil || !profil) {
      return NextResponse.json(
        {
          error: "Profil utilisateur introuvable.",
          detail: erreurProfil?.message,
        },
        { status: 403 }
      );
    }

    if (profil.role !== "chef") {
      return NextResponse.json(
        {
          error:
            "Seul un compte chef peut choisir un abonnement.",
        },
        { status: 403 }
      );
    }

    if (!profil.entreprise_id) {
      return NextResponse.json(
        {
          error:
            "Aucune entreprise rattachée au compte chef.",
        },
        { status: 400 }
      );
    }

    const {
      data: entreprise,
      error: erreurEntreprise,
    } = await supabaseAdmin
      .from("entreprises_abonnees")
      .select(
        "id, nom_entreprise, email_contact, telephone, stripe_customer_id"
      )
      .eq("id", profil.entreprise_id)
      .maybeSingle();

    if (erreurEntreprise || !entreprise) {
      return NextResponse.json(
        {
          error: "Entreprise introuvable.",
          detail: erreurEntreprise?.message,
        },
        { status: 404 }
      );
    }

    const { data: plan, error: erreurPlan } =
      await supabaseAdmin
        .from("plans_abonnement")
        .select(
          "code, nom, stripe_price_id_mensuel, stripe_price_id_annuel"
        )
        .eq("code", planCode)
        .eq("actif", true)
        .maybeSingle();

    if (erreurPlan || !plan) {
      return NextResponse.json(
        {
          error: "Plan introuvable.",
          detail: erreurPlan?.message,
          planCode,
        },
        { status: 404 }
      );
    }

    const priceId =
      frequence === "annuel"
        ? plan.stripe_price_id_annuel
        : plan.stripe_price_id_mensuel;

    if (!priceId) {
      return NextResponse.json(
        {
          error:
            frequence === "annuel"
              ? "Ce plan n’a pas encore de tarif Stripe annuel configuré."
              : "Ce plan n’a pas encore de tarif Stripe mensuel configuré.",
          planCode,
          frequence,
        },
        { status: 400 }
      );
    }

    const stripe = new Stripe(stripeSecretKey);

    let customerId =
      entreprise.stripe_customer_id || "";

    if (!customerId) {
      const customer =
        await stripe.customers.create({
          email:
            entreprise.email_contact ||
            profil.email ||
            user.email ||
            undefined,
          name:
            entreprise.nom_entreprise || undefined,
          phone: entreprise.telephone || undefined,
          metadata: {
            entreprise_id: entreprise.id,
            profil_id: profil.id,
          },
        });

      customerId = customer.id;

      const {
        error: erreurEnregistrementCustomer,
      } = await supabaseAdmin
        .from("entreprises_abonnees")
        .update({
          stripe_customer_id: customerId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", entreprise.id);

      if (erreurEnregistrementCustomer) {
        return NextResponse.json(
          {
            error:
              "Le client Stripe a été créé, mais son identifiant n’a pas pu être enregistré.",
            detail:
              erreurEnregistrementCustomer.message,
          },
          { status: 500 }
        );
      }
    }

    const session =
      await stripe.checkout.sessions.create({
        mode: "subscription",
        customer: customerId,
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        success_url: `${siteUrl}/chef/abonnement?stripe=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${siteUrl}/chef/abonnement?stripe=cancel`,
        metadata: {
          entreprise_id: entreprise.id,
          plan: plan.code,
          frequence,
        },
        subscription_data: {
          metadata: {
            entreprise_id: entreprise.id,
            plan: plan.code,
            frequence,
          },
        },
      });

    const {
      error: erreurEnregistrementSession,
    } = await supabaseAdmin
      .from("entreprises_abonnees")
      .update({
        plan_souhaite: plan.code,
        stripe_checkout_session_id: session.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", entreprise.id);

    if (erreurEnregistrementSession) {
      return NextResponse.json(
        {
          error:
            "La session Stripe a été créée, mais elle n’a pas pu être enregistrée.",
          detail:
            erreurEnregistrementSession.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      url: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erreur inconnue lors de la création du paiement Stripe.",
      },
      { status: 500 }
    );
  }
}