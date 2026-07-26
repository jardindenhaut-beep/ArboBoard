import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

function statutDepuisStripe(status: string) {
  if (
    status === "active" ||
    status === "trialing"
  ) {
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

function dateStripeVersIso(
  timestamp: number | null | undefined
) {
  if (!timestamp) {
    return null;
  }

  return new Date(
    timestamp * 1000
  ).toISOString();
}

export async function POST(request: Request) {
  try {
    const stripeSecretKey =
      process.env.STRIPE_SECRET_KEY;
    const webhookSecret =
      process.env.STRIPE_WEBHOOK_SECRET;
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (
      !stripeSecretKey ||
      !webhookSecret ||
      !supabaseUrl ||
      !serviceRoleKey
    ) {
      console.error(
        "Configuration Stripe Webhook incomplète.",
        {
          hasStripeSecretKey: Boolean(
            stripeSecretKey
          ),
          hasWebhookSecret: Boolean(
            webhookSecret
          ),
          hasSupabaseUrl: Boolean(
            supabaseUrl
          ),
          hasServiceRoleKey: Boolean(
            serviceRoleKey
          ),
        }
      );

      return NextResponse.json(
        {
          error:
            "Service webhook temporairement indisponible.",
        },
        { status: 500 }
      );
    }

    if (
      webhookSecret.includes(
        "A_REMPLACER"
      )
    ) {
      console.error(
        "STRIPE_WEBHOOK_SECRET n’est pas configuré."
      );

      return NextResponse.json(
        {
          error:
            "Service webhook temporairement indisponible.",
        },
        { status: 500 }
      );
    }

    const stripe = new Stripe(
      stripeSecretKey
    );

    const signature =
      request.headers.get(
        "stripe-signature"
      );

    if (!signature) {
      return NextResponse.json(
        {
          error:
            "Signature Stripe manquante.",
        },
        { status: 400 }
      );
    }

    const body = await request.text();

    let event: Stripe.Event;

    try {
      event =
        stripe.webhooks.constructEvent(
          body,
          signature,
          webhookSecret
        );
    } catch (error) {
      console.error(
        "Signature webhook Stripe invalide :",
        error
      );

      return NextResponse.json(
        {
          error:
            "Signature webhook Stripe invalide.",
        },
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

    async function trouverPlanDepuisPriceId(
      priceId: string
    ) {
      if (!priceId) {
        return "";
      }

      const { data, error } =
        await supabaseAdmin
          .from("plans_abonnement")
          .select("code")
          .or(
            `stripe_price_id_mensuel.eq.${priceId},stripe_price_id_annuel.eq.${priceId}`
          )
          .maybeSingle();

      if (error) {
        console.error(
          "Recherche du plan Stripe impossible :",
          error
        );
      }

      return data?.code || "";
    }

    if (
      event.type ===
      "checkout.session.completed"
    ) {
      const session =
        event.data
          .object as Stripe.Checkout.Session;

      const entrepriseId =
        session.metadata?.entreprise_id ||
        "";
      const plan =
        session.metadata?.plan || "";
      const frequence =
        session.metadata?.frequence ||
        "mensuel";

      if (!entrepriseId || !plan) {
        console.warn(
          "Webhook Checkout ignoré : métadonnées manquantes.",
          {
            eventId: event.id,
            eventType: event.type,
          }
        );

        return NextResponse.json({
          received: true,
          ignored: true,
        });
      }

      const subscriptionId =
        typeof session.subscription ===
        "string"
          ? session.subscription
          : session.subscription?.id ||
            "";

      const customerId =
        typeof session.customer ===
        "string"
          ? session.customer
          : session.customer?.id || "";

      const { error } =
        await supabaseAdmin
          .from(
            "entreprises_abonnees"
          )
          .update({
            statut_abonnement: "actif",
            plan_abonnement: plan,
            plan_souhaite: "",
            stripe_customer_id:
              customerId,
            stripe_subscription_id:
              subscriptionId,
            stripe_checkout_session_id:
              session.id,
            date_activation_abonnement:
              new Date().toISOString(),
            date_fin_abonnement: null,
            updated_at:
              new Date().toISOString(),
          })
          .eq("id", entrepriseId);

      if (error) {
        console.error(
          "Mise à jour abonnement après Checkout impossible :",
          error
        );

        return NextResponse.json(
          {
            error:
              "Traitement du webhook impossible.",
          },
          { status: 500 }
        );
      }

      console.info(
        "Webhook Stripe traité.",
        {
          eventId: event.id,
          eventType: event.type,
          frequence,
        }
      );

      return NextResponse.json({
        received: true,
      });
    }

    if (
      event.type ===
      "customer.subscription.updated"
    ) {
      const subscription =
        event.data
          .object as Stripe.Subscription;
      const subscriptionAny =
        subscription as any;

      const entrepriseId =
        subscription.metadata
          ?.entreprise_id || "";

      const priceId =
        subscription.items?.data?.[0]
          ?.price?.id || "";

      const planDepuisMetadata =
        subscription.metadata?.plan ||
        "";

      const planDepuisPrice =
        await trouverPlanDepuisPriceId(
          priceId
        );

      const plan =
        planDepuisPrice ||
        planDepuisMetadata;

      const statut =
        statutDepuisStripe(
          subscription.status
        );

      const annulationFinPeriode =
        subscriptionAny
          .cancel_at_period_end ===
        true;

      const dateFinPeriode =
        dateStripeVersIso(
          subscriptionAny
            .current_period_end
        );

      if (!entrepriseId) {
        console.warn(
          "Webhook abonnement ignoré : entreprise_id manquant.",
          {
            eventId: event.id,
            eventType: event.type,
          }
        );

        return NextResponse.json({
          received: true,
          ignored: true,
        });
      }

      const donneesMaj: Record<
        string,
        unknown
      > = {
        statut_abonnement: statut,
        stripe_subscription_id:
          subscription.id,
        updated_at:
          new Date().toISOString(),
      };

      if (plan) {
        donneesMaj.plan_abonnement =
          plan;
      }

      if (annulationFinPeriode) {
        donneesMaj.date_fin_abonnement =
          dateFinPeriode;
      } else if (statut === "actif") {
        donneesMaj.date_fin_abonnement =
          null;
      }

      if (statut === "annule") {
        donneesMaj.date_fin_abonnement =
          new Date().toISOString();
      }

      const { error } =
        await supabaseAdmin
          .from(
            "entreprises_abonnees"
          )
          .update(donneesMaj)
          .eq("id", entrepriseId);

      if (error) {
        console.error(
          "Mise à jour abonnement Stripe impossible :",
          error
        );

        return NextResponse.json(
          {
            error:
              "Traitement du webhook impossible.",
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        received: true,
      });
    }

    if (
      event.type ===
      "customer.subscription.deleted"
    ) {
      const subscription =
        event.data
          .object as Stripe.Subscription;

      const entrepriseId =
        subscription.metadata
          ?.entreprise_id || "";

      const requete =
        supabaseAdmin
          .from(
            "entreprises_abonnees"
          )
          .update({
            statut_abonnement:
              "annule",
            date_fin_abonnement:
              new Date().toISOString(),
            updated_at:
              new Date().toISOString(),
          });

      const { error } = entrepriseId
        ? await requete.eq(
            "id",
            entrepriseId
          )
        : await requete.eq(
            "stripe_subscription_id",
            subscription.id
          );

      if (error) {
        console.error(
          "Annulation abonnement Stripe impossible :",
          error
        );

        return NextResponse.json(
          {
            error:
              "Traitement du webhook impossible.",
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        received: true,
      });
    }

    return NextResponse.json({
      received: true,
      ignored: true,
    });
  } catch (error) {
    console.error(
      "Erreur Stripe Webhook :",
      error
    );

    return NextResponse.json(
      {
        error:
          "Erreur lors du traitement du webhook.",
      },
      { status: 500 }
    );
  }
}