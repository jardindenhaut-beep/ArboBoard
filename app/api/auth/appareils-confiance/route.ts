import {
  type NextRequest,
  NextResponse,
} from "next/server";
import {
  authentifierRequeteAppareil,
  calculerEmpreinteJeton,
  creerJetonAppareil,
  dateExpirationAppareil,
  decrireAppareil,
  definirCookieAppareil,
  lireJetonAppareil,
  messageErreurAppareil,
  statutErreurAppareil,
  supprimerCookieAppareil,
  verifierSessionAal2,
} from "@/lib/auth/appareilsConfianceServeur";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const {
      supabaseAdmin,
      user,
    } = await authentifierRequeteAppareil(
      request
    );

    const maintenant = new Date().toISOString();

    await supabaseAdmin
      .from("appareils_confiance")
      .update({
        revoque_at: maintenant,
      })
      .eq("utilisateur_id", user.id)
      .is("revoque_at", null)
      .lte("expire_at", maintenant);

    const { data, error } = await supabaseAdmin
      .from("appareils_confiance")
      .select(
        `
        id,
        nom_appareil,
        navigateur,
        systeme,
        token_hash,
        created_at,
        derniere_utilisation_at,
        expire_at
      `
      )
      .eq("utilisateur_id", user.id)
      .is("revoque_at", null)
      .gt("expire_at", maintenant)
      .order(
        "derniere_utilisation_at",
        { ascending: false }
      );

    if (error) throw error;

    const jetonCookie =
      lireJetonAppareil(request);

    const empreinteActuelle = jetonCookie
      ? calculerEmpreinteJeton(jetonCookie)
      : null;

    return NextResponse.json({
      appareils: (data || []).map((appareil) => ({
        id: appareil.id,
        nom_appareil: appareil.nom_appareil,
        navigateur: appareil.navigateur,
        systeme: appareil.systeme,
        created_at: appareil.created_at,
        derniere_utilisation_at:
          appareil.derniere_utilisation_at,
        expire_at: appareil.expire_at,
        appareil_actuel:
          Boolean(empreinteActuelle) &&
          appareil.token_hash ===
            empreinteActuelle,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      {
        erreur: messageErreurAppareil(error),
      },
      {
        status: statutErreurAppareil(error),
      }
    );
  }
}

export async function POST(
  request: NextRequest
) {
  try {
    const {
      supabaseAdmin,
      user,
      profil,
      jeton,
    } = await authentifierRequeteAppareil(
      request
    );

    const sessionAal2 =
      await verifierSessionAal2(
        supabaseAdmin,
        jeton
      );

    if (!sessionAal2) {
      return NextResponse.json(
        {
          erreur:
            "Le code de double authentification doit être validé avant d’enregistrer cet appareil.",
        },
        { status: 403 }
      );
    }

    const ancienJeton =
      lireJetonAppareil(request);

    if (ancienJeton) {
      await supabaseAdmin
        .from("appareils_confiance")
        .update({
          revoque_at: new Date().toISOString(),
        })
        .eq("utilisateur_id", user.id)
        .eq(
          "token_hash",
          calculerEmpreinteJeton(
            ancienJeton
          )
        )
        .is("revoque_at", null);
    }

    const jetonAppareil =
      creerJetonAppareil();

    const expireAt =
      dateExpirationAppareil();

    const description =
      decrireAppareil(
        request.headers.get("user-agent")
      );

    const { data, error } = await supabaseAdmin
      .from("appareils_confiance")
      .insert({
        utilisateur_id: user.id,
        entreprise_id: profil.entreprise_id,
        role: profil.role || "utilisateur",
        nom_appareil:
          description.nomAppareil,
        navigateur:
          description.navigateur,
        systeme: description.systeme,
        user_agent: description.userAgent,
        token_hash:
          calculerEmpreinteJeton(
            jetonAppareil
          ),
        expire_at: expireAt.toISOString(),
      })
      .select(
        `
        id,
        nom_appareil,
        navigateur,
        systeme,
        created_at,
        derniere_utilisation_at,
        expire_at
      `
      )
      .single();

    if (error) throw error;

    const response = NextResponse.json({
      success: true,
      appareil: {
        ...data,
        appareil_actuel: true,
      },
    });

    definirCookieAppareil(
      response,
      jetonAppareil,
      expireAt
    );

    return response;
  } catch (error) {
    return NextResponse.json(
      {
        erreur: messageErreurAppareil(error),
      },
      {
        status: statutErreurAppareil(error),
      }
    );
  }
}

export async function DELETE(
  request: NextRequest
) {
  try {
    const {
      supabaseAdmin,
      user,
    } = await authentifierRequeteAppareil(
      request
    );

    const body = (await request
      .json()
      .catch(() => ({}))) as {
      appareilId?: string;
    };

    const appareilId =
      String(body.appareilId || "").trim();

    if (!appareilId) {
      return NextResponse.json(
        {
          erreur:
            "Identifiant de l’appareil manquant.",
        },
        { status: 400 }
      );
    }

    const { data: appareil, error: lectureError } =
      await supabaseAdmin
        .from("appareils_confiance")
        .select("id, token_hash")
        .eq("id", appareilId)
        .eq("utilisateur_id", user.id)
        .is("revoque_at", null)
        .maybeSingle();

    if (lectureError) throw lectureError;

    if (!appareil) {
      return NextResponse.json(
        {
          erreur:
            "Appareil introuvable ou déjà révoqué.",
        },
        { status: 404 }
      );
    }

    const { error } = await supabaseAdmin
      .from("appareils_confiance")
      .update({
        revoque_at: new Date().toISOString(),
      })
      .eq("id", appareil.id)
      .eq("utilisateur_id", user.id);

    if (error) throw error;

    const response = NextResponse.json({
      success: true,
    });

    const jetonCookie =
      lireJetonAppareil(request);

    if (
      jetonCookie &&
      calculerEmpreinteJeton(
        jetonCookie
      ) === appareil.token_hash
    ) {
      supprimerCookieAppareil(response);
    }

    return response;
  } catch (error) {
    return NextResponse.json(
      {
        erreur: messageErreurAppareil(error),
      },
      {
        status: statutErreurAppareil(error),
      }
    );
  }
}