import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

function statutDepuisStripe(status: string) {
  if (status === "active" || status === "trialing") {
    return "actif";
  }

  if (
    status === "past_due" ||
    status === "unpaid" ||
    status === "incomplete" ||
    status === "incomplete_expired" ||
    status === "paused"
  ) {
    return "suspendu";
  }

  if (status === "canceled") {
    return "annule";
  }

  return "suspendu";
}

export async function POST(request: Request) {
  try {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!stripeSecretKey || !webhookSecret || !supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        {
          error:
            "Configuration manquante. Vérifie STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY.",
        },
        { status: 500 }
      );
    }

    if (webhookSecret.includes("A_REMPLACER")) {
      return NextResponse.json(
        {
          error:
            "STRIPE_WEBHOOK_SECRET n'est pas encore configuré dans .env.local.",
        },
        { status: 500 }
      );
    }

    const stripe = new Stripe(stripeSecretKey);

    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Signature Stripe manquante." },
        { status: 400 }
      );
    }

    const body = await request.text();

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Signature webhook Stripe invalide.";

      return NextResponse.json({ error: message }, { status: 400 });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      const entrepriseId = session.metadata?.entreprise_id || "";
      const plan = session.metadata?.plan || "";
      const frequence = session.metadata?.frequence || "mensuel";

      if (!entrepriseId || !plan) {
        return NextResponse.json({
          received: true,
          ignored: true,
          reason: "metadata entreprise_id ou plan manquant",
        });
      }

      const subscriptionId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id || "";

      const customerId =
        typeof session.customer === "string"
          ? session.customer
          : session.customer?.id || "";

      await supabaseAdmin
        .from("entreprises_abonnees")
        .update({
          statut_abonnement: "actif",
          plan_abonnement: plan,
          plan_souhaite: "",
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          stripe_checkout_session_id: session.id,
          date_activation_abonnement: new Date().toISOString(),
          date_fin_abonnement: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", entrepriseId);

      return NextResponse.json({
        received: true,
        event: event.type,
        entrepriseId,
        plan,
        frequence,
      });
    }

    if (event.type === "customer.subscription.updated") {
      const subscription = event.data.object as Stripe.Subscription;

      const entrepriseId = subscription.metadata?.entreprise_id || "";
      const plan = subscription.metadata?.plan || "";
      const statut = statutDepuisStripe(subscription.status);

      if (!entrepriseId) {
        return NextResponse.json({
          received: true,
          ignored: true,
          reason: "metadata entreprise_id manquant",
        });
      }

      await supabaseAdmin
        .from("entreprises_abonnees")
        .update({
          statut_abonnement: statut,
          plan_abonnement: plan || undefined,
          stripe_subscription_id: subscription.id,
          date_fin_abonnement:
            statut === "annule" ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", entrepriseId);

      return NextResponse.json({
        received: true,
        event: event.type,
        entrepriseId,
        statut,
      });
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;

      const entrepriseId = subscription.metadata?.entreprise_id || "";

      if (entrepriseId) {
        await supabaseAdmin
          .from("entreprises_abonnees")
          .update({
            statut_abonnement: "annule",
            date_fin_abonnement: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", entrepriseId);
      } else {
        await supabaseAdmin
          .from("entreprises_abonnees")
          .update({
            statut_abonnement: "annule",
            date_fin_abonnement: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subscription.id);
      }

      return NextResponse.json({
        received: true,
        event: event.type,
      });
    }

    return NextResponse.json({
      received: true,
      ignored: true,
      event: event.type,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Erreur inconnue dans le webhook Stripe.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}