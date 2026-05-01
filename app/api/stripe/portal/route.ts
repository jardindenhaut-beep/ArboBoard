import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "API Stripe Portal active.",
    hasStripeKey: Boolean(process.env.STRIPE_SECRET_KEY),
    hasSupabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    hasServiceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://arboboard.fr",
  });
}

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://arboboard.fr";

    if (!supabaseUrl || !serviceRoleKey || !stripeSecretKey) {
      return NextResponse.json(
        {
          error:
            "Configuration manquante. Vérifie NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY et STRIPE_SECRET_KEY.",
          debug: {
            hasSupabaseUrl: Boolean(supabaseUrl),
            hasServiceRoleKey: Boolean(serviceRoleKey),
            hasStripeSecretKey: Boolean(stripeSecretKey),
          },
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
        { error: "Seul un compte chef peut gérer l'abonnement." },
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
      .select(
        "id, nom_entreprise, stripe_customer_id, stripe_subscription_id, statut_abonnement"
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

    if (!entreprise.stripe_customer_id) {
      return NextResponse.json(
        {
          error:
            "Aucun client Stripe n'est associé à cette entreprise. Il faut d'abord souscrire à un abonnement.",
        },
        { status: 400 }
      );
    }

    const stripe = new Stripe(stripeSecretKey);

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: entreprise.stripe_customer_id,
      return_url: `${siteUrl}/chef/abonnement?portal=return`,
    });

    return NextResponse.json({
      success: true,
      url: portalSession.url,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Erreur inconnue lors de l'ouverture du portail Stripe.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}