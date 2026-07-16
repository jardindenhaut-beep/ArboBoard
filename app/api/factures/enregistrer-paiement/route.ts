import {
  NextRequest,
  NextResponse,
} from "next/server";
import {
  createClient,
  type SupabaseClient,
} from "@supabase/supabase-js";

type ProfilChef = {
  id: string;
  role?: string | null;
  statut?: string | null;
  entreprise_id?: string | null;
};

type Facture = {
  id: string;
  entreprise_id: string;
  numero?: string | null;
  statut?: string | null;
  total_ttc?: number | string | null;
};

type DemandePaiementUrssaf = {
  id: string;
  entreprise_id: string;
  facture_id: string;
  urssaf_id_demande_paiement?: string | null;
  statut_local?: string | null;
  statut_urssaf_code?: string | null;
  statut_urssaf_libelle?: string | null;
  info_virement?: Record<string, unknown> | null;
  dernier_message?: string | null;
};

type CorpsPaiement = {
  factureId?: unknown;
  facture_id?: unknown;
  montant?: unknown;
  modePaiement?: unknown;
  mode_paiement?: unknown;
  referencePaiement?: unknown;
  reference_paiement?: unknown;
  note?: unknown;
  datePaiement?: unknown;
  date_paiement?: unknown;
  origineUrssaf?: unknown;
  source_paiement?: unknown;
  demandePaiementUrssafId?: unknown;
  demande_paiement_urssaf_id?: unknown;
};

type PaiementExistant = {
  id: string;
};

const ROLES_CHEF = new Set([
  "chef",
  "admin",
  "administrateur",
  "gerant",
  "dirigeant",
  "patron",
]);

function creerSupabaseAdmin() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const cleServeur =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !cleServeur) {
    throw new Error(
      "Configuration Supabase serveur manquante."
    );
  }

  return createClient(
    supabaseUrl,
    cleServeur,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  );
}

function normaliser(
  valeur: string | null | undefined
) {
  return String(valeur || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function nettoyerTexte(
  valeur: unknown,
  longueurMax = 1000
) {
  const texte = String(
    valeur ?? ""
  ).trim();

  return texte
    ? texte.slice(0, longueurMax)
    : null;
}

function nombreDepuisValeur(
  valeur: unknown
) {
  if (typeof valeur === "number") {
    return Number.isFinite(valeur)
      ? valeur
      : 0;
  }

  const resultat = Number.parseFloat(
    String(valeur ?? "")
      .replace(",", ".")
      .replace(/\s/g, "")
      .trim()
  );

  return Number.isFinite(resultat)
    ? resultat
    : 0;
}

function arrondir2(valeur: number) {
  return Math.round(
    (valeur + Number.EPSILON) * 100
  ) / 100;
}

function dateDuJour() {
  return new Date()
    .toISOString()
    .slice(0, 10);
}

function dateValide(
  valeur: string | null
) {
  if (
    !valeur ||
    !/^\d{4}-\d{2}-\d{2}$/.test(valeur)
  ) {
    return false;
  }

  const date = new Date(
    `${valeur}T00:00:00.000Z`
  );

  return !Number.isNaN(
    date.getTime()
  );
}

function obtenirToken(
  request: NextRequest
) {
  const autorisation =
    request.headers.get(
      "authorization"
    ) || "";

  if (
    !autorisation.startsWith(
      "Bearer "
    )
  ) {
    return null;
  }

  return autorisation
    .slice(7)
    .trim() || null;
}

async function authentifierChef(
  request: NextRequest,
  supabaseAdmin: SupabaseClient
) {
  const token = obtenirToken(request);

  if (!token) {
    return {
      erreur: NextResponse.json(
        {
          success: false,
          error:
            "Token d’authentification manquant.",
        },
        { status: 401 }
      ),
      profil: null,
      entrepriseId: null,
    };
  }

  const {
    data: { user },
    error: userError,
  } =
    await supabaseAdmin.auth.getUser(
      token
    );

  if (
    userError ||
    !user?.id
  ) {
    return {
      erreur: NextResponse.json(
        {
          success: false,
          error:
            "Utilisateur non connecté.",
        },
        { status: 401 }
      ),
      profil: null,
      entrepriseId: null,
    };
  }

  const {
    data: profil,
    error: profilError,
  } = await supabaseAdmin
    .from("profils_utilisateurs")
    .select(
      "id, role, statut, entreprise_id"
    )
    .eq("id", user.id)
    .maybeSingle();

  if (
    profilError ||
    !profil?.entreprise_id
  ) {
    return {
      erreur: NextResponse.json(
        {
          success: false,
          error:
            "Profil utilisateur introuvable.",
        },
        { status: 403 }
      ),
      profil: null,
      entrepriseId: null,
    };
  }

  const profilChef =
    profil as ProfilChef;

  if (
    !ROLES_CHEF.has(
      normaliser(profilChef.role)
    ) ||
    (
      profilChef.statut &&
      normaliser(
        profilChef.statut
      ) !== "actif"
    )
  ) {
    return {
      erreur: NextResponse.json(
        {
          success: false,
          error:
            "Accès refusé. Seul un chef actif peut gérer les paiements.",
        },
        { status: 403 }
      ),
      profil: null,
      entrepriseId: null,
    };
  }

  return {
    erreur: null,
    profil: profilChef,
    entrepriseId:
      profilChef.entreprise_id,
  };
}

async function chargerFacture({
  supabaseAdmin,
  entrepriseId,
  factureId,
}: {
  supabaseAdmin: SupabaseClient;
  entrepriseId: string;
  factureId: string;
}) {
  const {
    data,
    error,
  } = await supabaseAdmin
    .from("factures")
    .select(
      "id, entreprise_id, numero, statut, total_ttc"
    )
    .eq("id", factureId)
    .eq(
      "entreprise_id",
      entrepriseId
    )
    .maybeSingle();

  if (error || !data) {
    throw new Error(
      "Facture introuvable."
    );
  }

  return data as Facture;
}

async function recalculerPaiementsFacture({
  supabaseAdmin,
  entrepriseId,
  factureId,
  totalTtc,
  statutActuel,
}: {
  supabaseAdmin: SupabaseClient;
  entrepriseId: string;
  factureId: string;
  totalTtc: number;
  statutActuel?: string | null;
}) {
  const {
    data: paiements,
    error,
  } = await supabaseAdmin
    .from("factures_paiements")
    .select("montant")
    .eq(
      "entreprise_id",
      entrepriseId
    )
    .eq("facture_id", factureId);

  if (error) {
    throw new Error(
      error.message ||
        "Impossible de recalculer les paiements."
    );
  }

  const montantPaye = arrondir2(
    (paiements || []).reduce(
      (
        total: number,
        paiement: {
          montant?: unknown;
        }
      ) =>
        total +
        nombreDepuisValeur(
          paiement.montant
        ),
      0
    )
  );

  const resteAPayer = arrondir2(
    Math.max(
      totalTtc - montantPaye,
      0
    )
  );

  return {
    montantPaye,
    resteAPayer,
    statut:
      resteAPayer <= 0
        ? "payee"
        : statutActuel ===
            "en_retard"
          ? "en_retard"
          : "envoyee",
  };
}

function extraireInfoVirement(
  valeur:
    | Record<string, unknown>
    | null
    | undefined
) {
  if (!valeur) {
    return {
      montant: 0,
      date: null as string | null,
    };
  }

  const montant = arrondir2(
    nombreDepuisValeur(
      valeur.mntVirement ??
        valeur.montantVirement ??
        valeur.montant
    )
  );

  const dateBrute =
    nettoyerTexte(
      valeur.dateVirement ??
        valeur.date_virement ??
        valeur.date,
      40
    );

  const date =
    dateBrute
      ? dateBrute.slice(0, 10)
      : null;

  return {
    montant,
    date:
      dateValide(date)
        ? date
        : null,
  };
}

async function chargerDemandeUrssaf({
  supabaseAdmin,
  entrepriseId,
  factureId,
  demandeId,
}: {
  supabaseAdmin: SupabaseClient;
  entrepriseId: string;
  factureId: string;
  demandeId?: string | null;
}) {
  let requete = supabaseAdmin
    .from(
      "demandes_paiement_urssaf"
    )
    .select(
      "id, entreprise_id, facture_id, urssaf_id_demande_paiement, statut_local, statut_urssaf_code, statut_urssaf_libelle, info_virement, dernier_message"
    )
    .eq(
      "entreprise_id",
      entrepriseId
    )
    .eq("facture_id", factureId);

  if (demandeId) {
    requete = requete.eq(
      "id",
      demandeId
    );
  }

  const {
    data,
    error,
  } = await requete.maybeSingle();

  if (error) {
    throw error;
  }

  return (
    data as
      | DemandePaiementUrssaf
      | null
  );
}

async function paiementUrssafExistant({
  supabaseAdmin,
  entrepriseId,
  demandeId,
}: {
  supabaseAdmin: SupabaseClient;
  entrepriseId: string;
  demandeId: string;
}) {
  const {
    data,
    error,
  } = await supabaseAdmin
    .from("factures_paiements")
    .select("id")
    .eq(
      "entreprise_id",
      entrepriseId
    )
    .eq(
      "demande_paiement_urssaf_id",
      demandeId
    )
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (
    data as
      | PaiementExistant
      | null
  );
}

async function journaliser({
  supabaseAdmin,
  entrepriseId,
  action,
  paiementId,
  factureId,
  details,
}: {
  supabaseAdmin: SupabaseClient;
  entrepriseId: string;
  action: string;
  paiementId: string;
  factureId: string;
  details: Record<
    string,
    unknown
  >;
}) {
  const { error } =
    await supabaseAdmin.rpc(
      "arboboard_ecrire_journal",
      {
        p_entreprise_id:
          entrepriseId,
        p_action: action,
        p_categorie:
          "facturation",
        p_ressource_type:
          "facture_paiement",
        p_ressource_id:
          paiementId,
        p_resultat: "succes",
        p_description:
          action ===
          "virement_urssaf_rapproche"
            ? "Rapprochement manuel d’un virement URSSAF avec une facture."
            : "Enregistrement manuel d’un paiement de facture.",
        p_details: {
          facture_id: factureId,
          ...details,
        },
      }
    );

  if (error) {
    return;
  }
}

export async function GET(
  request: NextRequest
) {
  try {
    const supabaseAdmin =
      creerSupabaseAdmin();

    const authentification =
      await authentifierChef(
        request,
        supabaseAdmin
      );

    if (
      authentification.erreur ||
      !authentification.entrepriseId
    ) {
      return (
        authentification.erreur ??
        NextResponse.json(
          {
            success: false,
            error:
              "Impossible de vérifier l’accès.",
          },
          { status: 500 }
        )
      );
    }

    const factureId =
      new URL(request.url)
        .searchParams
        .get("factureId")
        ?.trim() || "";

    if (!factureId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Identifiant de facture manquant.",
        },
        { status: 400 }
      );
    }

    await chargerFacture({
      supabaseAdmin,
      entrepriseId:
        authentification
          .entrepriseId,
      factureId,
    });

    const demande =
      await chargerDemandeUrssaf({
        supabaseAdmin,
        entrepriseId:
          authentification
            .entrepriseId,
        factureId,
      });

    if (!demande) {
      return NextResponse.json({
        success: true,
        urssaf: {
          existe: false,
          disponible: false,
          deja_rapproche: false,
          message:
            "Aucune demande de paiement URSSAF n’est associée à cette facture.",
        },
      });
    }

    const paiementExistant =
      await paiementUrssafExistant({
        supabaseAdmin,
        entrepriseId:
          authentification
            .entrepriseId,
        demandeId: demande.id,
      });

    const infoVirement =
      extraireInfoVirement(
        demande.info_virement
      );

    const payee =
      demande.statut_local ===
      "payee";

    const disponible =
      payee &&
      infoVirement.montant > 0 &&
      Boolean(infoVirement.date) &&
      !paiementExistant;

    let message =
      demande.dernier_message ||
      demande.statut_urssaf_libelle ||
      "La demande URSSAF n’est pas encore payable.";

    if (paiementExistant) {
      message =
        "Ce virement URSSAF est déjà rapproché avec la facture.";
    } else if (
      payee &&
      (
        infoVirement.montant <= 0 ||
        !infoVirement.date
      )
    ) {
      message =
        "L’URSSAF indique un paiement, mais les informations de virement sont encore incomplètes.";
    } else if (disponible) {
      message =
        "Le virement URSSAF est disponible pour un rapprochement manuel.";
    }

    return NextResponse.json({
      success: true,
      urssaf: {
        existe: true,
        disponible,
        deja_rapproche:
          Boolean(paiementExistant),
        demande_id: demande.id,
        id_demande_paiement:
          demande
            .urssaf_id_demande_paiement ||
          null,
        statut_local:
          demande.statut_local ||
          null,
        statut_urssaf_code:
          demande
            .statut_urssaf_code ||
          null,
        statut_urssaf_libelle:
          demande
            .statut_urssaf_libelle ||
          null,
        montant_virement:
          infoVirement.montant,
        date_virement:
          infoVirement.date,
        message,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Impossible de charger le virement URSSAF.",
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest
) {
  try {
    const supabaseAdmin =
      creerSupabaseAdmin();

    const authentification =
      await authentifierChef(
        request,
        supabaseAdmin
      );

    if (
      authentification.erreur ||
      !authentification.profil ||
      !authentification.entrepriseId
    ) {
      return (
        authentification.erreur ??
        NextResponse.json(
          {
            success: false,
            error:
              "Impossible de vérifier l’accès.",
          },
          { status: 500 }
        )
      );
    }

    const body =
      await request
        .json()
        .catch(
          () => null
        ) as
        | CorpsPaiement
        | null;

    const factureId = String(
      body?.factureId ??
        body?.facture_id ??
        ""
    ).trim();

    const origineUrssaf =
      body?.origineUrssaf === true ||
      body?.source_paiement ===
        "urssaf";

    const demandeUrssafId =
      nettoyerTexte(
        body
          ?.demandePaiementUrssafId ??
          body
            ?.demande_paiement_urssaf_id,
        100
      );

    if (!factureId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Identifiant de facture manquant.",
        },
        { status: 400 }
      );
    }

    const entrepriseId =
      authentification.entrepriseId;

    const facture =
      await chargerFacture({
        supabaseAdmin,
        entrepriseId,
        factureId,
      });

    if (
      facture.statut ===
        "annulee" ||
      facture.statut ===
        "archive"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Impossible d’encaisser une facture annulée ou archivée.",
        },
        { status: 400 }
      );
    }

    const totalTtc = arrondir2(
      nombreDepuisValeur(
        facture.total_ttc
      )
    );

    const recalculAvant =
      await recalculerPaiementsFacture({
        supabaseAdmin,
        entrepriseId,
        factureId,
        totalTtc,
        statutActuel:
          facture.statut,
      });

    const resteActuel =
      recalculAvant.resteAPayer;

    if (resteActuel <= 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Cette facture est déjà entièrement payée.",
        },
        { status: 400 }
      );
    }

    let montant = arrondir2(
      nombreDepuisValeur(
        body?.montant
      )
    );

    let modePaiement =
      nettoyerTexte(
        body?.modePaiement ??
          body?.mode_paiement,
        100
      );

    let referencePaiement =
      nettoyerTexte(
        body?.referencePaiement ??
          body?.reference_paiement,
        500
      );

    let note = nettoyerTexte(
      body?.note,
      1000
    );

    let datePaiement =
      nettoyerTexte(
        body?.datePaiement ??
          body?.date_paiement,
        10
      ) || dateDuJour();

    let sourcePaiement:
      | "manuel"
      | "urssaf" =
      "manuel";

    let demandePaiementUrssafId:
      string | null = null;

    if (origineUrssaf) {
      if (!demandeUrssafId) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Demande de paiement URSSAF manquante.",
          },
          { status: 400 }
        );
      }

      const demande =
        await chargerDemandeUrssaf({
          supabaseAdmin,
          entrepriseId,
          factureId,
          demandeId:
            demandeUrssafId,
        });

      if (!demande) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Demande de paiement URSSAF introuvable.",
          },
          { status: 404 }
        );
      }

      if (
        demande.statut_local !==
        "payee"
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Le virement ne peut pas être rapproché tant que l’URSSAF ne l’indique pas comme payé.",
          },
          { status: 400 }
        );
      }

      const paiementExistant =
        await paiementUrssafExistant({
          supabaseAdmin,
          entrepriseId,
          demandeId:
            demande.id,
        });

      if (paiementExistant) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Ce virement URSSAF a déjà été rapproché.",
          },
          { status: 409 }
        );
      }

      const infoVirement =
        extraireInfoVirement(
          demande.info_virement
        );

      if (
        infoVirement.montant <= 0 ||
        !infoVirement.date
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Le montant ou la date du virement URSSAF est indisponible.",
          },
          { status: 400 }
        );
      }

      montant =
        infoVirement.montant;
      datePaiement =
        infoVirement.date;
      modePaiement =
        "virement_urssaf";
      referencePaiement =
        demande
          .urssaf_id_demande_paiement ||
        `URSSAF-${demande.id}`;
      note =
        "Virement URSSAF rapproché manuellement depuis la demande d’Avance immédiate.";
      sourcePaiement = "urssaf";
      demandePaiementUrssafId =
        demande.id;
    }

    if (montant <= 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Le montant du paiement doit être supérieur à 0.",
        },
        { status: 400 }
      );
    }

    if (!dateValide(datePaiement)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "La date du paiement est invalide.",
        },
        { status: 400 }
      );
    }

    if (
      montant >
      resteActuel + 0.01
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            `Le paiement dépasse le reste à payer. Reste actuel : ${resteActuel.toFixed(
              2
            )} €`,
        },
        { status: 400 }
      );
    }

    const montantEnregistre =
      montant > resteActuel
        ? resteActuel
        : montant;

    const maintenant =
      new Date().toISOString();

    const {
      data: paiementCree,
      error: paiementError,
    } = await supabaseAdmin
      .from("factures_paiements")
      .insert({
        entreprise_id:
          entrepriseId,
        facture_id: factureId,
        montant:
          montantEnregistre,
        mode_paiement:
          modePaiement,
        reference_paiement:
          referencePaiement,
        note,
        date_paiement:
          datePaiement,
        enregistre_par:
          authentification
            .profil.id,
        source_paiement:
          sourcePaiement,
        demande_paiement_urssaf_id:
          demandePaiementUrssafId,
        rapprochement_urssaf_at:
          sourcePaiement ===
          "urssaf"
            ? maintenant
            : null,
      })
      .select("*")
      .single();

    if (
      paiementError ||
      !paiementCree?.id
    ) {
      if (
        paiementError?.code ===
        "23505" &&
        sourcePaiement ===
          "urssaf"
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Ce virement URSSAF a déjà été rapproché.",
          },
          { status: 409 }
        );
      }

      throw (
        paiementError ||
        new Error(
          "Impossible d’enregistrer le paiement."
        )
      );
    }

    const recalcul =
      await recalculerPaiementsFacture({
        supabaseAdmin,
        entrepriseId,
        factureId,
        totalTtc,
        statutActuel:
          facture.statut,
      });

    const {
      data: factureMaj,
      error: updateError,
    } = await supabaseAdmin
      .from("factures")
      .update({
        montant_paye:
          recalcul.montantPaye,
        reste_a_payer:
          recalcul.resteAPayer,
        statut: recalcul.statut,
      })
      .eq("id", factureId)
      .eq(
        "entreprise_id",
        entrepriseId
      )
      .select("*")
      .single();

    if (updateError) {
      throw new Error(
        updateError.message ||
          "Paiement enregistré, mais impossible de mettre à jour la facture."
      );
    }

    await journaliser({
      supabaseAdmin,
      entrepriseId,
      action:
        sourcePaiement ===
        "urssaf"
          ? "virement_urssaf_rapproche"
          : "paiement_facture_enregistre",
      paiementId:
        paiementCree.id,
      factureId,
      details: {
        montant:
          montantEnregistre,
        date_paiement:
          datePaiement,
        mode_paiement:
          modePaiement,
        demande_paiement_urssaf_id:
          demandePaiementUrssafId,
      },
    });

    return NextResponse.json({
      success: true,
      message:
        sourcePaiement ===
        "urssaf"
          ? recalcul.resteAPayer <=
            0
            ? "Virement URSSAF rapproché. La facture est maintenant payée."
            : "Virement URSSAF rapproché avec la facture."
          : recalcul.resteAPayer <=
              0
            ? "Paiement enregistré. La facture est maintenant payée."
            : "Paiement enregistré avec succès.",
      paiement: paiementCree,
      facture: factureMaj,
      montantPaye:
        recalcul.montantPaye,
      resteAPayer:
        recalcul.resteAPayer,
      statut: recalcul.statut,
    });
  } catch (error) {
    console.error(
      "Erreur enregistrement paiement facture :",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Une erreur est survenue pendant l’enregistrement du paiement.",
      },
      { status: 500 }
    );
  }
}