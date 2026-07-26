import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import {
  entetesLimiteRequetes,
  obtenirAdresseIp,
  verifierLimiteRequetes,
} from "@/lib/securite/limiteurRequetes";

type FrequenceAbonnement = "mensuel" | "annuel";

type BodyCheckout = {
  plan?: unknown;
  frequence?: unknown;
  acceptation_cgv?: unknown;
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
    acceptationCgv:
      body.acceptation_cgv === true,
  };
}

export async function GET() {
  return NextResponse.json(
    {
      success: true,
      message: "API Stripe Checkout active.",
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

export async function POST(request: Request) {
  const ip = obtenirAdresseIp(request);

  const limiteIp = verifierLimiteRequetes({
    cle: `stripe-checkout:ip:${ip}`,
    limite: 20,
    fenetreMs: 10 * 60 * 1000,
  });

  if (!limiteIp.autorise) {
    return NextResponse.json(
      {
        error:
          "Trop de tentatives de paiement. Réessaie dans quelques minutes.",
      },
      {
        status: 429,
        headers: entetesLimiteRequetes(limiteIp),
      }
    );
  }

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
      console.error(
        "Configuration Stripe Checkout incomplète.",
        {
          hasSupabaseUrl: Boolean(supabaseUrl),
          hasServiceRoleKey: Boolean(
            serviceRoleKey
          ),
          hasStripeSecretKey: Boolean(
            stripeSecretKey
          ),
        }
      );

      return NextResponse.json(
        {
          error:
            "Le service de paiement est temporairement indisponible.",
        },
        { status: 500 }
      );
    }

    if (stripeSecretKey.includes("A_REMPLACER")) {
      console.error(
        "STRIPE_SECRET_KEY n’est pas configurée."
      );

      return NextResponse.json(
        {
          error:
            "Le service de paiement est temporairement indisponible.",
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
    let acceptationCgv: boolean;

    try {
      const corps = await lireCorpsCheckout(request);
      planCode = corps.planCode;
      frequence = corps.frequence;
      acceptationCgv =
        corps.acceptationCgv;
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

    if (!acceptationCgv) {
      return NextResponse.json(
        {
          error:
            "Vous devez accepter les Conditions générales de vente avant de poursuivre.",
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
      console.error(
        "Échec de validation de session Stripe Checkout :",
        erreurUser
      );

      return NextResponse.json(
        {
          error: "Session invalide. Reconnecte-toi.",
        },
        { status: 401 }
      );
    }

    const limiteUtilisateur =
      verifierLimiteRequetes({
        cle: `stripe-checkout:user:${user.id}`,
        limite: 8,
        fenetreMs: 10 * 60 * 1000,
      });

    if (!limiteUtilisateur.autorise) {
      return NextResponse.json(
        {
          error:
            "Trop de créations de sessions de paiement. Réessaie dans quelques minutes.",
        },
        {
          status: 429,
          headers:
            entetesLimiteRequetes(
              limiteUtilisateur
            ),
        }
      );
    }

    const { data: profil, error: erreurProfil } =
      await supabaseAdmin
        .from("profils_utilisateurs")
        .select("id, email, role, entreprise_id")
        .eq("id", user.id)
        .maybeSingle();

    if (erreurProfil || !profil) {
      console.error(
        "Profil Stripe Checkout introuvable :",
        erreurProfil
      );

      return NextResponse.json(
        {
          error: "Profil utilisateur introuvable.",
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
      console.error(
        "Entreprise Stripe Checkout introuvable :",
        erreurEntreprise
      );

      return NextResponse.json(
        {
          error: "Entreprise introuvable.",
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
      console.error(
        "Plan Stripe Checkout introuvable :",
        {
          planCode,
          erreur: erreurPlan,
        }
      );

      return NextResponse.json(
        {
          error: "Plan introuvable.",
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

    const {
      data: cgvPubliees,
      error: erreurCgv,
    } = await supabaseAdmin
      .from(
        "documents_juridiques_plateforme"
      )
      .select(
        "titre_publie, version_publie, publie_at"
      )
      .eq("type_document", "cgv")
      .not("version_publie", "is", null)
      .not("publie_at", "is", null)
      .maybeSingle();

    if (
      erreurCgv ||
      !cgvPubliees?.version_publie ||
      !cgvPubliees?.titre_publie
    ) {
      console.error(
        "CGV publiées indisponibles pour Stripe Checkout :",
        erreurCgv
      );

      return NextResponse.json(
        {
          error:
            "Les Conditions générales de vente publiées sont indisponibles.",
        },
        { status: 503 }
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
        console.error(
          "Enregistrement du client Stripe impossible :",
          erreurEnregistrementCustomer
        );

        return NextResponse.json(
          {
            error:
              "Le service de paiement est temporairement indisponible.",
          },
          { status: 500 }
        );
      }
    }

    const userAgent =
      request.headers
        .get("user-agent")
        ?.slice(0, 500) || null;

    const {
      error: erreurAcceptationCgv,
    } = await supabaseAdmin
      .from(
        "acceptations_contractuelles"
      )
      .insert({
        utilisateur_id: user.id,
        entreprise_id: entreprise.id,
        type_document: "cgv",
        version_document:
          cgvPubliees.version_publie,
        titre_document:
          cgvPubliees.titre_publie,
        contexte: "souscription",
        source: "stripe_checkout",
        user_agent: userAgent,
        details: {
          plan: plan.code,
          frequence,
        },
      });

    if (erreurAcceptationCgv) {
      console.error(
        "Enregistrement de l’acceptation des CGV impossible :",
        erreurAcceptationCgv
      );

      return NextResponse.json(
        {
          error:
            "L’acceptation des CGV n’a pas pu être enregistrée.",
        },
        { status: 500 }
      );
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
      console.error(
        "Enregistrement de la session Stripe impossible :",
        erreurEnregistrementSession
      );

      return NextResponse.json(
        {
          error:
            "La session de paiement n’a pas pu être finalisée.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      url: session.url,
    });
  } catch (error) {
    console.error(
      "Erreur Stripe Checkout :",
      error
    );

    return NextResponse.json(
      {
        error:
          "Impossible de créer la session de paiement pour le moment.",
      },
      { status: 500 }
    );
  }
}