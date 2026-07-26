import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TYPES_PUBLICS = [
  "cgu",
  "politique_confidentialite",
  "cgv",
] as const;

export async function GET() {
  try {
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error(
        "Configuration Supabase serveur incomplète pour les versions juridiques."
      );

      return NextResponse.json(
        {
          erreur:
            "Impossible de charger les versions juridiques.",
        },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      }
    );

    const { data, error } = await supabaseAdmin
      .from("documents_juridiques_plateforme")
      .select(
        "type_document, titre_publie, version_publie, publie_at"
      )
      .in("type_document", [...TYPES_PUBLICS])
      .not("version_publie", "is", null)
      .not("publie_at", "is", null);

    if (error) {
      throw error;
    }

    const documents = Object.fromEntries(
      (data || []).map((document) => [
        document.type_document,
        {
          titre: document.titre_publie,
          version: document.version_publie,
          publie_at: document.publie_at,
        },
      ])
    );

    return NextResponse.json(
      { documents },
      {
        headers: {
          "Cache-Control":
            "public, max-age=300, stale-while-revalidate=600",
        },
      }
    );
  } catch (error) {
    console.error(
      "Erreur chargement des versions juridiques :",
      error
    );

    return NextResponse.json(
      {
        erreur:
          "Impossible de charger les versions juridiques.",
      },
      { status: 500 }
    );
  }
}