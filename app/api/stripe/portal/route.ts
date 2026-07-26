import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import {
  entetesLimiteRequetes,
  obtenirAdresseIp,
  verifierLimiteRequetes,
} from "@/lib/securite/limiteurRequetes";

export async function GET() {
  return NextResponse.json(
    {
      success: true,
      message: "API Stripe Portal active.",
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
    cle: `stripe-portal:ip:${ip}`,
    limite: 30,
    fenetreMs: 10 * 60 * 1000,
  });

  if (!limiteIp.autorise) {
    return NextResponse.json(
      {
        error:
          "Trop de tentatives d’ouverture du portail Stripe. Réessaie dans quelques minutes.",
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
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      "https://arboboard.fr";

    if (
      !supabaseUrl ||
      !serviceRoleKey ||
      !stripeSecretKey
    ) {
      console.error(
        "Configuration Stripe Portal incomplète.",
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
            "Le portail d’abonnement est temporairement indisponible.",
        },
        { status: 500 }
      );
    }

    const authHeader =
      request.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          error:
            "Utilisateur non authentifié.",
        },
        { status: 401 }
      );
    }

    const token = authHeader
      .slice("Bearer ".length)
      .trim();

    if (!token) {
      return NextResponse.json(
        {
          error:
            "Jeton d’authentification manquant.",
        },
        { status: 401 }
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
        "Échec de validation de session Stripe Portal :",
        erreurUser
      );

      return NextResponse.json(
        {
          error:
            "Session invalide. Reconnecte-toi.",
        },
        { status: 401 }
      );
    }

    const limiteUtilisateur =
      verifierLimiteRequetes({
        cle: `stripe-portal:user:${user.id}`,
        limite: 10,
        fenetreMs: 10 * 60 * 1000,
      });

    if (!limiteUtilisateur.autorise) {
      return NextResponse.json(
        {
          error:
            "Trop d’ouvertures du portail Stripe ont été demandées. Réessaie dans quelques minutes.",
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

    const {
      data: profil,
      error: erreurProfil,
    } = await supabaseAdmin
      .from("profils_utilisateurs")
      .select(
        "id, email, role, entreprise_id"
      )
      .eq("id", user.id)
      .maybeSingle();

    if (erreurProfil || !profil) {
      console.error(
        "Profil Stripe Portal introuvable :",
        erreurProfil
      );

      return NextResponse.json(
        {
          error:
            "Profil utilisateur introuvable.",
        },
        { status: 403 }
      );
    }

    if (profil.role !== "chef") {
      return NextResponse.json(
        {
          error:
            "Seul un compte chef peut gérer l'abonnement.",
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
        "id, nom_entreprise, stripe_customer_id, stripe_subscription_id, statut_abonnement"
      )
      .eq("id", profil.entreprise_id)
      .maybeSingle();

    if (erreurEntreprise || !entreprise) {
      console.error(
        "Entreprise Stripe Portal introuvable :",
        erreurEntreprise
      );

      return NextResponse.json(
        {
          error: "Entreprise introuvable.",
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

    const stripe = new Stripe(
      stripeSecretKey
    );

    const portalSession =
      await stripe.billingPortal.sessions.create({
        customer:
          entreprise.stripe_customer_id,
        return_url:
          `${siteUrl}/chef/abonnement?portal=return`,
      });

    return NextResponse.json({
      success: true,
      url: portalSession.url,
    });
  } catch (error) {
    console.error(
      "Erreur Stripe Portal :",
      error
    );

    return NextResponse.json(
      {
        error:
          "Impossible d’ouvrir le portail Stripe pour le moment.",
      },
      { status: 500 }
    );
  }
}