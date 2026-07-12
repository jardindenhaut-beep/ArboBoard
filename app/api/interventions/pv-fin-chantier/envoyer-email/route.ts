import { NextRequest, NextResponse } from "next/server";
import React from "react";
import { createClient } from "@supabase/supabase-js";
import { renderToBuffer } from "@react-pdf/renderer";
import { Resend } from "resend";
import { PvFinChantierDocument } from "../../../../../lib/interventions/genererPdfPvFinChantier";
import { chargerParametresEntrepriseDocument } from "../../../../../lib/documents/chargerParametresEntreprise";

export const runtime = "nodejs";

type ProfilUtilisateur = {
  id: string;
  entreprise_id: string;
  role: string | null;
  email: string | null;
  nom: string | null;
  prenom: string | null;
};

function nettoyerEmail(email: unknown) {
  if (typeof email !== "string") return "";
  return email.trim().toLowerCase();
}

function roleAutorise(role: string | null | undefined) {
  const valeur = (role || "").trim().toLowerCase();

  return (
    valeur === "chef" ||
    valeur === "admin" ||
    valeur === "gerant" ||
    valeur === "gérant"
  );
}

function echapperHtml(texte: string) {
  return texte
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function texteVersHtml(texte: string) {
  return echapperHtml(texte).replaceAll("\n", "<br />");
}

function nomProfil(profil: ProfilUtilisateur | null) {
  if (!profil) return "Arboboard";

  const complet = `${profil.prenom || ""} ${profil.nom || ""}`.trim();
  return complet || profil.email || "Arboboard";
}

function nomFichierPdf(numero: string | null | undefined) {
  const base =
    numero && numero.trim().length > 0 ? numero.trim() : "PV-fin-chantier";

  return `${base
    .replaceAll("/", "-")
    .replaceAll("\\", "-")
    .replaceAll(" ", "-")}.pdf`;
}

async function enregistrerHistoriqueEmail(params: {
  supabaseAdmin: any;
  entrepriseId: string;
  ficheId: string;
  pvId: string | null;
  destinataireEmail: string;
  sujet: string;
  message: string;
  statut: "envoye" | "erreur";
  resendEmailId?: string | null;
  erreur?: string | null;
  envoyePar?: string | null;
}) {
  const { error } = await params.supabaseAdmin
    .from("pv_fin_chantier_emails")
    .insert({
      entreprise_id: params.entrepriseId,
      fiche_id: params.ficheId,
      pv_id: params.pvId,
      destinataire_email: params.destinataireEmail,
      sujet: params.sujet,
      message: params.message,
      statut: params.statut,
      resend_email_id: params.resendEmailId || null,
      erreur: params.erreur || null,
      envoye_par: params.envoyePar || null,
    });

  if (error) {
    console.error("Erreur insertion historique email PV :", error);
  }
}

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendApiKey = process.env.RESEND_API_KEY;
  const resendFromEmail =
    process.env.RESEND_FROM_EMAIL || "Arboboard <contact@arboboard.fr>";

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    return NextResponse.json(
      {
        erreur:
          "Configuration Supabase serveur manquante. Vérifiez les variables d’environnement.",
      },
      { status: 500 }
    );
  }

  if (!resendApiKey) {
    return NextResponse.json(
      {
        erreur:
          "Configuration Resend manquante. Ajoutez RESEND_API_KEY dans les variables d’environnement.",
      },
      { status: 500 }
    );
  }

  const authorization = request.headers.get("authorization") || "";
  const token = authorization.replace("Bearer ", "").trim();

  if (!token) {
    return NextResponse.json(
      { erreur: "Session absente. Veuillez vous reconnecter." },
      { status: 401 }
    );
  }

  const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }) as any;

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }) as any;

  const {
    data: { user },
    error: erreurUtilisateur,
  } = await supabaseAuth.auth.getUser(token);

  if (erreurUtilisateur || !user) {
    return NextResponse.json(
      { erreur: "Session invalide. Veuillez vous reconnecter." },
      { status: 401 }
    );
  }

  const { data: profilData, error: erreurProfil } = await supabaseAdmin
    .from("profils_utilisateurs")
    .select("id, entreprise_id, role, email, nom, prenom")
    .eq("id", user.id)
    .maybeSingle();

  if (erreurProfil || !profilData?.entreprise_id) {
    return NextResponse.json(
      {
        erreur:
          "Profil utilisateur introuvable. Impossible de vérifier les droits.",
      },
      { status: 403 }
    );
  }

  const entrepriseId = String(profilData.entreprise_id);

  const profil: ProfilUtilisateur = {
    id: String(profilData.id),
    entreprise_id: entrepriseId,
    role: profilData.role || null,
    email: profilData.email || null,
    nom: profilData.nom || null,
    prenom: profilData.prenom || null,
  };

  if (!roleAutorise(profil.role)) {
    return NextResponse.json(
      {
        erreur:
          "Action refusée. Seul un chef, administrateur ou gérant peut envoyer le PV au client.",
      },
      { status: 403 }
    );
  }

  let body: any = {};

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { erreur: "Requête invalide." },
      { status: 400 }
    );
  }

  const ficheId =
    typeof body.ficheId === "string"
      ? body.ficheId
      : typeof body.fiche_id === "string"
      ? body.fiche_id
      : "";

  const pvId =
    typeof body.pvId === "string"
      ? body.pvId
      : typeof body.pv_id === "string"
      ? body.pv_id
      : "";

  const destinataireEmail =
    nettoyerEmail(body.destinataireEmail) ||
    nettoyerEmail(body.email) ||
    nettoyerEmail(body.destinataire_email);

  const messagePersonnalise =
    typeof body.message === "string" ? body.message.trim() : "";

  if (!ficheId) {
    return NextResponse.json(
      { erreur: "Fiche intervention manquante." },
      { status: 400 }
    );
  }

  if (!destinataireEmail) {
    return NextResponse.json(
      { erreur: "Email destinataire manquant." },
      { status: 400 }
    );
  }

  const { data: ficheData, error: erreurFiche } = await supabaseAdmin
    .from("fiches_intervention")
    .select("*")
    .eq("entreprise_id", entrepriseId)
    .eq("id", ficheId)
    .maybeSingle();

  if (erreurFiche || !ficheData) {
    return NextResponse.json(
      {
        erreur:
          "Fiche intervention introuvable ou non rattachée à votre entreprise.",
      },
      { status: 404 }
    );
  }

  let requetePv = supabaseAdmin
    .from("pv_fin_chantier")
    .select("*")
    .eq("entreprise_id", entrepriseId)
    .eq("fiche_id", ficheId);

  if (pvId) {
    requetePv = requetePv.eq("id", pvId);
  }

  const { data: pvData, error: erreurPv } = await requetePv
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (erreurPv || !pvData) {
    return NextResponse.json(
      {
        erreur:
          "PV de fin de chantier introuvable. Enregistrez le PV avant de l’envoyer.",
      },
      { status: 404 }
    );
  }

  const parametresEntreprise = await chargerParametresEntrepriseDocument(
    entrepriseId
  );

  const sujet = `PV de fin de chantier ${
    ficheData.numero ? `- ${ficheData.numero}` : ""
  }`.trim();

  const message =
    messagePersonnalise ||
    `Bonjour,

Veuillez trouver en pièce jointe le PV de fin de chantier concernant l’intervention ${
      ficheData.titre || ficheData.type_intervention || ""
    }.

Cordialement,
${nomProfil(profil)}`;

  try {
    const DocumentPdf = PvFinChantierDocument as any;

    const documentPdf = React.createElement(DocumentPdf, {
      fiche: ficheData,
      pv: pvData,
      parametresEntreprise,
      photos: [],
    });

    const pdfBuffer = await renderToBuffer(documentPdf as any);

    const resend = new Resend(resendApiKey);

    const resultatEmail = await resend.emails.send({
      from: resendFromEmail,
      to: [destinataireEmail],
      subject: sujet,
      html: `
        <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.5;">
          <p>${texteVersHtml(message)}</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="font-size: 12px; color: #64748b;">
            Email envoyé depuis Arboboard.
          </p>
        </div>
      `,
      attachments: [
        {
          filename: nomFichierPdf(ficheData.numero || pvData.numero),
          content: pdfBuffer.toString("base64"),
        },
      ] as any,
    });

    if (resultatEmail.error) {
      await enregistrerHistoriqueEmail({
        supabaseAdmin,
        entrepriseId,
        ficheId,
        pvId: pvData.id || null,
        destinataireEmail,
        sujet,
        message,
        statut: "erreur",
        resendEmailId: null,
        erreur: resultatEmail.error.message,
        envoyePar: profil.id,
      });

      return NextResponse.json(
        {
          erreur:
            resultatEmail.error.message ||
            "Resend a refusé l’envoi de l’email.",
        },
        { status: 500 }
      );
    }

    await supabaseAdmin
      .from("pv_fin_chantier")
      .update({
        envoye_client_at: new Date().toISOString(),
        envoye_client_email: destinataireEmail,
      })
      .eq("entreprise_id", entrepriseId)
      .eq("id", pvData.id);

    await enregistrerHistoriqueEmail({
      supabaseAdmin,
      entrepriseId,
      ficheId,
      pvId: pvData.id || null,
      destinataireEmail,
      sujet,
      message,
      statut: "envoye",
      resendEmailId: resultatEmail.data?.id || null,
      erreur: null,
      envoyePar: profil.id,
    });

    return NextResponse.json({
      succes: true,
      message: "PV envoyé au client.",
      emailId: resultatEmail.data?.id || null,
      destinataireEmail,
    });
  } catch (error: any) {
    console.error("Erreur envoi email PV fin chantier :", error);

    await enregistrerHistoriqueEmail({
      supabaseAdmin,
      entrepriseId,
      ficheId,
      pvId: pvData.id || null,
      destinataireEmail,
      sujet,
      message,
      statut: "erreur",
      resendEmailId: null,
      erreur: error?.message || "Erreur inconnue pendant l’envoi.",
      envoyePar: profil.id,
    });

    return NextResponse.json(
      {
        erreur:
          error?.message ||
          "Impossible de générer ou d’envoyer le PV de fin de chantier.",
      },
      { status: 500 }
    );
  }
}