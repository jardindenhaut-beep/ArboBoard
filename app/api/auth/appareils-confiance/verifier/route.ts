import {
  type NextRequest,
  NextResponse,
} from "next/server";
import {
  authentifierRequeteAppareil,
  calculerEmpreinteJeton,
  lireJetonAppareil,
  messageErreurAppareil,
  statutErreurAppareil,
  supprimerCookieAppareil,
} from "@/lib/auth/appareilsConfianceServeur";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest
) {
  try {
    const {
      supabaseAdmin,
      user,
    } = await authentifierRequeteAppareil(
      request
    );

    const jetonAppareil =
      lireJetonAppareil(request);

    if (!jetonAppareil) {
      return NextResponse.json({
        confiance: false,
      });
    }

    const empreinte =
      calculerEmpreinteJeton(
        jetonAppareil
      );

    const { data: appareil, error } =
      await supabaseAdmin
        .from("appareils_confiance")
        .select(
          `
          id,
          expire_at,
          revoque_at
        `
        )
        .eq("utilisateur_id", user.id)
        .eq("token_hash", empreinte)
        .maybeSingle();

    if (error) throw error;

    if (!appareil) {
      return NextResponse.json({
        confiance: false,
      });
    }

    const expire =
      new Date(appareil.expire_at).getTime() <=
      Date.now();

    if (appareil.revoque_at || expire) {
      if (!appareil.revoque_at) {
        await supabaseAdmin
          .from("appareils_confiance")
          .update({
            revoque_at:
              new Date().toISOString(),
          })
          .eq("id", appareil.id)
          .eq("utilisateur_id", user.id);
      }

      const response = NextResponse.json({
        confiance: false,
      });

      supprimerCookieAppareil(response);

      return response;
    }

    await supabaseAdmin
      .from("appareils_confiance")
      .update({
        derniere_utilisation_at:
          new Date().toISOString(),
      })
      .eq("id", appareil.id)
      .eq("utilisateur_id", user.id);

    return NextResponse.json({
      confiance: true,
      appareilId: appareil.id,
      expireAt: appareil.expire_at,
    });
  } catch (error) {
    return NextResponse.json(
      {
        confiance: false,
        erreur: messageErreurAppareil(error),
      },
      {
        status: statutErreurAppareil(error),
      }
    );
  }
}