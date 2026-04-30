import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

type BodyCheckout = {
  plan: string;
  frequence?: "mensuel" | "annuel";
};

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "API Stripe Checkout active.",
    hasStripeKey: Boolean(process.env.STRIPE_SECRET_KEY),
    hasSupabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    hasServiceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  });
}

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    if (!supabaseUrl || !serviceRoleKey || !stripeSecretKey) {
      return NextResponse.json(
        {
          error:
            "Configuration manquante. Vérifie NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY et STRIPE_SECRET_KEY dans .env.local.",
          debug: {
            hasSupabaseUrl: Boolean(supabaseUrl),
            hasServiceRoleKey: Boolean(serviceRoleKey),
            hasStripeSecretKey: Boolean(stripeSecretKey),
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

    const authHeader = request.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Utilisateur non authentifié." },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");

    const body = (await request.json()) as BodyCheckout;
    const planCode = body.plan;
    const frequence = body.frequence || "mensuel";

    if (!["essentiel", "pro", "expert"].includes(planCode)) {
      return NextResponse.json({ error: "Plan invalide." }, { status: 400 });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

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

    const { data: profil, error: erreurProfil } = await supabaseAdmin
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
        { error: "Seul un compte chef peut choisir un abonnement." },
        { status: 403 }
      );
    }

    if (!profil.entreprise_id) {
      return NextResponse.json(
        { error: "Aucune entreprise rattachée au compte chef." },
        { status: 400 }
      );
    }

    const { data: entreprise, error: erreurEntreprise } = await supabaseAdmin
      .from("entreprises_abonnees")
      .select("id, nom_entreprise, email_contact, telephone, stripe_customer_id")
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

    const { data: plan, error: erreurPlan } = await supabaseAdmin
      .from("plans_abonnement")
      .select("code, nom, stripe_price_id_mensuel, stripe_price_id_annuel")
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
            "Ce plan n'a pas encore de price_id Stripe. Vérifie stripe_price_id_mensuel dans Supabase.",
          planCode,
          frequence,
        },
        { status: 400 }
      );
    }

    const stripe = new Stripe(stripeSecretKey);

    let customerId = entreprise.stripe_customer_id || "";

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: entreprise.email_contact || profil.email || user.email || undefined,
        name: entreprise.nom_entreprise || undefined,
        phone: entreprise.telephone || undefined,
        metadata: {
          entreprise_id: entreprise.id,
          profil_id: profil.id,
        },
      });

      customerId = customer.id;

      await supabaseAdmin
        .from("entreprises_abonnees")
        .update({
          stripe_customer_id: customerId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", entreprise.id);
    }

    const session = await stripe.checkout.sessions.create({
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

    await supabaseAdmin
      .from("entreprises_abonnees")
      .update({
        plan_souhaite: plan.code,
        stripe_checkout_session_id: session.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", entreprise.id);

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