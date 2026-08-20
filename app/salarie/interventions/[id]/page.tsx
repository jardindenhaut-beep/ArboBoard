"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { chargerContexteEntreprise } from "@/lib/entreprise";
import { supabase } from "@/lib/supabaseClient";
import BlocPhotosChantier from "@/components/interventions/BlocPhotosChantier";
import BlocPvFinChantier from "@/components/interventions/BlocPvFinChantier";
import ResumeRetourTerrainFiche from "@/components/interventions/ResumeRetourTerrainFiche";

type FicheIntervention = {
  id: string;
  entreprise_id: string;
  numero: string | null;
  devis_id: string | null;
  facture_id: string | null;
  client_id: string | null;
  client_nom: string | null;
  salarie_id: string | null;
  salarie_nom: string | null;
  titre: string | null;
  type_intervention: string | null;
  statut: string | null;

  date_intervention: string | null;
  heure_debut: string | null;
  heure_fin: string | null;

  date_prevue: string | null;
  heure_debut_prevue: string | null;
  heure_fin_prevue: string | null;
  heure_debut_reelle: string | null;
  heure_fin_reelle: string | null;

  adresse: string | null;
  code_postal: string | null;
  ville: string | null;

  adresse_chantier: string | null;
  code_postal_chantier: string | null;
  ville_chantier: string | null;
  notes_chantier: string | null;

  travaux_prevus: string | null;
  materiel_prevu: string | null;
  consignes_securite: string | null;
  notes_internes: string | null;

  etape_materiel_statut: string | null;
  etape_arrivee_statut: string | null;
  etape_fin_statut: string | null;

  materiel_valide_at: string | null;
  arrivee_validee_at: string | null;
  fin_validee_at: string | null;

  commentaire_preparation: string | null;
  commentaire_arrivee: string | null;
  commentaire_fin: string | null;

  probleme_signale: boolean | null;
  description_probleme: string | null;
  pv_fin_chantier_id: string | null;

  created_at: string | null;
  updated_at: string | null;
};

type FicheElement = {
  id: string;
  entreprise_id: string;
  fiche_id: string;
  article_id: string | null;
  nom: string;
  categorie: string;
  icone: string | null;
  couleur: string | null;
  quantite_prevue: number | null;
  quantite_reelle: number | null;
  unite: string | null;
  obligatoire: boolean | null;
  coche_prepare: boolean | null;
  commentaire_chef: string | null;
  commentaire_salarie: string | null;
  ordre: number | null;
};

type FicheSalarie = {
  id: string;
  entreprise_id: string;
  fiche_id: string;
  salarie_id: string | null;
  salarie_nom: string | null;
  role_chantier: string | null;
  heure_arrivee_prevue: string | null;
  heure_depart_prevue: string | null;
  heure_arrivee_reelle: string | null;
  heure_depart_reelle: string | null;
};

type Salarie = {
  id: string;
  entreprise_id: string;
  nom: string | null;
  prenom: string | null;
  email: string | null;
  telephone: string | null;
  user_id?: string | null;
  profil_id?: string | null;
};


type ContexteEntrepriseMinimal = {
  entreprise?: {
    id?: string | null;
  } | null;
  profil?: {
    id?: string | null;
    email?: string | null;
  } | null;
  utilisateur?: {
    id?: string | null;
    email?: string | null;
  } | null;
};

type FicheAccesMutation = {
  id: string;
  entreprise_id?: string | null;
  salarie_id: string | null;
  statut: string | null;
};

function messageErreurInconnue(
  error: unknown,
  messageParDefaut: string
) {
  return error instanceof Error && error.message
    ? error.message
    : messageParDefaut;
}

const BLOCS_ELEMENTS = [
  {
    categorie: "travaux",
    titre: "Travaux à réaliser",
    icone: "✅",
    description: "Tâches prévues par le chef pour ce chantier.",
  },
  {
    categorie: "materiel",
    titre: "Matériel à charger",
    icone: "🧰",
    description: "Matériel, machines, véhicules et EPI à préparer.",
  },
  {
    categorie: "materiaux",
    titre: "Matériaux / fournitures",
    icone: "🪨",
    description: "Matériaux ou fournitures à emporter.",
  },
  {
    categorie: "consigne_securite",
    titre: "Consignes sécurité",
    icone: "🦺",
    description: "Sécurité, balisage, risques, EPI obligatoires.",
  },
  {
    categorie: "consigne_chantier",
    titre: "Consignes chantier / client",
    icone: "🏠",
    description: "Accès, voisinage, client, évacuation, remarques.",
  },
];

function nettoyerTexte(valeur: string) {
  const texte = valeur.trim();
  return texte.length > 0 ? texte : null;
}

function heureMaintenant() {
  const maintenant = new Date();
  const heures = String(maintenant.getHours()).padStart(2, "0");
  const minutes = String(maintenant.getMinutes()).padStart(2, "0");
  return `${heures}:${minutes}`;
}

function formatHeure(heure: string | null | undefined) {
  if (!heure) return "—";
  return heure.slice(0, 5);
}

function titreFiche(fiche: FicheIntervention | null) {
  if (!fiche) return "Fiche d’intervention";
  return fiche.titre || fiche.type_intervention || "Fiche d’intervention";
}

function adresseFiche(fiche: FicheIntervention | null) {
  if (!fiche) return "Adresse non renseignée";

  const adresse = fiche.adresse_chantier || fiche.adresse || "";
  const codePostal = fiche.code_postal_chantier || fiche.code_postal || "";
  const ville = fiche.ville_chantier || fiche.ville || "";

  const villeComplete = [codePostal, ville].filter(Boolean).join(" ");

  if (!adresse && !villeComplete) return "Adresse non renseignée";

  return [adresse, villeComplete].filter(Boolean).join(", ");
}

function libelleStatut(statut: string | null | undefined) {
  if (statut === "planifiee") return "Planifiée";
  if (statut === "en_cours") return "En cours";
  if (statut === "terminee") return "Terminée";
  if (statut === "annulee") return "Annulée";
  if (statut === "archivee") return "Archivée";
  return "Brouillon";
}

function nomSalarie(salarie: Salarie | null) {
  if (!salarie) return "";

  const complet = `${salarie.prenom || ""} ${salarie.nom || ""}`.trim();
  return complet || salarie.email || "";
}

export default function DetailInterventionSalariePage() {
  const params = useParams();
  const ficheId = String(params?.id || "");

  const [entrepriseId, setEntrepriseId] = useState("");
  const [authUserId, setAuthUserId] = useState("");
  const [profilEmail, setProfilEmail] = useState("");

  const [salarie, setSalarie] = useState<Salarie | null>(null);
  const [affectation, setAffectation] = useState<FicheSalarie | null>(null);
  const [accesRefuse, setAccesRefuse] = useState(false);

  const [fiche, setFiche] = useState<FicheIntervention | null>(null);
  const [elements, setElements] = useState<FicheElement[]>([]);
  const [equipe, setEquipe] = useState<FicheSalarie[]>([]);

  const [chargement, setChargement] = useState(true);
  const [enregistrement, setEnregistrement] = useState(false);

  const [messageErreur, setMessageErreur] = useState("");
  const [messageSucces, setMessageSucces] = useState("");

  const [commentairePreparation, setCommentairePreparation] = useState("");
  const [commentaireArrivee, setCommentaireArrivee] = useState("");
  const [commentaireFin, setCommentaireFin] = useState("");
  const [descriptionProbleme, setDescriptionProbleme] = useState("");
  const [signalerProbleme, setSignalerProbleme] = useState(false);

  useEffect(() => {
    initialiserPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ficheId]);

  async function initialiserPage() {
    if (!ficheId) {
      setMessageErreur("Identifiant de fiche manquant.");
      setChargement(false);
      return;
    }

    try {
      setChargement(true);
      setAccesRefuse(false);
      setMessageErreur("");
      setMessageSucces("");

      const resultat = await chargerContexteEntreprise();
      const contexte =
        (resultat.contexte || null) as ContexteEntrepriseMinimal | null;

      if (resultat.erreur || !contexte?.entreprise?.id) {
        setMessageErreur(
          "Impossible de charger votre entreprise. Veuillez vous reconnecter."
        );
        return;
      }

      const {
        data: { user },
        error: erreurUtilisateur,
      } = await supabase.auth.getUser();

      if (erreurUtilisateur || !user) {
        setMessageErreur(
          "Votre session a expiré. Veuillez vous reconnecter."
        );
        return;
      }

      const idEntreprise = String(contexte.entreprise.id);
      const idProfil =
        contexte.profil?.id ||
        contexte.utilisateur?.id ||
        user.id ||
        "";
      const emailProfil =
        contexte.profil?.email ||
        contexte.utilisateur?.email ||
        user.email ||
        "";

      setEntrepriseId(idEntreprise);
      setAuthUserId(user.id);
      setProfilEmail(emailProfil);

      const salarieTrouve = await chargerSalarieConnecte(
        idEntreprise,
        idProfil,
        user.id,
        emailProfil
      );

      await chargerFicheComplete(
        idEntreprise,
        ficheId,
        salarieTrouve
      );
    } catch (error: unknown) {
      console.error(
        "Erreur chargement détail intervention salarié :",
        error
      );

      setMessageErreur(
        messageErreurInconnue(
          error,
          "Impossible de charger la fiche d’intervention."
        )
      );
    } finally {
      setChargement(false);
    }
  }

  async function chargerSalarieConnecte(
    idEntreprise: string,
    idProfil: string,
    idUtilisateur: string,
    emailProfil: string
  ) {
    let salarieData: Salarie | null = null;

    const identifiants = Array.from(
      new Set([idProfil, idUtilisateur].filter(Boolean))
    );

    for (const identifiant of identifiants) {
      const { data, error } = await supabase
        .from("salaries")
        .select("*")
        .eq("entreprise_id", idEntreprise)
        .or(
          `user_id.eq.${identifiant},profil_id.eq.${identifiant}`
        )
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        salarieData = data as Salarie;
        break;
      }
    }

    if (!salarieData && emailProfil) {
      const { data, error } = await supabase
        .from("salaries")
        .select("*")
        .eq("entreprise_id", idEntreprise)
        .ilike("email", emailProfil)
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        salarieData = data as Salarie;
      }
    }

    setSalarie(salarieData);

    return salarieData;
  }

  async function chargerFicheComplete(
    idEntreprise: string,
    idFiche: string,
    salarieConnecte: Salarie | null
  ) {
    setAccesRefuse(false);
    setMessageErreur("");

    const { data: ficheAccesBrute, error: erreurFicheAcces } =
      await supabase
        .from("fiches_intervention")
        .select("id, entreprise_id, salarie_id, statut")
        .eq("entreprise_id", idEntreprise)
        .eq("id", idFiche)
        .maybeSingle();

    if (erreurFicheAcces) throw erreurFicheAcces;

    if (!ficheAccesBrute) {
      setFiche(null);
      setElements([]);
      setEquipe([]);
      setAffectation(null);
      setMessageErreur("Fiche d’intervention introuvable.");
      return;
    }

    const ficheAcces =
      ficheAccesBrute as FicheAccesMutation;

    if (!salarieConnecte?.id) {
      setAccesRefuse(true);
      setFiche(null);
      setElements([]);
      setEquipe([]);
      setAffectation(null);
      return;
    }

    const { data: equipeBrute, error: erreurEquipe } =
      await supabase
        .from("fiches_intervention_salaries")
        .select("*")
        .eq("entreprise_id", idEntreprise)
        .eq("fiche_id", idFiche)
        .order("created_at", { ascending: true });

    if (erreurEquipe) throw erreurEquipe;

    const equipeData =
      (equipeBrute || []) as FicheSalarie[];

    const affectationTrouvee =
      equipeData.find(
        (item) => item.salarie_id === salarieConnecte.id
      ) || null;

    const estAffectationLegacy =
      !affectationTrouvee &&
      ficheAcces.salarie_id === salarieConnecte.id;

    if (!affectationTrouvee && !estAffectationLegacy) {
      setAccesRefuse(true);
      setFiche(null);
      setElements([]);
      setEquipe([]);
      setAffectation(null);
      return;
    }

    const [ficheResult, elementsResult] =
      await Promise.all([
        supabase
          .from("fiches_intervention")
          .select("*")
          .eq("entreprise_id", idEntreprise)
          .eq("id", idFiche)
          .maybeSingle(),

        supabase
          .from("fiches_intervention_elements")
          .select("*")
          .eq("entreprise_id", idEntreprise)
          .eq("fiche_id", idFiche)
          .order("ordre", { ascending: true }),
      ]);

    if (ficheResult.error) throw ficheResult.error;
    if (elementsResult.error) throw elementsResult.error;

    if (!ficheResult.data) {
      setFiche(null);
      setElements([]);
      setEquipe([]);
      setAffectation(null);
      setMessageErreur("Fiche d’intervention introuvable.");
      return;
    }

    const ficheChargee =
      ficheResult.data as FicheIntervention;

    const affectationLegacy = estAffectationLegacy
      ? ({
          id: "legacy",
          entreprise_id: idEntreprise,
          fiche_id: idFiche,
          salarie_id: salarieConnecte.id,
          salarie_nom:
            ficheChargee.salarie_nom ||
            nomSalarie(salarieConnecte),
          role_chantier: "Intervenant",
          heure_arrivee_prevue:
            ficheChargee.heure_debut_prevue ||
            ficheChargee.heure_debut,
          heure_depart_prevue:
            ficheChargee.heure_fin_prevue ||
            ficheChargee.heure_fin,
          heure_arrivee_reelle:
            ficheChargee.heure_debut_reelle,
          heure_depart_reelle:
            ficheChargee.heure_fin_reelle,
        } as FicheSalarie)
      : null;

    const affectationFinale =
      affectationTrouvee || affectationLegacy;

    if (!affectationFinale) {
      setAccesRefuse(true);
      setFiche(null);
      setElements([]);
      setEquipe([]);
      setAffectation(null);
      return;
    }

    const equipeFinale =
      equipeData.length > 0
        ? equipeData
        : [affectationFinale];

    setAccesRefuse(false);
    setFiche(ficheChargee);
    setElements(
      (elementsResult.data || []) as FicheElement[]
    );
    setEquipe(equipeFinale);
    setAffectation(affectationFinale);

    setCommentairePreparation(
      ficheChargee.commentaire_preparation || ""
    );
    setCommentaireArrivee(
      ficheChargee.commentaire_arrivee || ""
    );
    setCommentaireFin(
      ficheChargee.commentaire_fin || ""
    );
    setDescriptionProbleme(
      ficheChargee.description_probleme || ""
    );
    setSignalerProbleme(
      ficheChargee.probleme_signale === true
    );
  }

  async function rafraichir() {
    if (!entrepriseId || !ficheId) return;
    await chargerFicheComplete(entrepriseId, ficheId, salarie);
  }

  const elementsParCategorie = useMemo(() => {
    const resultat: Record<string, FicheElement[]> = {};

    for (const element of elements) {
      if (!resultat[element.categorie]) resultat[element.categorie] = [];
      resultat[element.categorie].push(element);
    }

    return resultat;
  }, [elements]);

  const materielEtMateriaux = useMemo(() => {
    return elements.filter(
      (element) =>
        element.categorie === "materiel" || element.categorie === "materiaux"
    );
  }, [elements]);

  const nombreElementsPreparables = materielEtMateriaux.length;

  const nombreElementsPrepares = materielEtMateriaux.filter(
    (element) => element.coche_prepare === true
  ).length;

  const toutEstPrepare =
    nombreElementsPreparables === 0 ||
    nombreElementsPrepares === nombreElementsPreparables;

  const nomSignataireEntreprise =
    nomSalarie(salarie) || affectation?.salarie_nom || profilEmail || "";

  const ficheEnLectureSeule =
    fiche?.statut === "terminee" ||
    fiche?.statut === "annulee" ||
    fiche?.statut === "archivee";

  const materielValide = fiche?.etape_materiel_statut === "valide";
  const arriveeValidee = fiche?.etape_arrivee_statut === "valide";
  const finValidee = fiche?.etape_fin_statut === "valide";

  const peutModifierPreparation =
    Boolean(salarie?.id) &&
    !accesRefuse &&
    !ficheEnLectureSeule &&
    !materielValide;

  const peutValiderMateriel =
    Boolean(salarie?.id) &&
    !accesRefuse &&
    !ficheEnLectureSeule &&
    !materielValide &&
    toutEstPrepare;

  const peutValiderArrivee =
    Boolean(affectation) &&
    !ficheEnLectureSeule &&
    materielValide &&
    !arriveeValidee;

  const peutValiderFin =
    Boolean(affectation) &&
    !ficheEnLectureSeule &&
    arriveeValidee &&
    !finValidee;

  async function verifierAccesAvantMutation() {
    if (!entrepriseId || !ficheId || !salarie?.id) {
      setAccesRefuse(true);
      setMessageErreur(
        "Votre compte salarié n’est plus autorisé à modifier cette intervention."
      );
      return false;
    }

    const { data: ficheAccesBrute, error: erreurFicheAcces } =
      await supabase
        .from("fiches_intervention")
        .select("id, entreprise_id, salarie_id, statut")
        .eq("entreprise_id", entrepriseId)
        .eq("id", ficheId)
        .maybeSingle();

    if (erreurFicheAcces || !ficheAccesBrute) {
      setAccesRefuse(true);
      setMessageErreur(
        "Cette intervention n’est plus accessible."
      );
      return false;
    }

    const ficheAcces =
      ficheAccesBrute as FicheAccesMutation;

    if (
      ficheAcces.statut === "terminee" ||
      ficheAcces.statut === "annulee" ||
      ficheAcces.statut === "archivee"
    ) {
      setMessageErreur(
        "Cette intervention est maintenant en lecture seule."
      );

      await chargerFicheComplete(
        entrepriseId,
        ficheId,
        salarie
      );

      return false;
    }

    if (ficheAcces.salarie_id === salarie.id) {
      return true;
    }

    const {
      data: affectationActiveBrute,
      error: erreurAffectation,
    } = await supabase
      .from("fiches_intervention_salaries")
      .select("id")
      .eq("entreprise_id", entrepriseId)
      .eq("fiche_id", ficheId)
      .eq("salarie_id", salarie.id)
      .limit(1)
      .maybeSingle();

    const affectationActive =
      (affectationActiveBrute || null) as {
        id: string;
      } | null;

    if (erreurAffectation || !affectationActive?.id) {
      setAccesRefuse(true);
      setMessageErreur(
        "Vous n’êtes plus affecté à cette intervention."
      );
      return false;
    }

    return true;
  }

  async function basculerPreparationElement(
    element: FicheElement
  ) {
    if (
      !entrepriseId ||
      !fiche ||
      enregistrement ||
      !peutModifierPreparation
    ) {
      return;
    }

    try {
      setEnregistrement(true);
      setMessageErreur("");
      setMessageSucces("");

      const accesAutorise =
        await verifierAccesAvantMutation();

      if (!accesAutorise) return;

      const nouvelleValeur =
        !element.coche_prepare;

      const { error } = await supabase
        .from("fiches_intervention_elements")
        .update({
          coche_prepare: nouvelleValeur,
        })
        .eq("entreprise_id", entrepriseId)
        .eq("fiche_id", fiche.id)
        .eq("id", element.id);

      if (error) throw error;

      setElements((anciens) =>
        anciens.map((item) =>
          item.id === element.id
            ? {
                ...item,
                coche_prepare: nouvelleValeur,
              }
            : item
        )
      );
    } catch (error: unknown) {
      console.error(
        "Erreur préparation élément :",
        error
      );

      setMessageErreur(
        messageErreurInconnue(
          error,
          "Impossible de modifier la préparation de l’élément."
        )
      );
    } finally {
      setEnregistrement(false);
    }
  }

  async function validerMateriel() {
    if (
      !entrepriseId ||
      !fiche ||
      !salarie?.id ||
      enregistrement
    ) {
      return;
    }

    if (!toutEstPrepare) {
      setMessageErreur(
        "Cochez tout le matériel et tous les matériaux avant de valider cette étape."
      );
      return;
    }

    if (!peutValiderMateriel) return;

    try {
      setEnregistrement(true);
      setMessageErreur("");
      setMessageSucces("");

      const accesAutorise =
        await verifierAccesAvantMutation();

      if (!accesAutorise) return;

      const maintenant = new Date().toISOString();

      const { error } = await supabase
        .from("fiches_intervention")
        .update({
          etape_materiel_statut: "valide",
          materiel_valide_at: maintenant,
          commentaire_preparation:
            nettoyerTexte(commentairePreparation),
        })
        .eq("entreprise_id", entrepriseId)
        .eq("id", fiche.id);

      if (error) throw error;

      await rafraichir();
      setMessageSucces("Matériel validé.");
    } catch (error: unknown) {
      console.error(
        "Erreur validation matériel :",
        error
      );

      setMessageErreur(
        messageErreurInconnue(
          error,
          "Impossible de valider le matériel."
        )
      );
    } finally {
      setEnregistrement(false);
    }
  }

  async function validerArrivee() {
    if (
      !entrepriseId ||
      !fiche ||
      !affectation ||
      enregistrement
    ) {
      return;
    }

    if (!materielValide) {
      setMessageErreur(
        "Validez d’abord la préparation du matériel avant l’arrivée chantier."
      );
      return;
    }

    if (!peutValiderArrivee) return;

    try {
      setEnregistrement(true);
      setMessageErreur("");
      setMessageSucces("");

      const accesAutorise =
        await verifierAccesAvantMutation();

      if (!accesAutorise) return;

      const maintenant = new Date().toISOString();
      const heure = heureMaintenant();

      const { error } = await supabase
        .from("fiches_intervention")
        .update({
          statut: "en_cours",
          etape_arrivee_statut: "valide",
          arrivee_validee_at: maintenant,
          heure_debut_reelle:
            fiche.heure_debut_reelle || heure,
          commentaire_arrivee:
            nettoyerTexte(commentaireArrivee),
        })
        .eq("entreprise_id", entrepriseId)
        .eq("id", fiche.id);

      if (error) throw error;

      if (affectation.id !== "legacy") {
        const { error: erreurAffectation } =
          await supabase
            .from("fiches_intervention_salaries")
            .update({
              heure_arrivee_reelle:
                affectation.heure_arrivee_reelle ||
                heure,
            })
            .eq("entreprise_id", entrepriseId)
            .eq("fiche_id", fiche.id)
            .eq("salarie_id", salarie?.id || "")
            .eq("id", affectation.id);

        if (erreurAffectation) {
          throw erreurAffectation;
        }
      }

      await rafraichir();
      setMessageSucces(
        "Arrivée chantier validée."
      );
    } catch (error: unknown) {
      console.error(
        "Erreur validation arrivée :",
        error
      );

      setMessageErreur(
        messageErreurInconnue(
          error,
          "Impossible de valider l’arrivée chantier."
        )
      );
    } finally {
      setEnregistrement(false);
    }
  }

  async function validerFinChantier() {
    if (
      !entrepriseId ||
      !fiche ||
      !affectation ||
      enregistrement
    ) {
      return;
    }

    if (!arriveeValidee) {
      setMessageErreur(
        "Validez d’abord votre arrivée sur le chantier avant de terminer l’intervention."
      );
      return;
    }

    if (
      signalerProbleme &&
      !descriptionProbleme.trim()
    ) {
      setMessageErreur(
        "Décrivez le problème rencontré avant d’enregistrer la fin du chantier."
      );
      return;
    }

    if (!peutValiderFin) return;

    try {
      setEnregistrement(true);
      setMessageErreur("");
      setMessageSucces("");

      const accesAutorise =
        await verifierAccesAvantMutation();

      if (!accesAutorise) return;

      const maintenant = new Date().toISOString();
      const heure = heureMaintenant();

      const statutFin = signalerProbleme
        ? "probleme"
        : "valide";

      const { error } = await supabase
        .from("fiches_intervention")
        .update({
          statut: signalerProbleme
            ? "en_cours"
            : "terminee",
          etape_fin_statut: statutFin,
          fin_validee_at: maintenant,
          heure_fin_reelle:
            fiche.heure_fin_reelle || heure,
          commentaire_fin:
            nettoyerTexte(commentaireFin),
          probleme_signale: signalerProbleme,
          description_probleme: signalerProbleme
            ? nettoyerTexte(descriptionProbleme)
            : null,
        })
        .eq("entreprise_id", entrepriseId)
        .eq("id", fiche.id);

      if (error) throw error;

      if (affectation.id !== "legacy") {
        const { error: erreurAffectation } =
          await supabase
            .from("fiches_intervention_salaries")
            .update({
              heure_depart_reelle:
                affectation.heure_depart_reelle ||
                heure,
            })
            .eq("entreprise_id", entrepriseId)
            .eq("fiche_id", fiche.id)
            .eq("salarie_id", salarie?.id || "")
            .eq("id", affectation.id);

        if (erreurAffectation) {
          throw erreurAffectation;
        }
      }

      await rafraichir();

      setMessageSucces(
        signalerProbleme
          ? "Fin de chantier enregistrée avec problème signalé."
          : "Fin de chantier validée."
      );
    } catch (error: unknown) {
      console.error(
        "Erreur validation fin chantier :",
        error
      );

      setMessageErreur(
        messageErreurInconnue(
          error,
          "Impossible de valider la fin de chantier."
        )
      );
    } finally {
      setEnregistrement(false);
    }
  }

  function renduBlocElements(
    categorie: string,
    titre: string,
    icone: string,
    description: string
  ) {
    const liste = elementsParCategorie[categorie] || [];
    const categoriePreparation =
      categorie === "materiel" || categorie === "materiaux";

    return (
      <section key={categorie} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-xl">
            {icone}
          </div>

          <div>
            <h2 className="font-bold text-slate-950">{titre}</h2>
            <p className="mt-1 text-sm text-slate-500">{description}</p>
          </div>
        </div>

        {liste.length === 0 ? (
          <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
            Aucun élément renseigné.
          </p>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {liste.map((element) => {
              const cartePreparationActive =
                categoriePreparation && peutModifierPreparation;

              const classeCarte = categoriePreparation
                ? element.coche_prepare
                  ? "border-emerald-300 bg-emerald-50 ring-1 ring-emerald-200"
                  : "border-slate-200 bg-slate-50 hover:border-emerald-300 hover:bg-emerald-50/40"
                : "border-slate-200 bg-slate-50";

              return (
                <div
                  key={element.id}
                  role={categoriePreparation ? "button" : undefined}
                  tabIndex={
                    categoriePreparation && cartePreparationActive ? 0 : undefined
                  }
                  aria-pressed={
                    categoriePreparation ? Boolean(element.coche_prepare) : undefined
                  }
                  onClick={() => {
                    if (cartePreparationActive) {
                      void basculerPreparationElement(element);
                    }
                  }}
                  onKeyDown={(event) => {
                    if (
                      !cartePreparationActive ||
                      (event.key !== "Enter" && event.key !== " ")
                    ) {
                      return;
                    }

                    event.preventDefault();
                    void basculerPreparationElement(element);
                  }}
                  className={`rounded-2xl border p-4 transition-all duration-150 ${classeCarte} ${
                    categoriePreparation
                      ? cartePreparationActive
                        ? "cursor-pointer select-none"
                        : "cursor-not-allowed opacity-70"
                      : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p
                      className={`font-semibold ${
                        element.coche_prepare && categoriePreparation
                          ? "text-emerald-950"
                          : "text-slate-950"
                      }`}
                    >
                      {element.icone || "•"} {element.nom}
                    </p>

                    {categoriePreparation && (
                      <span
                        className={`inline-flex min-h-10 shrink-0 items-center rounded-full px-4 py-2 text-xs font-semibold ${
                          element.coche_prepare
                            ? "bg-emerald-600 text-white"
                            : "border border-slate-200 bg-white text-slate-600"
                        }`}
                      >
                        {element.coche_prepare ? "✓ Préparé" : "À préparer"}
                      </span>
                    )}
                  </div>

                  <p
                    className={`mt-2 text-xs ${
                      element.coche_prepare && categoriePreparation
                        ? "text-emerald-700"
                        : "text-slate-500"
                    }`}
                  >
                    Prévu : {Number(element.quantite_prevue || 1)}{" "}
                    {element.unite || "u"}
                    {element.quantite_reelle !== null &&
                    element.quantite_reelle !== undefined
                      ? ` · Réel : ${Number(element.quantite_reelle)} ${
                          element.unite || "u"
                        }`
                      : ""}
                  </p>

                  {element.commentaire_chef && (
                    <p
                      className={`mt-3 rounded-xl px-3 py-2 text-xs ${
                        element.coche_prepare && categoriePreparation
                          ? "bg-white/80 text-emerald-800"
                          : "bg-white text-slate-600"
                      }`}
                    >
                      Chef : {element.commentaire_chef}
                    </p>
                  )}

                  {element.commentaire_salarie && (
                    <p className="mt-2 rounded-xl bg-emerald-100 px-3 py-2 text-xs text-emerald-800">
                      Salarié : {element.commentaire_salarie}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    );
  }

  if (chargement) {
    return (
      <div className="space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-2xl">
            📋
          </div>
          <p className="font-semibold text-slate-950">
            Chargement de l’intervention...
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Récupération des données chantier.
          </p>
        </div>
      </div>
    );
  }

  if (accesRefuse) {
    return (
      <div className="space-y-6">
        <Link
          href="/salarie/planning"
          className="inline-flex min-h-11 items-center rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
        >
          ← Retour au planning
        </Link>

        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-center shadow-sm sm:p-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">
            🔒
          </div>
          <p className="mt-4 text-lg font-bold text-amber-950">
            Intervention non affectée à votre compte
          </p>
          <p className="mx-auto mt-2 max-w-xl text-sm text-amber-800">
            Cette fiche ne fait pas partie de vos interventions. Le chef doit
            vous ajouter à l’équipe du chantier avant que vous puissiez la
            consulter et enregistrer des informations terrain.
          </p>
        </div>
      </div>
    );
  }

  if (!fiche) {
    return (
      <div className="space-y-6">
        <Link
          href="/salarie/planning"
          className="inline-flex min-h-11 items-center rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
        >
          ← Retour au planning
        </Link>

        <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-center">
          <p className="font-bold text-red-700">Fiche introuvable</p>
          <p className="mt-2 text-sm text-red-700">
            Cette intervention n’existe pas ou n’est pas accessible.
          </p>
        </div>
      </div>
    );
  }


  const etapeCourante = !materielValide
    ? 1
    : !arriveeValidee
      ? 2
      : !finValidee
        ? 3
        : 4;

  const titreEtapeCourante =
    etapeCourante === 1
      ? "Préparation du départ"
      : etapeCourante === 2
        ? "Arrivée chantier"
        : etapeCourante === 3
          ? "Intervention en cours"
          : "Fin de chantier / PV";

  const blocsTerrain = BLOCS_ELEMENTS.filter(
    (bloc) => bloc.categorie !== "materiel" && bloc.categorie !== "materiaux"
  );

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 pb-10">
      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <Link
              href="/salarie/planning"
              className="inline-flex min-h-10 items-center rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              ← Planning
            </Link>

            <p className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-emerald-600">
              Étape {etapeCourante} sur 4
            </p>
            <h1 className="mt-1 truncate text-2xl font-bold text-slate-950 sm:text-3xl">
              {titreEtapeCourante}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {fiche.numero ? `${fiche.numero} · ` : ""}
              {titreFiche(fiche)}
            </p>
          </div>

          <button
            type="button"
            onClick={rafraichir}
            disabled={enregistrement}
            className="min-h-10 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Actualiser
          </button>
        </div>

        <div className="mt-5 grid grid-cols-4 gap-2" aria-label={`Étape ${etapeCourante} sur 4`}>
          {[1, 2, 3, 4].map((numero) => (
            <div
              key={numero}
              className={`h-2 rounded-full transition-colors ${
                numero <= etapeCourante ? "bg-emerald-500" : "bg-slate-200"
              }`}
            />
          ))}
        </div>
      </section>

      {messageErreur && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {messageErreur}
        </div>
      )}

      {messageSucces && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {messageSucces}
        </div>
      )}

      {ficheEnLectureSeule && !finValidee && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Cette intervention est en lecture seule car elle est {libelleStatut(
            fiche.statut
          ).toLowerCase()}.
        </div>
      )}

      {etapeCourante === 1 && (
        <div className="space-y-5">
          <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm sm:p-7">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">
                  🧰
                </div>
                <h2 className="mt-4 text-xl font-bold text-emerald-950">
                  Préparez tout le matériel avant de partir
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-emerald-800">
                  Tant que cette étape n’est pas validée, les informations chantier,
                  les travaux, les photos et les étapes suivantes restent masqués.
                </p>
              </div>

              <div className="rounded-2xl bg-white px-4 py-3 text-center shadow-sm">
                <p className="text-2xl font-black text-emerald-700">
                  {nombreElementsPrepares}/{nombreElementsPreparables}
                </p>
                <p className="text-xs font-semibold text-slate-500">préparés</p>
              </div>
            </div>
          </section>

          {renduBlocElements(
            "materiel",
            "Matériel à charger",
            "🧰",
            "Touchez une vignette pour confirmer que le matériel est chargé."
          )}

          {renduBlocElements(
            "materiaux",
            "Matériaux / fournitures",
            "🪨",
            "Confirmez également les matériaux et fournitures à emporter."
          )}

          <section className="rounded-3xl border border-emerald-200 bg-white p-5 shadow-sm sm:p-6">
            {!toutEstPrepare && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
                Il reste {Math.max(0, nombreElementsPreparables - nombreElementsPrepares)} élément(s) à préparer.
              </div>
            )}

            <textarea
              value={commentairePreparation}
              onChange={(event) => setCommentairePreparation(event.target.value)}
              rows={3}
              placeholder="Commentaire de préparation (facultatif)..."
              disabled={!peutModifierPreparation}
              className="mt-4 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
            />

            <button
              type="button"
              onClick={validerMateriel}
              disabled={enregistrement || !peutValiderMateriel}
              className="mt-4 min-h-14 w-full rounded-2xl bg-emerald-600 px-5 py-4 text-base font-bold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {enregistrement
                ? "Validation en cours..."
                : toutEstPrepare
                  ? "✓ Valider le matériel chargé et continuer"
                  : "Tout le matériel doit être préparé"}
            </button>
          </section>
        </div>
      )}

      {etapeCourante === 2 && (
        <div className="space-y-5">
          <section className="rounded-3xl border border-blue-200 bg-blue-50 p-5 shadow-sm sm:p-7">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">
              📍
            </div>
            <h2 className="mt-4 text-xl font-bold text-blue-950">
              Rendez-vous sur le chantier
            </h2>
            <p className="mt-2 text-sm leading-6 text-blue-800">
              Le matériel est validé. L’accès aux travaux et au suivi terrain sera
              débloqué uniquement après l’enregistrement de votre arrivée.
            </p>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Client
                </p>
                <p className="mt-2 text-lg font-bold text-slate-950">
                  {fiche.client_nom || "Client"}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Horaire prévu
                </p>
                <p className="mt-2 text-lg font-bold text-slate-950">
                  {formatHeure(
                    affectation?.heure_arrivee_prevue ||
                      fiche.heure_debut_prevue ||
                      fiche.heure_debut
                  )}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-blue-500">
                Adresse chantier
              </p>
              <p className="mt-2 text-lg font-bold text-blue-950">
                {adresseFiche(fiche)}
              </p>
            </div>

            {fiche.notes_chantier && (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-bold text-amber-950">
                  Accès / remarque avant arrivée
                </p>
                <p className="mt-2 whitespace-pre-line text-sm text-amber-800">
                  {fiche.notes_chantier}
                </p>
              </div>
            )}

            <textarea
              value={commentaireArrivee}
              onChange={(event) => setCommentaireArrivee(event.target.value)}
              rows={3}
              placeholder="Commentaire d’arrivée (facultatif)..."
              disabled={!peutValiderArrivee}
              className="mt-5 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
            />

            <button
              type="button"
              onClick={validerArrivee}
              disabled={enregistrement || !peutValiderArrivee}
              className="mt-4 min-h-14 w-full rounded-2xl bg-blue-600 px-5 py-4 text-base font-bold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {enregistrement
                ? "Enregistrement de l’arrivée..."
                : "📍 Je suis arrivé — enregistrer l’heure"}
            </button>
          </section>
        </div>
      )}

      {etapeCourante === 3 && (
        <div className="space-y-5">
          <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm sm:p-7">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">
                  🌿
                </div>
                <h2 className="mt-4 text-xl font-bold text-emerald-950">
                  Intervention en cours
                </h2>
                <p className="mt-2 text-sm leading-6 text-emerald-800">
                  Votre arrivée est enregistrée. Les informations techniques du
                  chantier sont maintenant accessibles.
                </p>
              </div>

              <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Arrivée réelle
                </p>
                <p className="mt-1 text-xl font-black text-emerald-700">
                  {formatHeure(
                    affectation?.heure_arrivee_reelle || fiche.heure_debut_reelle
                  )}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Client
                </p>
                <p className="mt-2 font-bold text-slate-950">
                  {fiche.client_nom || "Client"}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Adresse
                </p>
                <p className="mt-2 font-bold text-slate-950">
                  {adresseFiche(fiche)}
                </p>
              </div>
            </div>

            {fiche.notes_chantier && (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-bold text-amber-950">
                  Notes chantier / accès
                </p>
                <p className="mt-2 whitespace-pre-line text-sm text-amber-800">
                  {fiche.notes_chantier}
                </p>
              </div>
            )}

            {fiche.notes_internes && (
              <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                <p className="text-sm font-bold text-slate-950">Notes internes</p>
                <p className="mt-2 whitespace-pre-line text-sm text-slate-600">
                  {fiche.notes_internes}
                </p>
              </div>
            )}
          </section>

          {blocsTerrain.map((bloc) =>
            renduBlocElements(
              bloc.categorie,
              bloc.titre,
              bloc.icone,
              bloc.description
            )
          )}

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-xl">
                👥
              </div>
              <div>
                <h2 className="font-bold text-slate-950">Équipe chantier</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Personnes affectées à cette intervention.
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {equipe.map((item) => (
                <div key={item.id} className="rounded-2xl bg-slate-50 p-4">
                  <p className="font-bold text-slate-950">
                    {item.salarie_nom || "Salarié"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {item.role_chantier || "Intervenant"}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <BlocPhotosChantier
            entrepriseId={entrepriseId}
            ficheId={fiche.id}
            userId={authUserId || null}
          />

          <ResumeRetourTerrainFiche
            entrepriseId={entrepriseId}
            ficheId={fiche.id}
            problemeSignale={fiche.probleme_signale}
            descriptionProbleme={fiche.description_probleme}
            afficherActionsPv={false}
            autoriserEnvoiClient={false}
          />

          <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm sm:p-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-xl shadow-sm">
              🏁
            </div>
            <h2 className="mt-4 text-xl font-bold text-amber-950">
              Terminer l’intervention
            </h2>
            <p className="mt-2 text-sm leading-6 text-amber-800">
              À faire uniquement lorsque le chantier est réellement terminé.
              L’heure de départ sera enregistrée automatiquement.
            </p>

            <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl border border-amber-200 bg-white p-4">
              <input
                type="checkbox"
                checked={signalerProbleme}
                onChange={(event) => setSignalerProbleme(event.target.checked)}
                disabled={!peutValiderFin}
                className="mt-1 h-5 w-5 rounded border-slate-300 text-red-600 focus:ring-red-500 disabled:cursor-not-allowed disabled:opacity-60"
              />
              <span>
                <span className="block text-sm font-bold text-slate-950">
                  Signaler un problème ou une réserve
                </span>
                <span className="mt-1 block text-xs text-slate-500">
                  Utilisez cette option si l’intervention ne se termine pas normalement.
                </span>
              </span>
            </label>

            {signalerProbleme && (
              <textarea
                value={descriptionProbleme}
                onChange={(event) => setDescriptionProbleme(event.target.value)}
                rows={4}
                placeholder="Décrivez le problème rencontré..."
                disabled={!peutValiderFin}
                className="mt-4 w-full rounded-2xl border border-red-200 bg-white px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
              />
            )}

            <textarea
              value={commentaireFin}
              onChange={(event) => setCommentaireFin(event.target.value)}
              rows={4}
              placeholder="Commentaire de fin de chantier (facultatif)..."
              disabled={!peutValiderFin}
              className="mt-4 w-full rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
            />

            <button
              type="button"
              onClick={validerFinChantier}
              disabled={enregistrement || !peutValiderFin}
              className="mt-4 min-h-14 w-full rounded-2xl bg-amber-600 px-5 py-4 text-base font-bold text-white shadow-sm hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {enregistrement
                ? "Validation de la fin..."
                : "🏁 Valider la fin du chantier et continuer"}
            </button>
          </section>
        </div>
      )}

      {etapeCourante === 4 && (
        <div className="space-y-5">
          <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm sm:p-7">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">
              ✅
            </div>
            <h2 className="mt-4 text-xl font-bold text-emerald-950">
              Intervention terminée
            </h2>
            <p className="mt-2 text-sm leading-6 text-emerald-800">
              Le suivi terrain est terminé. Il reste uniquement la partie fin de
              chantier / PV.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Arrivée réelle
                </p>
                <p className="mt-2 text-lg font-bold text-slate-950">
                  {formatHeure(
                    affectation?.heure_arrivee_reelle || fiche.heure_debut_reelle
                  )}
                </p>
              </div>
              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Départ réel
                </p>
                <p className="mt-2 text-lg font-bold text-slate-950">
                  {formatHeure(
                    affectation?.heure_depart_reelle || fiche.heure_fin_reelle
                  )}
                </p>
              </div>
            </div>
          </section>

          {fiche.probleme_signale && (
            <section className="rounded-3xl border border-red-200 bg-red-50 p-5 shadow-sm">
              <h2 className="font-bold text-red-800">Problème / réserve signalé</h2>
              <p className="mt-2 whitespace-pre-line text-sm text-red-700">
                {fiche.description_probleme ||
                  "Un problème a été signalé sur cette intervention."}
              </p>
            </section>
          )}

          <BlocPvFinChantier
            entrepriseId={entrepriseId}
            ficheId={fiche.id}
            clientId={fiche.client_id}
            clientNom={fiche.client_nom}
            signataireEntrepriseNom={nomSignataireEntreprise}
            afficherEnvoiEmail={false}
          />
        </div>
      )}
    </div>
  );
}