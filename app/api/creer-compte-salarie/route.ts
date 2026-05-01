import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type BodyCreationSalarie = {
  salarieId?: string;
  email: string;
  nom: string;
  prenom: string;
  telephone?: string;
};

function limiteUtilisateursSelonPlan(plan: string) {
  if (plan === "dev") {
    return 999;
  }

  if (plan === "expert") {
    return 10;
  }

  if (plan === "pro") {
    return 3;
  }

  if (plan === "essentiel") {
    return 1;
  }

  if (plan === "essai") {
    return 3;
  }

  return 1;
}

function planAutoriseSalaries(plan: string) {
  return plan === "pro" || plan === "expert" || plan === "dev" || plan === "essai";
}

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        {
          error:
            "Configuration Supabase manquante. Vérifie NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY.",
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
      error: erreurUtilisateur,
    } = await supabaseAdmin.auth.getUser(token);

    if (erreurUtilisateur || !user) {
      return NextResponse.json(
        { error: "Session chef invalide. Reconnecte-toi." },
        { status: 401 }
      );
    }

    const { data: profilChef, error: erreurProfilChef } = await supabaseAdmin
      .from("profils_utilisateurs")
      .select("id, email, role, entreprise_id")
      .eq("id", user.id)
      .single();

    if (erreurProfilChef || !profilChef) {
      return NextResponse.json(
        { error: "Profil chef introuvable." },
        { status: 403 }
      );
    }

    if (profilChef.role !== "chef") {
      return NextResponse.json(
        { error: "Seul un compte chef peut créer un accès salarié." },
        { status: 403 }
      );
    }

    if (!profilChef.entreprise_id) {
      return NextResponse.json(
        { error: "Aucune entreprise rattachée au compte chef." },
        { status: 400 }
      );
    }

    const { data: entreprise, error: erreurEntreprise } = await supabaseAdmin
      .from("entreprises_abonnees")
      .select("id, nom_entreprise, plan_abonnement, statut_abonnement")
      .eq("id", profilChef.entreprise_id)
      .maybeSingle();

    if (erreurEntreprise || !entreprise) {
      return NextResponse.json(
        { error: "Entreprise introuvable." },
        { status: 404 }
      );
    }

    const plan = entreprise.plan_abonnement || "essai";
    const statut = entreprise.statut_abonnement || "essai";

    if (statut === "suspendu" || statut === "annule" || statut === "annulé") {
      return NextResponse.json(
        {
          error:
            "L’abonnement de l’entreprise est suspendu ou annulé. Impossible de créer un accès salarié.",
        },
        { status: 403 }
      );
    }

    if (!planAutoriseSalaries(plan)) {
      return NextResponse.json(
        {
          error:
            "Ton plan actuel ne permet pas de créer des accès salariés. Passe au plan Pro ou Expert.",
        },
        { status: 403 }
      );
    }

    const limiteUtilisateurs = limiteUtilisateursSelonPlan(plan);

    const { count: nombreUtilisateurs, error: erreurComptage } =
      await supabaseAdmin
        .from("profils_utilisateurs")
        .select("id", { count: "exact", head: true })
        .eq("entreprise_id", profilChef.entreprise_id)
        .eq("statut", "actif");

    if (erreurComptage) {
      return NextResponse.json(
        {
          error:
            erreurComptage.message ||
            "Impossible de vérifier le nombre d’utilisateurs actifs.",
        },
        { status: 500 }
      );
    }

    if ((nombreUtilisateurs || 0) >= limiteUtilisateurs) {
      return NextResponse.json(
        {
          error: `Limite atteinte pour ton plan ${plan}. Ton plan autorise ${limiteUtilisateurs} utilisateur${
            limiteUtilisateurs > 1 ? "s" : ""
          } actif${limiteUtilisateurs > 1 ? "s" : ""}.`,
        },
        { status: 403 }
      );
    }

    const body = (await request.json()) as BodyCreationSalarie;

    const email = body.email?.trim().toLowerCase();
    const nom = body.nom?.trim() || "";
    const prenom = body.prenom?.trim() || "";
    const telephone = body.telephone?.trim() || "";

    if (!email) {
      return NextResponse.json(
        { error: "L'email du salarié est obligatoire." },
        { status: 400 }
      );
    }

    if (!nom && !prenom) {
      return NextResponse.json(
        { error: "Le nom ou le prénom du salarié est obligatoire." },
        { status: 400 }
      );
    }

    const { data: utilisateurExistant } =
      await supabaseAdmin.auth.admin.listUsers();

    const emailDejaUtilise = utilisateurExistant.users.find(
      (u) => u.email?.toLowerCase() === email
    );

    if (emailDejaUtilise) {
      const { data: profilExistant } = await supabaseAdmin
        .from("profils_utilisateurs")
        .select("id, email, role, entreprise_id")
        .eq("id", emailDejaUtilise.id)
        .maybeSingle();

      if (
        profilExistant &&
        profilExistant.entreprise_id !== profilChef.entreprise_id
      ) {
        return NextResponse.json(
          {
            error:
              "Cet email est déjà utilisé par une autre entreprise. Utilise un autre email.",
          },
          { status: 400 }
        );
      }

      if (profilExistant?.role === "chef") {
        return NextResponse.json(
          {
            error:
              "Cet email correspond déjà à un compte chef. Utilise un email salarié différent.",
          },
          { status: 400 }
        );
      }
    }

    const origin =
      request.headers.get("origin") ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "https://arboboard.fr";

    const redirectTo = `${origin}/auth/set-password`;

    let userSalarieId = "";

    if (emailDejaUtilise) {
      userSalarieId = emailDejaUtilise.id;
    } else {
      const { data: invitation, error: erreurInvitation } =
        await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
          redirectTo,
          data: {
            nom,
            prenom,
            telephone,
            role: "salarie",
            entreprise_id: profilChef.entreprise_id,
          },
        });

      if (erreurInvitation || !invitation.user) {
        return NextResponse.json(
          {
            error:
              erreurInvitation?.message ||
              "Impossible d'envoyer l'invitation. L'email est peut-être déjà utilisé.",
          },
          { status: 400 }
        );
      }

      userSalarieId = invitation.user.id;
    }

    const { error: erreurProfilSalarie } = await supabaseAdmin
      .from("profils_utilisateurs")
      .upsert({
        id: userSalarieId,
        email,
        role: "salarie",
        nom,
        prenom,
        statut: "actif",
        entreprise_id: profilChef.entreprise_id,
      });

    if (erreurProfilSalarie) {
      return NextResponse.json(
        {
          error:
            erreurProfilSalarie.message ||
            "L'invitation a été envoyée mais le profil salarié n'a pas pu être créé.",
        },
        { status: 500 }
      );
    }

    if (body.salarieId) {
      await supabaseAdmin
        .from("salaries")
        .update({
          email,
          nom,
          prenom,
          telephone,
          statut: "Actif",
          updated_at: new Date().toISOString(),
        })
        .eq("id", body.salarieId)
        .eq("entreprise_id", profilChef.entreprise_id);
    }

    return NextResponse.json({
      success: true,
      message: emailDejaUtilise
        ? "Profil salarié rattaché à l’entreprise."
        : "Invitation envoyée au salarié.",
      userId: userSalarieId,
      plan,
      limiteUtilisateurs,
      nombreUtilisateursAvantCreation: nombreUtilisateurs || 0,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Erreur inconnue lors de l'envoi de l'invitation salarié.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}