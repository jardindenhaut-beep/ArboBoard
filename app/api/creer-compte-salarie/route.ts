import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  entetesLimiteRequetes,
  obtenirAdresseIp,
  verifierLimiteRequetes,
} from "@/lib/securite/limiteurRequetes";

type BodyCreationSalarie = {
  salarieId?: string;
  email: string;
  nom: string;
  prenom: string;
  telephone?: string;
};

function limiteUtilisateursSelonPlan(plan: string) {
  if (plan === "dev") return 999;
  if (plan === "expert") return 10;
  if (plan === "pro") return 3;
  if (plan === "essentiel") return 1;
  if (plan === "essai") return 3;
  return 1;
}

function planAutoriseSalaries(plan: string) {
  return [
    "pro",
    "expert",
    "dev",
    "essai",
  ].includes(plan);
}

function normaliserTelephone(
  valeur: string | undefined
) {
  const brut = String(valeur || "").trim();

  if (!brut) return null;

  let numero = brut.replace(/[()\s.-]/g, "");

  if (numero.startsWith("00")) {
    numero = `+${numero.slice(2)}`;
  }

  if (/^0[67]\d{8}$/.test(numero)) {
    numero = `+33${numero.slice(1)}`;
  } else if (/^33[67]\d{8}$/.test(numero)) {
    numero = `+${numero}`;
  }

  if (!/^\+[1-9]\d{7,14}$/.test(numero)) {
    throw new Error(
      "Le numéro de téléphone n’est pas valide. Utilisez par exemple 06 12 34 56 78."
    );
  }

  return numero;
}

export async function POST(request: Request) {
  const ip = obtenirAdresseIp(request);

  const limiteIp = verifierLimiteRequetes({
    cle: `creation-salarie:ip:${ip}`,
    limite: 30,
    fenetreMs: 15 * 60 * 1000,
  });

  if (!limiteIp.autorise) {
    return NextResponse.json(
      {
        error:
          "Trop de tentatives de création d’accès salarié. Réessaie dans quelques minutes.",
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

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        {
          error:
            "Configuration Supabase manquante. Vérifiez les variables serveur.",
        },
        { status: 500 }
      );
    }

    const authHeader =
      request.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Utilisateur non authentifié." },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");

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
      error: erreurUtilisateur,
    } = await supabaseAdmin.auth.getUser(token);

    if (erreurUtilisateur || !user) {
      return NextResponse.json(
        {
          error:
            "Session chef invalide. Reconnectez-vous.",
        },
        { status: 401 }
      );
    }

    const limiteChef = verifierLimiteRequetes({
      cle: `creation-salarie:chef:${user.id}`,
      limite: 12,
      fenetreMs: 60 * 60 * 1000,
    });

    if (!limiteChef.autorise) {
      return NextResponse.json(
        {
          error:
            "Trop de créations ou d’invitations ont été demandées. Réessaie plus tard.",
        },
        {
          status: 429,
          headers: entetesLimiteRequetes(
            limiteChef
          ),
        }
      );
    }

    const { data: profilChef, error: erreurProfilChef } =
      await supabaseAdmin
        .from("profils_utilisateurs")
        .select(
          "id, email, role, statut, entreprise_id"
        )
        .eq("id", user.id)
        .maybeSingle();

    if (erreurProfilChef || !profilChef) {
      return NextResponse.json(
        { error: "Profil chef introuvable." },
        { status: 403 }
      );
    }

    if (
      profilChef.role !== "chef" ||
      (profilChef.statut &&
        profilChef.statut !== "actif")
    ) {
      return NextResponse.json(
        {
          error:
            "Seul un compte chef actif peut créer un accès salarié.",
        },
        { status: 403 }
      );
    }

    if (!profilChef.entreprise_id) {
      return NextResponse.json(
        {
          error:
            "Aucune entreprise rattachée au compte chef.",
        },
        { status: 400 }
      );
    }

    const { data: entreprise, error: erreurEntreprise } =
      await supabaseAdmin
        .from("entreprises_abonnees")
        .select(
          "id, nom_entreprise, plan_abonnement, statut_abonnement"
        )
        .eq("id", profilChef.entreprise_id)
        .maybeSingle();

    if (erreurEntreprise || !entreprise) {
      return NextResponse.json(
        { error: "Entreprise introuvable." },
        { status: 404 }
      );
    }

    const plan =
      entreprise.plan_abonnement || "essai";
    const statut =
      entreprise.statut_abonnement || "essai";

    if (
      ["suspendu", "annule", "annulé"].includes(
        statut
      )
    ) {
      return NextResponse.json(
        {
          error:
            "L’abonnement de l’entreprise est suspendu ou annulé.",
        },
        { status: 403 }
      );
    }

    if (!planAutoriseSalaries(plan)) {
      return NextResponse.json(
        {
          error:
            "Votre plan actuel ne permet pas de créer des accès salariés.",
        },
        { status: 403 }
      );
    }

    const limiteUtilisateurs =
      limiteUtilisateursSelonPlan(plan);

    const {
      count: nombreUtilisateurs,
      error: erreurComptage,
    } = await supabaseAdmin
      .from("profils_utilisateurs")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq(
        "entreprise_id",
        profilChef.entreprise_id
      )
      .eq("statut", "actif");

    if (erreurComptage) {
      console.error(
        "Erreur comptage utilisateurs actifs :",
        erreurComptage
      );

      return NextResponse.json(
        {
          error:
            "Impossible de vérifier le nombre d’utilisateurs actifs.",
        },
        { status: 500 }
      );
    }

    const body =
      (await request.json()) as BodyCreationSalarie;

    const email = body.email
      ?.trim()
      .toLowerCase();
    const nom = body.nom?.trim() || "";
    const prenom = body.prenom?.trim() || "";
    const telephone =
      normaliserTelephone(body.telephone);

    if (!email) {
      return NextResponse.json(
        {
          error:
            "L’email du salarié est obligatoire.",
        },
        { status: 400 }
      );
    }

    if (!nom && !prenom) {
      return NextResponse.json(
        {
          error:
            "Le nom ou le prénom du salarié est obligatoire.",
        },
        { status: 400 }
      );
    }

    const { data: listeUtilisateurs, error: listeError } =
      await supabaseAdmin.auth.admin.listUsers();

    if (listeError) {
      return NextResponse.json(
        {
          error:
            "Impossible de vérifier les comptes existants.",
        },
        { status: 500 }
      );
    }

    const emailDejaUtilise =
      listeUtilisateurs.users.find(
        (utilisateur) =>
          utilisateur.email?.toLowerCase() === email
      );

    const profilDejaDansEntreprise =
      emailDejaUtilise
        ? await supabaseAdmin
            .from("profils_utilisateurs")
            .select(
              "id, email, role, entreprise_id, statut"
            )
            .eq("id", emailDejaUtilise.id)
            .maybeSingle()
        : { data: null, error: null };

    if (
      profilDejaDansEntreprise.data &&
      profilDejaDansEntreprise.data
        .entreprise_id !==
        profilChef.entreprise_id
    ) {
      return NextResponse.json(
        {
          error:
            "Cet email est déjà utilisé par une autre entreprise.",
        },
        { status: 400 }
      );
    }

    if (
      profilDejaDansEntreprise.data?.role ===
      "chef"
    ) {
      return NextResponse.json(
        {
          error:
            "Cet email correspond déjà à un compte chef.",
        },
        { status: 400 }
      );
    }

    const utilisateurDejaCompte =
      Boolean(emailDejaUtilise);

    if (
      !utilisateurDejaCompte &&
      (nombreUtilisateurs || 0) >=
        limiteUtilisateurs
    ) {
      return NextResponse.json(
        {
          error: `Limite atteinte pour le plan ${plan}. Le plan autorise ${limiteUtilisateurs} utilisateur${
            limiteUtilisateurs > 1 ? "s" : ""
          } actif${
            limiteUtilisateurs > 1 ? "s" : ""
          }.`,
        },
        { status: 403 }
      );
    }

    const origin =
      request.headers.get("origin") ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "https://arboboard.fr";

    const redirectTo =
      `${origin}/auth/set-password`;

    let userSalarieId = "";

    if (emailDejaUtilise) {
      userSalarieId = emailDejaUtilise.id;
    } else {
      const {
        data: invitation,
        error: erreurInvitation,
      } =
        await supabaseAdmin.auth.admin.inviteUserByEmail(
          email,
          {
            redirectTo,
            data: {
              nom,
              prenom,
              telephone,
              role: "salarie",
              entreprise_id:
                profilChef.entreprise_id,
            },
          }
        );

      if (
        erreurInvitation ||
        !invitation.user
      ) {
        console.error(
          "Erreur invitation salarié :",
          erreurInvitation
        );

        return NextResponse.json(
          {
            error:
              "Impossible d’envoyer l’invitation.",
          },
          { status: 400 }
        );
      }

      userSalarieId = invitation.user.id;
    }

    const { error: erreurProfilSalarie } =
      await supabaseAdmin
        .from("profils_utilisateurs")
        .upsert(
          {
            id: userSalarieId,
            email,
            role: "salarie",
            nom: nom || null,
            prenom: prenom || null,
            statut: "actif",
            entreprise_id:
              profilChef.entreprise_id,
            telephone_mfa: telephone,
          },
          {
            onConflict: "id",
          }
        );

    if (erreurProfilSalarie) {
      console.error(
        "Erreur création ou mise à jour du profil salarié :",
        erreurProfilSalarie
      );

      return NextResponse.json(
        {
          error:
            "Le profil salarié n’a pas pu être créé.",
        },
        { status: 500 }
      );
    }

    let salarieId = body.salarieId || "";

    if (!salarieId) {
      const { data: salarieExistant } =
        await supabaseAdmin
          .from("salaries")
          .select("id")
          .eq(
            "entreprise_id",
            profilChef.entreprise_id
          )
          .ilike("email", email)
          .limit(1)
          .maybeSingle();

      salarieId = salarieExistant?.id || "";
    }

    if (salarieId) {
      const { error: erreurMiseAJourSalarie } =
        await supabaseAdmin
          .from("salaries")
          .update({
            email,
            nom: nom || null,
            prenom: prenom || null,
            telephone,
            user_id: userSalarieId,
            profil_id: userSalarieId,
            statut: "Actif",
            updated_at:
              new Date().toISOString(),
          })
          .eq("id", salarieId)
          .eq(
            "entreprise_id",
            profilChef.entreprise_id
          );

      if (erreurMiseAJourSalarie) {
        console.error(
          "Erreur liaison fiche salarié et compte utilisateur :",
          erreurMiseAJourSalarie
        );

        return NextResponse.json(
          {
            error:
              "Le compte a été créé, mais la fiche salarié n’a pas pu être liée.",
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: utilisateurDejaCompte
        ? "Profil salarié rattaché à l’entreprise."
        : "Invitation envoyée au salarié.",
      userId: userSalarieId,
      salarieId: salarieId || null,
      plan,
      limiteUtilisateurs,
      nombreUtilisateursAvantCreation:
        nombreUtilisateurs || 0,
    });
  } catch (error) {
    console.error(
      "Erreur création du compte salarié :",
      error
    );

    return NextResponse.json(
      {
        error:
          "Une erreur est survenue pendant la création du compte salarié.",
      },
      { status: 500 }
    );
  }
}