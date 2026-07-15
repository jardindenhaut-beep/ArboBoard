import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  chiffrerIdentifiant,
  dechiffrerIdentifiant,
} from "@/lib/server/chiffrementIdentifiants";
import {
  ErreurApiUrssaf,
  obtenirJetonUrssaf,
} from "@/lib/server/urssafTp";
import {
  rechercherDemandePaiementUrssaf,
  transmettreDemandePaiementUrssaf,
  type DemandePaiementUrssafPayload,
  type PrestationDemandePaiementUrssaf,
} from "@/lib/server/urssafDemandesPaiement";

type ContexteRoute = {
  params: Promise<{
    factureId: string;
  }>;
};

type ProfilChef = {
  id: string;
  role?: string | null;
  statut?: string | null;
  entreprise_id?: string | null;
};

type Facture = {
  id: string;
  entreprise_id: string;
  client_id?: string | null;
  numero?: string | null;
  date_facture?: string | null;
  statut?: string | null;
  type_facture?: string | null;
  est_avoir?: boolean | null;
  total_ht?: number | null;
  total_tva?: number | null;
  total_ttc?: number | null;
};

type FactureLigne = {
  id: string;
  facture_id: string;
  designation?: string | null;
  description?: string | null;
  quantite?: number | null;
  unite?: string | null;
  prix_unitaire_ht?: number | null;
  tva?: number | null;
  total_ht?: number | null;
  total_tva?: number | null;
  total_ttc?: number | null;
  ordre?: number | null;
};

type Client = {
  id: string;
  type_client?: string | null;
};

type ClientUrssaf = {
  id: string;
  donnees_chiffrees: string;
  urssaf_id_client?: string | null;
  statut_inscription: string;
  statut_transmission_etat?: string | null;
};

type IntegrationUrssaf = {
  id: string;
  numero_sap: string;
  client_id_chiffre: string;
  client_secret_chiffre: string;
  actif: boolean;
  statut: string;
};

type DemandeStockee = {
  id: string;
  facture_id: string;
  client_id: string;
  urssaf_id_demande_paiement?: string | null;
  numero_facture: string;
  date_facture: string;
  date_debut_emploi: string;
  date_fin_emploi: string;
  montant_facture_ht: number;
  montant_facture_tva: number;
  montant_facture_ttc: number;
  montant_acompte: number;
  date_versement_acompte?: string | null;
  statut_local: StatutLocal;
  statut_urssaf_code?: string | null;
  statut_urssaf_libelle?: string | null;
  info_rejet?: Record<string, unknown> | null;
  info_virement?: Record<string, unknown> | null;
  erreurs_urssaf?: unknown;
  transmis_at?: string | null;
  derniere_tentative_at?: string | null;
  derniere_verification_at?: string | null;
  dernier_code_http?: number | null;
  dernier_message?: string | null;
  created_at: string;
  updated_at: string;
};

type LigneStockee = {
  id: string;
  facture_ligne_id?: string | null;
  designation_snapshot: string;
  code_nature: string;
  code_activite?: string | null;
  quantite: number;
  unite: "HEURE" | "FORFAIT";
  montant_unitaire_ttc: number;
  montant_prestation_ht: number;
  montant_prestation_tva: number;
  montant_prestation_ttc: number;
  complement1?: string | null;
  ordre: number;
};

type LigneFormulaire = {
  facture_ligne_id: string;
  incluse: boolean;
  designation: string;
  code_nature: string;
  code_activite: string;
  quantite: number;
  unite: "HEURE" | "FORFAIT";
  montant_unitaire_ttc: number;
  montant_prestation_ht: number;
  montant_prestation_tva: number;
  montant_prestation_ttc: number;
  complement1: string;
};

type FormulaireDemande = {
  date_debut_emploi: string;
  date_fin_emploi: string;
  montant_acompte: number;
  date_versement_acompte: string;
  confirmation_prestations: boolean;
  lignes: LigneFormulaire[];
};

type CorpsRequete = {
  action?: unknown;
  formulaire?: unknown;
};

type ActionDemande =
  | "enregistrer"
  | "transmettre"
  | "actualiser";

type StatutLocal =
  | "brouillon"
  | "prete"
  | "transmise"
  | "payee"
  | "impayee"
  | "annulee"
  | "erreur";

const ROLES_CHEF = new Set([
  "chef",
  "admin",
  "administrateur",
  "gerant",
  "dirigeant",
  "patron",
]);

function normaliser(
  valeur: string | null | undefined
) {
  return String(valeur || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function texte(
  valeur: unknown,
  longueurMax = 500
) {
  return typeof valeur === "string"
    ? valeur.trim().slice(0, longueurMax)
    : "";
}

function nombre(
  valeur: unknown,
  defaut = 0
) {
  const resultat = Number(valeur);
  return Number.isFinite(resultat)
    ? resultat
    : defaut;
}

function arrondir2(valeur: number) {
  return Number(valeur.toFixed(2));
}

function arrondir3(valeur: number) {
  return Number(valeur.toFixed(3));
}

function dateIsoUrssaf(date: string) {
  return `${date}T00:00:00.000Z`;
}

function memeMois(
  debut: string,
  fin: string
) {
  return debut.slice(0, 7) === fin.slice(0, 7);
}

function creerSupabaseAdmin() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY;

  if (!url || !secret) {
    throw new Error(
      "Configuration Supabase serveur incomplète."
    );
  }

  return createClient(url, secret, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

function obtenirJetonSession(
  request: NextRequest
) {
  const autorisation =
    request.headers.get("authorization");

  if (!autorisation?.startsWith("Bearer ")) {
    return null;
  }

  return autorisation.slice(7).trim() || null;
}

async function authentifier(
  request: NextRequest
) {
  const jeton =
    obtenirJetonSession(request);

  if (!jeton) {
    return {
      erreur: NextResponse.json(
        { erreur: "Authentification requise." },
        { status: 401 }
      ),
      supabaseAdmin: null,
      profil: null,
      entrepriseId: null,
    };
  }

  const supabaseAdmin =
    creerSupabaseAdmin();

  const {
    data: { user },
    error: userError,
  } =
    await supabaseAdmin.auth.getUser(jeton);

  if (userError || !user) {
    return {
      erreur: NextResponse.json(
        {
          erreur:
            "Session invalide ou expirée.",
        },
        { status: 401 }
      ),
      supabaseAdmin: null,
      profil: null,
      entrepriseId: null,
    };
  }

  const { data: profil, error } =
    await supabaseAdmin
      .from("profils_utilisateurs")
      .select(
        "id, role, statut, entreprise_id"
      )
      .eq("id", user.id)
      .single();

  if (error || !profil?.entreprise_id) {
    return {
      erreur: NextResponse.json(
        {
          erreur:
            "Profil ou entreprise introuvable.",
        },
        { status: 403 }
      ),
      supabaseAdmin: null,
      profil: null,
      entrepriseId: null,
    };
  }

  const profilType = profil as ProfilChef;

  if (
    !ROLES_CHEF.has(
      normaliser(profilType.role)
    ) ||
    (
      profilType.statut &&
      normaliser(profilType.statut) !==
        "actif"
    )
  ) {
    return {
      erreur: NextResponse.json(
        {
          erreur:
            "Accès réservé au chef d’entreprise.",
        },
        { status: 403 }
      ),
      supabaseAdmin: null,
      profil: null,
      entrepriseId: null,
    };
  }

  return {
    erreur: null,
    supabaseAdmin,
    profil: profilType,
    entrepriseId:
      profilType.entreprise_id,
  };
}

function lireFormulaire(
  valeur: unknown
): FormulaireDemande {
  const objet =
    valeur && typeof valeur === "object"
      ? valeur as Record<string, unknown>
      : {};

  const lignesBrutes =
    Array.isArray(objet.lignes)
      ? objet.lignes
      : [];

  return {
    date_debut_emploi: texte(
      objet.date_debut_emploi,
      10
    ),
    date_fin_emploi: texte(
      objet.date_fin_emploi,
      10
    ),
    montant_acompte: arrondir2(
      Math.max(
        0,
        nombre(objet.montant_acompte)
      )
    ),
    date_versement_acompte: texte(
      objet.date_versement_acompte,
      10
    ),
    confirmation_prestations:
      objet.confirmation_prestations === true,
    lignes: lignesBrutes.map(
      (ligne): LigneFormulaire => {
        const source =
          ligne &&
          typeof ligne === "object"
            ? ligne as Record<
                string,
                unknown
              >
            : {};

        return {
          facture_ligne_id: texte(
            source.facture_ligne_id,
            100
          ),
          incluse: source.incluse === true,
          designation: texte(
            source.designation,
            300
          ),
          code_nature: texte(
            source.code_nature,
            10
          ).toUpperCase(),
          code_activite: texte(
            source.code_activite,
            30
          ).toUpperCase(),
          quantite: arrondir3(
            Math.max(
              0,
              nombre(source.quantite)
            )
          ),
          unite:
            source.unite === "HEURE"
              ? "HEURE"
              : "FORFAIT",
          montant_unitaire_ttc:
            arrondir3(
              Math.max(
                0,
                nombre(
                  source.montant_unitaire_ttc
                )
              )
            ),
          montant_prestation_ht:
            arrondir2(
              Math.max(
                0,
                nombre(
                  source.montant_prestation_ht
                )
              )
            ),
          montant_prestation_tva:
            arrondir2(
              Math.max(
                0,
                nombre(
                  source.montant_prestation_tva
                )
              )
            ),
          montant_prestation_ttc:
            arrondir2(
              Math.max(
                0,
                nombre(
                  source.montant_prestation_ttc
                )
              )
            ),
          complement1: texte(
            source.complement1,
            255
          ),
        };
      }
    ),
  };
}

function uniteDepuisFacture(
  valeur: string | null | undefined
): "HEURE" | "FORFAIT" {
  const unite = normaliser(valeur);

  if (
    unite === "h" ||
    unite.includes("heure")
  ) {
    return "HEURE";
  }

  return "FORFAIT";
}

function formulaireInitial({
  facture,
  lignes,
}: {
  facture: Facture;
  lignes: FactureLigne[];
}): FormulaireDemande {
  const date =
    facture.date_facture ||
    new Date().toISOString().slice(0, 10);

  return {
    date_debut_emploi: date,
    date_fin_emploi: date,
    montant_acompte: 0,
    date_versement_acompte: "",
    confirmation_prestations: false,
    lignes: lignes.map((ligne) => {
      const quantite = Math.max(
        0.001,
        nombre(ligne.quantite, 1)
      );

      const totalTtc =
        arrondir2(
          nombre(ligne.total_ttc)
        );

      return {
        facture_ligne_id: ligne.id,
        incluse: true,
        designation:
          ligne.designation ||
          "Prestation",
        code_nature: "",
        code_activite: "",
        quantite: arrondir3(quantite),
        unite: uniteDepuisFacture(
          ligne.unite
        ),
        montant_unitaire_ttc:
          arrondir3(totalTtc / quantite),
        montant_prestation_ht:
          arrondir2(
            nombre(ligne.total_ht)
          ),
        montant_prestation_tva:
          arrondir2(
            nombre(ligne.total_tva)
          ),
        montant_prestation_ttc:
          totalTtc,
        complement1:
          [
            ligne.designation,
            ligne.description,
          ]
            .filter(Boolean)
            .join(" — ")
            .slice(0, 255),
      };
    }),
  };
}

function formulaireDepuisDemande({
  demande,
  lignes,
}: {
  demande: DemandeStockee;
  lignes: LigneStockee[];
}): FormulaireDemande {
  return {
    date_debut_emploi:
      demande.date_debut_emploi,
    date_fin_emploi:
      demande.date_fin_emploi,
    montant_acompte:
      nombre(demande.montant_acompte),
    date_versement_acompte:
      demande.date_versement_acompte ||
      "",
    confirmation_prestations: false,
    lignes: lignes.map((ligne) => ({
      facture_ligne_id:
        ligne.facture_ligne_id || "",
      incluse: true,
      designation:
        ligne.designation_snapshot,
      code_nature:
        ligne.code_nature,
      code_activite:
        ligne.code_activite || "",
      quantite:
        nombre(ligne.quantite),
      unite: ligne.unite,
      montant_unitaire_ttc:
        nombre(
          ligne.montant_unitaire_ttc
        ),
      montant_prestation_ht:
        nombre(
          ligne.montant_prestation_ht
        ),
      montant_prestation_tva:
        nombre(
          ligne.montant_prestation_tva
        ),
      montant_prestation_ttc:
        nombre(
          ligne.montant_prestation_ttc
        ),
      complement1:
        ligne.complement1 || "",
    })),
  };
}

async function chargerContexteFacture({
  supabaseAdmin,
  entrepriseId,
  factureId,
}: {
  supabaseAdmin: ReturnType<
    typeof creerSupabaseAdmin
  >;
  entrepriseId: string;
  factureId: string;
}) {
  const { data: factureData, error } =
    await supabaseAdmin
      .from("factures")
      .select(
        "id, entreprise_id, client_id, numero, date_facture, statut, type_facture, est_avoir, total_ht, total_tva, total_ttc"
      )
      .eq("id", factureId)
      .eq("entreprise_id", entrepriseId)
      .maybeSingle();

  if (error) throw error;

  if (!factureData) {
    throw new Error(
      "Facture introuvable pour cette entreprise."
    );
  }

  const facture = factureData as Facture;

  const [
    lignesResultat,
    clientResultat,
    clientUrssafResultat,
    integrationResultat,
    demandeResultat,
  ] = await Promise.all([
    supabaseAdmin
      .from("factures_lignes")
      .select(
        "id, facture_id, designation, description, quantite, unite, prix_unitaire_ht, tva, total_ht, total_tva, total_ttc, ordre"
      )
      .eq("facture_id", factureId)
      .eq("entreprise_id", entrepriseId)
      .order("ordre", {
        ascending: true,
      }),

    facture.client_id
      ? supabaseAdmin
          .from("clients")
          .select("id, type_client")
          .eq("id", facture.client_id)
          .eq(
            "entreprise_id",
            entrepriseId
          )
          .maybeSingle()
      : Promise.resolve({
          data: null,
          error: null,
        }),

    facture.client_id
      ? supabaseAdmin
          .from("clients_urssaf_tp")
          .select(
            "id, donnees_chiffrees, urssaf_id_client, statut_inscription, statut_transmission_etat"
          )
          .eq(
            "client_id",
            facture.client_id
          )
          .eq(
            "entreprise_id",
            entrepriseId
          )
          .maybeSingle()
      : Promise.resolve({
          data: null,
          error: null,
        }),

    supabaseAdmin
      .from("integrations_urssaf_tp")
      .select(
        "id, numero_sap, client_id_chiffre, client_secret_chiffre, actif, statut"
      )
      .eq(
        "entreprise_id",
        entrepriseId
      )
      .maybeSingle(),

    supabaseAdmin
      .from(
        "demandes_paiement_urssaf"
      )
      .select("*")
      .eq("facture_id", factureId)
      .eq(
        "entreprise_id",
        entrepriseId
      )
      .maybeSingle(),
  ]);

  if (lignesResultat.error) {
    throw lignesResultat.error;
  }

  if (clientResultat.error) {
    throw clientResultat.error;
  }

  if (clientUrssafResultat.error) {
    throw clientUrssafResultat.error;
  }

  if (integrationResultat.error) {
    throw integrationResultat.error;
  }

  if (demandeResultat.error) {
    throw demandeResultat.error;
  }

  const demande =
    demandeResultat.data as
      | DemandeStockee
      | null;

  let lignesDemande: LigneStockee[] = [];

  if (demande) {
    const { data, error: lignesError } =
      await supabaseAdmin
        .from(
          "demandes_paiement_urssaf_lignes"
        )
        .select("*")
        .eq("demande_id", demande.id)
        .eq(
          "entreprise_id",
          entrepriseId
        )
        .order("ordre", {
          ascending: true,
        });

    if (lignesError) throw lignesError;

    lignesDemande =
      (data || []) as LigneStockee[];
  }

  return {
    facture,
    lignes:
      (lignesResultat.data ||
        []) as FactureLigne[],
    client:
      (clientResultat.data as
        | Client
        | null) || null,
    clientUrssaf:
      (clientUrssafResultat.data as
        | ClientUrssaf
        | null) || null,
    integration:
      (integrationResultat.data as
        | IntegrationUrssaf
        | null) || null,
    demande,
    lignesDemande,
  };
}

function raisonsIneligibilite({
  facture,
  client,
  clientUrssaf,
  integration,
  lignes,
}: {
  facture: Facture;
  client: Client | null;
  clientUrssaf: ClientUrssaf | null;
  integration: IntegrationUrssaf | null;
  lignes: FactureLigne[];
}) {
  const raisons: string[] = [];

  if (
    facture.est_avoir ||
    facture.type_facture === "avoir"
  ) {
    raisons.push(
      "Un avoir ne peut pas être transmis."
    );
  }

  if (
    !["envoyee", "en_retard"].includes(
      facture.statut || ""
    )
  ) {
    raisons.push(
      "La facture doit être envoyée ou en retard."
    );
  }

  if (!facture.numero) {
    raisons.push(
      "La facture doit avoir un numéro définitif."
    );
  }

  if (!facture.date_facture) {
    raisons.push(
      "La date de facture est absente."
    );
  }

  if (!facture.client_id || !client) {
    raisons.push(
      "Aucun client n’est rattaché à la facture."
    );
  } else if (
    normaliser(client.type_client) !==
    "particulier"
  ) {
    raisons.push(
      "Le client doit être un particulier."
    );
  }

  if (
    !clientUrssaf?.urssaf_id_client ||
    clientUrssaf.statut_inscription !==
      "actif" ||
    normaliser(
      clientUrssaf.statut_transmission_etat
    ) !== "ok"
  ) {
    raisons.push(
      "L’inscription URSSAF du particulier doit être active et autoriser les demandes de paiement."
    );
  }

  if (
    !integration?.actif ||
    integration.statut !== "connectee"
  ) {
    raisons.push(
      "La connexion API URSSAF de l’entreprise doit être validée."
    );
  }

  if (lignes.length === 0) {
    raisons.push(
      "La facture ne contient aucune ligne."
    );
  }

  if (
    nombre(facture.total_ttc) <= 0
  ) {
    raisons.push(
      "Le montant TTC doit être supérieur à zéro."
    );
  }

  return raisons;
}

function presentationDemande(
  demande: DemandeStockee | null
) {
  if (!demande) return null;

  return {
    id: demande.id,
    urssaf_id_demande_paiement:
      demande.urssaf_id_demande_paiement ||
      null,
    statut_local:
      demande.statut_local,
    statut_urssaf_code:
      demande.statut_urssaf_code || null,
    statut_urssaf_libelle:
      demande.statut_urssaf_libelle ||
      null,
    montant_facture_ht:
      nombre(
        demande.montant_facture_ht
      ),
    montant_facture_tva:
      nombre(
        demande.montant_facture_tva
      ),
    montant_facture_ttc:
      nombre(
        demande.montant_facture_ttc
      ),
    montant_acompte:
      nombre(demande.montant_acompte),
    date_versement_acompte:
      demande.date_versement_acompte ||
      null,
    info_rejet:
      demande.info_rejet || null,
    info_virement:
      demande.info_virement || null,
    transmis_at:
      demande.transmis_at || null,
    derniere_tentative_at:
      demande.derniere_tentative_at ||
      null,
    derniere_verification_at:
      demande.derniere_verification_at ||
      null,
    dernier_code_http:
      demande.dernier_code_http || null,
    dernier_message:
      demande.dernier_message || null,
  };
}

async function journaliser({
  supabaseAdmin,
  entrepriseId,
  action,
  ressourceId,
  resultat,
  description,
  details,
}: {
  supabaseAdmin: ReturnType<
    typeof creerSupabaseAdmin
  >;
  entrepriseId: string;
  action: string;
  ressourceId: string | null;
  resultat: "succes" | "echec";
  description: string;
  details: Record<string, unknown>;
}) {
  const { error } = await supabaseAdmin.rpc(
    "arboboard_ecrire_journal",
    {
      p_entreprise_id: entrepriseId,
      p_action: action,
      p_categorie: "facturation",
      p_ressource_type:
        "demande_paiement_urssaf",
      p_ressource_id: ressourceId,
      p_resultat: resultat,
      p_description: description,
      p_details: details,
    }
  );

  if (error) {
    console.warn(
      "Journalisation demande URSSAF impossible :",
      error
    );
  }
}

function statutLocalDepuisCode(
  code: string
): StatutLocal {
  if (code === "70") return "payee";
  if (code === "60") return "impayee";

  if (
    ["110", "111", "112"].includes(code)
  ) {
    return "annulee";
  }

  return "transmise";
}

function dateNaissanceDossier(
  clientUrssaf: ClientUrssaf
) {
  const contenu = JSON.parse(
    dechiffrerIdentifiant(
      clientUrssaf.donnees_chiffrees
    )
  ) as Record<string, unknown>;

  const date = texte(
    contenu.date_naissance,
    10
  );

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(
      "La date de naissance enregistrée dans le dossier client URSSAF est invalide."
    );
  }

  return date;
}

function construireLignesValidees({
  formulaire,
  lignesFacture,
  numeroSap,
  validationComplete,
}: {
  formulaire: FormulaireDemande;
  lignesFacture: FactureLigne[];
  numeroSap: string;
  validationComplete: boolean;
}) {
  const lignesParId = new Map(
    lignesFacture.map((ligne) => [
      ligne.id,
      ligne,
    ])
  );

  const selectionnees =
    formulaire.lignes.filter(
      (ligne) => ligne.incluse
    );

  if (selectionnees.length === 0) {
    throw new Error(
      "Sélectionnez au moins une prestation éligible."
    );
  }

  return selectionnees.map(
    (ligne, index) => {
      const source =
        lignesParId.get(
          ligne.facture_ligne_id
        );

      if (!source) {
        throw new Error(
          "Une ligne sélectionnée n’appartient plus à cette facture."
        );
      }

      if (
        validationComplete &&
        !/^\d{1,3}$/.test(
          ligne.code_nature
        )
      ) {
        throw new Error(
          `Le code nature de la ligne ${
            index + 1
          } est obligatoire et doit être numérique avant la transmission.`
        );
      }

      if (
        !validationComplete &&
        ligne.code_nature &&
        !/^\d{1,3}$/.test(
          ligne.code_nature
        )
      ) {
        throw new Error(
          `Le code nature de la ligne ${
            index + 1
          } doit être numérique lorsqu’il est renseigné.`
        );
      }

      if (
        ligne.code_activite &&
        !/^[0-9A-Z]{1,30}$/.test(
          ligne.code_activite
        )
      ) {
        throw new Error(
          `Le code activité de la ligne ${
            index + 1
          } est invalide.`
        );
      }

      if (ligne.quantite <= 0) {
        throw new Error(
          `La quantité de la ligne ${
            index + 1
          } doit être supérieure à zéro.`
        );
      }

      const montantHt =
        arrondir2(
          nombre(source.total_ht)
        );
      const montantTva =
        arrondir2(
          nombre(source.total_tva)
        );
      const montantTtc =
        arrondir2(
          nombre(source.total_ttc)
        );
      const montantUnitaire =
        arrondir3(
          montantTtc / ligne.quantite
        );

      if (montantTtc <= 0) {
        throw new Error(
          `Le montant TTC de la ligne ${
            index + 1
          } doit être supérieur à zéro.`
        );
      }

      if (
        Math.abs(
          montantHt +
            montantTva -
            montantTtc
        ) > 0.05
      ) {
        throw new Error(
          `Les montants HT, TVA et TTC de la ligne ${
            index + 1
          } ne sont pas cohérents.`
        );
      }

      const prestation:
        PrestationDemandePaiementUrssaf =
      {
        codeNature:
          ligne.code_nature,
        quantite:
          arrondir3(ligne.quantite),
        unite: ligne.unite,
        mntUnitaireTTC:
          montantUnitaire,
        mntPrestationTTC:
          montantTtc,
        mntPrestationHT:
          montantHt,
        mntPrestationTVA:
          montantTva,
        dateDebutEmploi:
          dateIsoUrssaf(
            formulaire.date_debut_emploi
          ),
        dateFinEmploi:
          dateIsoUrssaf(
            formulaire.date_fin_emploi
          ),
        complement2:
          numeroSap || "",
      };

      if (ligne.code_activite) {
        prestation.codeActivite =
          ligne.code_activite;
      }

      if (ligne.complement1) {
        prestation.complement1 =
          ligne.complement1;
      }

      return {
        factureLigneId: source.id,
        designation:
          source.designation ||
          ligne.designation ||
          "Prestation",
        ordre: index + 1,
        prestation,
      };
    }
  );
}

async function enregistrerDemandeEtLignes({
  supabaseAdmin,
  entrepriseId,
  profilId,
  facture,
  clientUrssaf,
  formulaire,
  lignesValidees,
  payload,
  statutLocal,
  demandeExistante,
}: {
  supabaseAdmin: ReturnType<
    typeof creerSupabaseAdmin
  >;
  entrepriseId: string;
  profilId: string;
  facture: Facture;
  clientUrssaf: ClientUrssaf;
  formulaire: FormulaireDemande;
  lignesValidees: ReturnType<
    typeof construireLignesValidees
  >;
  payload:
    DemandePaiementUrssafPayload;
  statutLocal: StatutLocal;
  demandeExistante:
    DemandeStockee | null;
}) {
  const totalHt = arrondir2(
    lignesValidees.reduce(
      (total, ligne) =>
        total +
        ligne.prestation
          .mntPrestationHT,
      0
    )
  );

  const totalTva = arrondir2(
    lignesValidees.reduce(
      (total, ligne) =>
        total +
        ligne.prestation
          .mntPrestationTVA,
      0
    )
  );

  const totalTtc = arrondir2(
    lignesValidees.reduce(
      (total, ligne) =>
        total +
        ligne.prestation
          .mntPrestationTTC,
      0
    )
  );

  const payloadJson =
    JSON.stringify(payload);
  const payloadHash = createHash("sha256")
    .update(payloadJson, "utf8")
    .digest("hex");

  const maintenant =
    new Date().toISOString();

  const enregistrement = {
    entreprise_id: entrepriseId,
    facture_id: facture.id,
    client_id: facture.client_id,
    client_urssaf_tp_id:
      clientUrssaf.id,
    numero_facture:
      facture.numero,
    date_facture:
      facture.date_facture,
    date_debut_emploi:
      formulaire.date_debut_emploi,
    date_fin_emploi:
      formulaire.date_fin_emploi,
    montant_facture_ht: totalHt,
    montant_facture_tva:
      totalTva,
    montant_facture_ttc:
      totalTtc,
    montant_acompte:
      formulaire.montant_acompte,
    date_versement_acompte:
      formulaire.montant_acompte > 0
        ? formulaire
            .date_versement_acompte
        : null,
    statut_local: statutLocal,
    payload_chiffre:
      chiffrerIdentifiant(
        payloadJson
      ),
    payload_sha256: payloadHash,
    updated_by: profilId,
    updated_at: maintenant,
    ...(demandeExistante
      ? {}
      : {
          created_by: profilId,
          created_at: maintenant,
        }),
  };

  const { data, error } =
    await supabaseAdmin
      .from(
        "demandes_paiement_urssaf"
      )
      .upsert(enregistrement, {
        onConflict: "facture_id",
      })
      .select("*")
      .single();

  if (error) throw error;

  const demande =
    data as DemandeStockee;

  const { error: suppressionError } =
    await supabaseAdmin
      .from(
        "demandes_paiement_urssaf_lignes"
      )
      .delete()
      .eq("demande_id", demande.id)
      .eq(
        "entreprise_id",
        entrepriseId
      );

  if (suppressionError) {
    throw suppressionError;
  }

  const lignesPayload =
    lignesValidees.map((ligne) => ({
      demande_id: demande.id,
      entreprise_id: entrepriseId,
      facture_ligne_id:
        ligne.factureLigneId,
      designation_snapshot:
        ligne.designation,
      code_nature:
        ligne.prestation.codeNature,
      code_activite:
        ligne.prestation
          .codeActivite || null,
      quantite:
        ligne.prestation.quantite,
      unite:
        ligne.prestation.unite,
      montant_unitaire_ttc:
        ligne.prestation
          .mntUnitaireTTC,
      montant_prestation_ht:
        ligne.prestation
          .mntPrestationHT,
      montant_prestation_tva:
        ligne.prestation
          .mntPrestationTVA,
      montant_prestation_ttc:
        ligne.prestation
          .mntPrestationTTC,
      date_debut_emploi:
        formulaire.date_debut_emploi,
      date_fin_emploi:
        formulaire.date_fin_emploi,
      complement1:
        ligne.prestation
          .complement1 || null,
      complement2:
        ligne.prestation
          .complement2,
      ordre: ligne.ordre,
    }));

  const { error: insertionError } =
    await supabaseAdmin
      .from(
        "demandes_paiement_urssaf_lignes"
      )
      .insert(lignesPayload);

  if (insertionError) {
    throw insertionError;
  }

  return {
    demande,
    totalHt,
    totalTva,
    totalTtc,
    payloadHash,
  };
}

export async function GET(
  request: NextRequest,
  contexte: ContexteRoute
) {
  try {
    const authentification =
      await authentifier(request);

    if (
      authentification.erreur ||
      !authentification.supabaseAdmin ||
      !authentification.profil ||
      !authentification.entrepriseId
    ) {
      return (
        authentification.erreur ??
        NextResponse.json(
          {
            erreur:
              "Impossible de vérifier l’accès.",
          },
          { status: 500 }
        )
      );
    }

    const { factureId } =
      await contexte.params;

    const {
      supabaseAdmin,
      entrepriseId,
    } = authentification;

    const donnees =
      await chargerContexteFacture({
        supabaseAdmin,
        entrepriseId,
        factureId,
      });

    const raisons =
      raisonsIneligibilite(donnees);

    const formulaire =
      donnees.demande
        ? formulaireDepuisDemande({
            demande: donnees.demande,
            lignes:
              donnees.lignesDemande,
          })
        : formulaireInitial({
            facture: donnees.facture,
            lignes: donnees.lignes,
          });

    return NextResponse.json({
      facture: {
        id: donnees.facture.id,
        numero:
          donnees.facture.numero ||
          null,
        date_facture:
          donnees.facture.date_facture ||
          null,
        statut:
          donnees.facture.statut ||
          null,
        total_ht: nombre(
          donnees.facture.total_ht
        ),
        total_tva: nombre(
          donnees.facture.total_tva
        ),
        total_ttc: nombre(
          donnees.facture.total_ttc
        ),
      },
      eligibilite: {
        ok: raisons.length === 0,
        raisons,
      },
      integration: {
        configuree:
          Boolean(donnees.integration),
        active:
          Boolean(
            donnees.integration?.actif &&
              donnees.integration
                .statut === "connectee"
          ),
        statut:
          donnees.integration?.statut ||
          null,
        numero_sap:
          donnees.integration
            ?.numero_sap || null,
      },
      client_urssaf: {
        configure:
          Boolean(donnees.clientUrssaf),
        actif:
          Boolean(
            donnees.clientUrssaf
              ?.urssaf_id_client &&
              donnees.clientUrssaf
                .statut_inscription ===
                "actif" &&
              normaliser(
                donnees.clientUrssaf
                  .statut_transmission_etat
              ) === "ok"
          ),
        urssaf_id_client:
          donnees.clientUrssaf
            ?.urssaf_id_client || null,
      },
      demande:
        presentationDemande(
          donnees.demande
        ),
      formulaire,
    });
  } catch (error) {
    console.error(
      "Erreur lecture demande de paiement URSSAF :",
      error
    );

    return NextResponse.json(
      {
        erreur:
          error instanceof Error
            ? error.message
            : "Impossible de charger la demande de paiement.",
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  contexte: ContexteRoute
) {
  let demandeId: string | null = null;

  try {
    const authentification =
      await authentifier(request);

    if (
      authentification.erreur ||
      !authentification.supabaseAdmin ||
      !authentification.profil ||
      !authentification.entrepriseId
    ) {
      return (
        authentification.erreur ??
        NextResponse.json(
          {
            erreur:
              "Impossible de vérifier l’accès.",
          },
          { status: 500 }
        )
      );
    }

    const { factureId } =
      await contexte.params;

    const {
      supabaseAdmin,
      profil,
      entrepriseId,
    } = authentification;

    const corps =
      await request.json() as
        CorpsRequete;

    const action: ActionDemande =
      corps.action === "transmettre" ||
      corps.action === "actualiser"
        ? corps.action
        : "enregistrer";

    const donnees =
      await chargerContexteFacture({
        supabaseAdmin,
        entrepriseId,
        factureId,
      });

    demandeId =
      donnees.demande?.id || null;

    if (action === "actualiser") {
      if (
        !donnees.demande
          ?.urssaf_id_demande_paiement
      ) {
        return NextResponse.json(
          {
            erreur:
              "Cette facture ne possède pas encore de demande de paiement URSSAF transmise.",
          },
          { status: 400 }
        );
      }

      if (!donnees.integration?.actif) {
        return NextResponse.json(
          {
            erreur:
              "La connexion API URSSAF n’est pas active.",
          },
          { status: 400 }
        );
      }

      const jeton =
        await obtenirJetonUrssaf({
          clientId:
            dechiffrerIdentifiant(
              donnees.integration
                .client_id_chiffre
            ),
          clientSecret:
            dechiffrerIdentifiant(
              donnees.integration
                .client_secret_chiffre
            ),
        });

      const resultat =
        await rechercherDemandePaiementUrssaf({
          jeton,
          idDemandePaiement:
            donnees.demande
              .urssaf_id_demande_paiement,
          numeroFacture:
            donnees.facture.numero,
        });

      const statutCode = texte(
        resultat.demande.statut?.code,
        30
      );

      const statutLibelle = texte(
        resultat.demande.statut
          ?.libelle,
        300
      );

      const maintenant =
        new Date().toISOString();

      const { data, error } =
        await supabaseAdmin
          .from(
            "demandes_paiement_urssaf"
          )
          .update({
            statut_local:
              statutLocalDepuisCode(
                statutCode
              ),
            statut_urssaf_code:
              statutCode || null,
            statut_urssaf_libelle:
              statutLibelle || null,
            info_rejet:
              resultat.demande
                .infoRejet || null,
            info_virement:
              resultat.demande
                .infoVirement || null,
            derniere_verification_at:
              maintenant,
            dernier_code_http:
              resultat.codeHttp,
            dernier_message:
              statutLibelle ||
              "Statut URSSAF actualisé.",
            updated_by: profil.id,
            updated_at: maintenant,
          })
          .eq(
            "id",
            donnees.demande.id
          )
          .eq(
            "entreprise_id",
            entrepriseId
          )
          .select("*")
          .single();

      if (error) throw error;

      await journaliser({
        supabaseAdmin,
        entrepriseId,
        action:
          "statut_demande_paiement_urssaf_actualise",
        ressourceId:
          donnees.demande.id,
        resultat: "succes",
        description:
          "Actualisation du statut d’une demande de paiement URSSAF.",
        details: {
          facture_id: factureId,
          statut_urssaf_code:
            statutCode || null,
          statut_urssaf_libelle:
            statutLibelle || null,
        },
      });

      return NextResponse.json({
        succes: true,
        message:
          statutLibelle ||
          "Le statut URSSAF a été actualisé.",
        demande:
          presentationDemande(
            data as DemandeStockee
          ),
      });
    }

    const raisons =
      raisonsIneligibilite(donnees);

    if (
      action === "transmettre" &&
      raisons.length > 0
    ) {
      return NextResponse.json(
        {
          erreur: raisons[0],
          raisons,
        },
        { status: 400 }
      );
    }

    if (
      donnees.demande
        ?.urssaf_id_demande_paiement
    ) {
      return NextResponse.json(
        {
          erreur:
            "Une demande de paiement a déjà été transmise pour cette facture. Utilisez l’actualisation du statut.",
        },
        { status: 409 }
      );
    }

    if (
      !donnees.clientUrssaf ||
      !donnees.facture.client_id ||
      !donnees.facture.numero ||
      !donnees.facture.date_facture
    ) {
      return NextResponse.json(
        {
          erreur:
            "Le dossier Avance immédiate du client et les informations définitives de la facture doivent être enregistrés avant de préparer la demande.",
        },
        { status: 400 }
      );
    }

    if (
      action === "transmettre" &&
      !donnees.integration
    ) {
      return NextResponse.json(
        {
          erreur:
            "La connexion API URSSAF de l’entreprise doit être configurée avant la transmission.",
        },
        { status: 400 }
      );
    }

    const formulaire =
      lireFormulaire(corps.formulaire);

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(
        formulaire.date_debut_emploi
      ) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(
        formulaire.date_fin_emploi
      )
    ) {
      return NextResponse.json(
        {
          erreur:
            "Les dates de début et de fin de prestation sont obligatoires.",
        },
        { status: 400 }
      );
    }

    if (
      formulaire.date_fin_emploi <
      formulaire.date_debut_emploi
    ) {
      return NextResponse.json(
        {
          erreur:
            "La date de fin ne peut pas être antérieure à la date de début.",
        },
        { status: 400 }
      );
    }

    if (
      !memeMois(
        formulaire.date_debut_emploi,
        formulaire.date_fin_emploi
      )
    ) {
      return NextResponse.json(
        {
          erreur:
            "La période d’emploi doit rester dans un seul mois civil.",
        },
        { status: 400 }
      );
    }

    const aujourdHui =
      new Date().toISOString().slice(0, 10);

    if (
      formulaire.date_debut_emploi >
        aujourdHui ||
      formulaire.date_fin_emploi >
        aujourdHui
    ) {
      return NextResponse.json(
        {
          erreur:
            "Une période d’emploi située dans le futur ne peut pas être transmise.",
        },
        { status: 400 }
      );
    }

    const lignesValidees =
      construireLignesValidees({
        formulaire,
        lignesFacture:
          donnees.lignes,
        numeroSap:
          donnees.integration
            ?.numero_sap || "",
        validationComplete:
          action === "transmettre",
      });

    const totalTtc = arrondir2(
      lignesValidees.reduce(
        (total, ligne) =>
          total +
          ligne.prestation
            .mntPrestationTTC,
        0
      )
    );

    const totalHt = arrondir2(
      lignesValidees.reduce(
        (total, ligne) =>
          total +
          ligne.prestation
            .mntPrestationHT,
        0
      )
    );

    if (
      totalTtc >
      arrondir2(
        nombre(
          donnees.facture.total_ttc
        )
      ) +
        0.05
    ) {
      return NextResponse.json(
        {
          erreur:
            "Le montant des prestations sélectionnées dépasse le total TTC de la facture.",
        },
        { status: 400 }
      );
    }

    if (
      formulaire.montant_acompte >
      totalTtc
    ) {
      return NextResponse.json(
        {
          erreur:
            "Le montant de l’acompte ne peut pas dépasser le montant transmis.",
        },
        { status: 400 }
      );
    }

    if (
      formulaire.montant_acompte > 0 &&
      !/^\d{4}-\d{2}-\d{2}$/.test(
        formulaire
          .date_versement_acompte
      )
    ) {
      return NextResponse.json(
        {
          erreur:
            "La date de versement de l’acompte est obligatoire.",
        },
        { status: 400 }
      );
    }

    if (
      action === "transmettre" &&
      !formulaire
        .confirmation_prestations
    ) {
      return NextResponse.json(
        {
          erreur:
            "Confirmez que les prestations ont été réalisées et sont éligibles au service à la personne.",
        },
        { status: 400 }
      );
    }

    const payload:
      DemandePaiementUrssafPayload =
    {
      idTiersFacturation:
        `ARB-${donnees.facture.id}`,
      idClient:
        donnees.clientUrssaf
          .urssaf_id_client || "",
      dateNaissanceClient:
        dateIsoUrssaf(
          dateNaissanceDossier(
            donnees.clientUrssaf
          )
        ),
      numFactureTiers:
        donnees.facture.numero,
      dateFacture:
        dateIsoUrssaf(
          donnees.facture.date_facture
        ),
      dateDebutEmploi:
        dateIsoUrssaf(
          formulaire.date_debut_emploi
        ),
      dateFinEmploi:
        dateIsoUrssaf(
          formulaire.date_fin_emploi
        ),
      mntFactureTTC: totalTtc,
      mntFactureHT: totalHt,
      inputPrestations:
        lignesValidees.map(
          (ligne) =>
            ligne.prestation
        ),
    };

    if (formulaire.montant_acompte > 0) {
      payload.mntAcompte =
        formulaire.montant_acompte;
      payload.dateVersementAcompte =
        dateIsoUrssaf(
          formulaire
            .date_versement_acompte
        );
    }

    const enregistrement =
      await enregistrerDemandeEtLignes({
        supabaseAdmin,
        entrepriseId,
        profilId: profil.id,
        facture: donnees.facture,
        clientUrssaf:
          donnees.clientUrssaf,
        formulaire,
        lignesValidees,
        payload,
        statutLocal:
          action === "transmettre"
            ? "prete"
            : "brouillon",
        demandeExistante:
          donnees.demande,
      });

    demandeId =
      enregistrement.demande.id;

    if (action === "enregistrer") {
      await journaliser({
        supabaseAdmin,
        entrepriseId,
        action:
          "demande_paiement_urssaf_enregistree",
        ressourceId: demandeId,
        resultat: "succes",
        description:
          "Enregistrement du brouillon d’une demande de paiement URSSAF.",
        details: {
          facture_id: factureId,
          montant_ttc:
            enregistrement.totalTtc,
          nombre_prestations:
            lignesValidees.length,
          payload_sha256:
            enregistrement.payloadHash,
        },
      });

      return NextResponse.json({
        succes: true,
        message:
          "La demande de paiement a été enregistrée sans être transmise.",
        demande:
          presentationDemande(
            enregistrement.demande
          ),
      });
    }

    if (!donnees.integration) {
      return NextResponse.json(
        {
          erreur:
            "La connexion API URSSAF de l’entreprise est introuvable.",
        },
        { status: 400 }
      );
    }

    const jeton =
      await obtenirJetonUrssaf({
        clientId:
          dechiffrerIdentifiant(
            donnees.integration
              .client_id_chiffre
          ),
        clientSecret:
          dechiffrerIdentifiant(
            donnees.integration
              .client_secret_chiffre
          ),
      });

    const transmission =
      await transmettreDemandePaiementUrssaf({
        jeton,
        demande: payload,
      });

    const erreurs =
      transmission.retour.errors || [];

    const idDemande =
      texte(
        transmission.retour
          .idDemandePaiement,
        200
      );

    if (
      erreurs.length > 0 ||
      !idDemande
    ) {
      const message =
        erreurs
          .map((erreur) =>
            [
              erreur.code,
              erreur.message,
              erreur.description,
            ]
              .filter(Boolean)
              .join(" — ")
          )
          .filter(Boolean)
          .join(" | ") ||
        "L’Urssaf n’a retourné aucun identifiant de demande de paiement.";

      const { data, error } =
        await supabaseAdmin
          .from(
            "demandes_paiement_urssaf"
          )
          .update({
            statut_local: "erreur",
            erreurs_urssaf: erreurs,
            derniere_tentative_at:
              new Date().toISOString(),
            dernier_code_http:
              transmission.codeHttp,
            dernier_message:
              message.slice(0, 1500),
            updated_by: profil.id,
            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            enregistrement.demande.id
          )
          .eq(
            "entreprise_id",
            entrepriseId
          )
          .select("*")
          .single();

      if (error) throw error;

      await journaliser({
        supabaseAdmin,
        entrepriseId,
        action:
          "demande_paiement_urssaf_refusee",
        ressourceId:
          enregistrement.demande.id,
        resultat: "echec",
        description:
          "La demande de paiement a été refusée lors de sa transmission à l’Urssaf.",
        details: {
          facture_id: factureId,
          erreurs,
        },
      });

      return NextResponse.json(
        {
          erreur: message,
          demande:
            presentationDemande(
              data as DemandeStockee
            ),
        },
        { status: 400 }
      );
    }

    const maintenant =
      new Date().toISOString();
    const statutCode =
      texte(
        transmission.retour.statut,
        30
      );

    const { data, error } =
      await supabaseAdmin
        .from(
          "demandes_paiement_urssaf"
        )
        .update({
          urssaf_id_demande_paiement:
            idDemande,
          statut_local: "transmise",
          statut_urssaf_code:
            statutCode || null,
          statut_urssaf_libelle:
            statutCode
              ? `Statut URSSAF ${statutCode}`
              : null,
          erreurs_urssaf: erreurs,
          transmis_at: maintenant,
          derniere_tentative_at:
            maintenant,
          dernier_code_http:
            transmission.codeHttp,
          dernier_message:
            "Demande de paiement transmise à l’Urssaf.",
          updated_by: profil.id,
          updated_at: maintenant,
        })
        .eq(
          "id",
          enregistrement.demande.id
        )
        .eq(
          "entreprise_id",
          entrepriseId
        )
        .select("*")
        .single();

    if (error) throw error;

    await journaliser({
      supabaseAdmin,
      entrepriseId,
      action:
        "demande_paiement_urssaf_transmise",
      ressourceId:
        enregistrement.demande.id,
      resultat: "succes",
      description:
        "Transmission réussie d’une demande de paiement à l’API Tiers de prestation.",
      details: {
        facture_id: factureId,
        urssaf_id_demande_paiement:
          idDemande,
        montant_ttc:
          enregistrement.totalTtc,
        nombre_prestations:
          lignesValidees.length,
        payload_sha256:
          enregistrement.payloadHash,
      },
    });

    return NextResponse.json({
      succes: true,
      message:
        "La demande de paiement a été transmise. Le particulier pourra la vérifier dans son espace Urssaf.",
      demande:
        presentationDemande(
          data as DemandeStockee
        ),
    });
  } catch (error) {
    console.error(
      "Erreur demande de paiement URSSAF :",
      error
    );

    const codeHttp =
      error instanceof ErreurApiUrssaf
        ? error.codeHttp
        : 500;

    const message =
      error instanceof Error
        ? error.message
        : "Impossible de traiter la demande de paiement.";

    try {
      const authentification =
        await authentifier(request);

      if (
        demandeId &&
        authentification.supabaseAdmin &&
        authentification.entrepriseId
      ) {
        await authentification.supabaseAdmin
          .from(
            "demandes_paiement_urssaf"
          )
          .update({
            statut_local: "erreur",
            derniere_tentative_at:
              new Date().toISOString(),
            dernier_code_http:
              codeHttp >= 100 &&
              codeHttp <= 599
                ? codeHttp
                : 500,
            dernier_message:
              message.slice(0, 1500),
            updated_at:
              new Date().toISOString(),
          })
          .eq("id", demandeId)
          .eq(
            "entreprise_id",
            authentification.entrepriseId
          );

        await journaliser({
          supabaseAdmin:
            authentification.supabaseAdmin,
          entrepriseId:
            authentification.entrepriseId,
          action:
            "demande_paiement_urssaf_echec",
          ressourceId: demandeId,
          resultat: "echec",
          description:
            "Échec du traitement d’une demande de paiement URSSAF.",
          details: {
            code_http: codeHttp,
            erreur: message,
          },
        });
      }
    } catch (journalError) {
      console.warn(
        "Impossible d’enregistrer l’échec URSSAF :",
        journalError
      );
    }

    return NextResponse.json(
      { erreur: message },
      {
        status:
          codeHttp >= 400 &&
          codeHttp <= 599
            ? codeHttp
            : 500,
      }
    );
  }
}