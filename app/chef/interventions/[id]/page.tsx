"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { chargerContexteEntreprise } from "@/lib/entreprise";
import { supabase } from "@/lib/supabaseClient";
import BlocPhotosChantier from "@/components/interventions/BlocPhotosChantier";
import BlocPvFinChantier from "@/components/interventions/BlocPvFinChantier";
import ResumeRetourTerrainFiche from "@/components/interventions/ResumeRetourTerrainFiche";

type StatutFiche =
  | "brouillon"
  | "planifiee"
  | "en_cours"
  | "terminee"
  | "annulee"
  | "archivee";

type OngletFicheChef =
  | "resume"
  | "preparation"
  | "terrain"
  | "photos"
  | "pv";

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
  entreprise_id?: string | null;
  fiche_id: string;
  salarie_id: string | null;
  salarie_nom: string | null;
  role_chantier: string | null;
  heure_arrivee_prevue: string | null;
  heure_depart_prevue: string | null;
  heure_arrivee_reelle: string | null;
  heure_depart_reelle: string | null;
  arrivee_validee_at?: string | null;
  depart_valide_at?: string | null;
  commentaire_salarie?: string | null;
};

type Devis = {
  id: string;
  numero: string | null;
  objet: string | null;
  statut: string | null;
  total_ht: number | null;
  total_tva: number | null;
  total_ttc: number | null;
};

type Facture = {
  id: string;
  numero: string | null;
  objet: string | null;
  statut: string | null;
  total_ht: number | null;
  total_tva: number | null;
  total_ttc: number | null;
};

type Client = {
  id: string;
  type_client?: string | null;
  nom?: string | null;
  prenom?: string | null;
  entreprise?: string | null;
  email?: string | null;
  telephone?: string | null;
  adresse?: string | null;
  code_postal?: string | null;
  ville?: string | null;
};

type SalarieDisponible = {
  id: string;
  nom: string | null;
  prenom: string | null;
  email: string | null;
  statut: string | null;
};

function nomSalarieDisponible(
  salarie: SalarieDisponible
) {
  const nom = `${salarie.prenom || ""} ${
    salarie.nom || ""
  }`.trim();

  return nom || salarie.email || "Salarié";
}

const BLOCS_ELEMENTS = [
  {
    categorie: "travaux",
    titre: "Travaux à réaliser",
    icone: "✅",
    description: "Liste des tâches prévues sur cette intervention.",
  },
  {
    categorie: "materiel",
    titre: "Matériel à charger",
    icone: "🧰",
    description: "Machines, outils, véhicules et EPI prévus.",
  },
  {
    categorie: "materiaux",
    titre: "Matériaux / fournitures",
    icone: "🪨",
    description: "Fournitures et matériaux nécessaires au chantier.",
  },
  {
    categorie: "consigne_securite",
    titre: "Consignes sécurité",
    icone: "🦺",
    description: "Balisage, EPI, risques, sécurité générale.",
  },
  {
    categorie: "consigne_chantier",
    titre: "Consignes chantier / client",
    icone: "🏠",
    description: "Accès, voisinage, client, évacuation, remarques.",
  },
];

function formatDate(date: string | null | undefined) {
  if (!date) return "Non renseignée";

  try {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(`${date}T00:00:00`));
  } catch {
    return date;
  }
}

function formatDateHeure(date: string | null | undefined) {
  if (!date) return "—";

  try {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  } catch {
    return date;
  }
}

function formatHeure(heure: string | null | undefined) {
  if (!heure) return "—";
  return heure.slice(0, 5);
}

function formatMontant(montant: number | null | undefined) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(Number(montant || 0));
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

function badgeStatut(statut: string | null | undefined) {
  if (statut === "planifiee") return "bg-blue-50 text-blue-700 border-blue-200";
  if (statut === "en_cours") return "bg-amber-50 text-amber-700 border-amber-200";
  if (statut === "terminee")
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (statut === "annulee") return "bg-red-50 text-red-700 border-red-200";
  if (statut === "archivee")
    return "bg-slate-100 text-slate-600 border-slate-200";
  return "bg-slate-50 text-slate-700 border-slate-200";
}

function decorationEntete(statut: string | null | undefined) {
  if (statut === "planifiee") {
    return {
      fond: "from-blue-50 via-white to-white",
      icone: "📅",
      iconeFond: "bg-blue-100 text-blue-700",
      barre: "bg-blue-600",
    };
  }

  if (statut === "en_cours") {
    return {
      fond: "from-amber-50 via-white to-white",
      icone: "🚧",
      iconeFond: "bg-amber-100 text-amber-700",
      barre: "bg-amber-500",
    };
  }

  if (statut === "terminee") {
    return {
      fond: "from-emerald-50 via-white to-white",
      icone: "✅",
      iconeFond: "bg-emerald-100 text-emerald-700",
      barre: "bg-emerald-600",
    };
  }

  if (statut === "annulee") {
    return {
      fond: "from-red-50 via-white to-white",
      icone: "⛔",
      iconeFond: "bg-red-100 text-red-700",
      barre: "bg-red-600",
    };
  }

  if (statut === "archivee") {
    return {
      fond: "from-slate-100 via-white to-white",
      icone: "🗄️",
      iconeFond: "bg-slate-200 text-slate-700",
      barre: "bg-slate-500",
    };
  }

  return {
    fond: "from-slate-50 via-white to-white",
    icone: "📝",
    iconeFond: "bg-slate-100 text-slate-700",
    barre: "bg-slate-500",
  };
}

function pourcentageProgression(valeur: number, total: number) {
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((valeur / total) * 100)));
}

function libelleEtape(statut: string | null | undefined) {
  if (statut === "valide") return "Validée";
  if (statut === "en_cours") return "En cours";
  if (statut === "probleme") return "Problème";
  if (statut === "a_preparer") return "À préparer";
  return "En attente";
}

function classeEtape(statut: string | null | undefined) {
  if (statut === "valide")
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (statut === "en_cours")
    return "border-amber-200 bg-amber-50 text-amber-700";
  if (statut === "probleme") return "border-red-200 bg-red-50 text-red-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

function nomClient(client: Client | null, fallback?: string | null) {
  if (!client) return fallback || "Client non renseigné";

  if (client.type_client === "particulier") {
    const complet = `${client.prenom || ""} ${client.nom || ""}`.trim();
    return complet || fallback || "Client particulier";
  }

  return (
    client.entreprise ||
    client.nom ||
    `${client.prenom || ""} ${client.nom || ""}`.trim() ||
    fallback ||
    "Client professionnel"
  );
}

export default function DetailFicheInterventionPage() {
  const params = useParams();
  const ficheId = String(params?.id || "");

  const [entrepriseId, setEntrepriseId] = useState("");
  const [signataireEntrepriseNom, setSignataireEntrepriseNom] = useState("");

  const [fiche, setFiche] = useState<FicheIntervention | null>(null);
  const [elements, setElements] = useState<FicheElement[]>([]);
  const [equipe, setEquipe] = useState<FicheSalarie[]>([]);
  const [salariesDisponibles, setSalariesDisponibles] =
    useState<SalarieDisponible[]>([]);
  const [selectionEquipe, setSelectionEquipe] = useState<string[]>([]);
  const [enregistrementEquipe, setEnregistrementEquipe] =
    useState(false);
  const [devis, setDevis] = useState<Devis | null>(null);
  const [facture, setFacture] = useState<Facture | null>(null);
  const [client, setClient] = useState<Client | null>(null);

  const [chargement, setChargement] = useState(true);
  const [enregistrement, setEnregistrement] = useState(false);
  const [messageErreur, setMessageErreur] = useState("");
  const [messageSucces, setMessageSucces] = useState("");
  const [ongletActif, setOngletActif] =
    useState<OngletFicheChef>("resume");

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
      setMessageErreur("");
      setMessageSucces("");

      const resultat = await chargerContexteEntreprise();

      if (resultat.erreur || !resultat.contexte?.entreprise?.id) {
        setMessageErreur(
          "Impossible de charger votre entreprise. Veuillez vous reconnecter."
        );
        setChargement(false);
        return;
      }

      const contexte: any = resultat.contexte;
      const idEntreprise = contexte.entreprise.id;

      setEntrepriseId(idEntreprise);
      setSignataireEntrepriseNom(
        contexte?.profil?.nom ||
          contexte?.profil?.email ||
          contexte?.utilisateur?.email ||
          ""
      );

      await chargerFicheComplete(idEntreprise, ficheId);
    } catch (error: any) {
      console.error("Erreur chargement détail fiche intervention :", error);
      setMessageErreur(
        error?.message || "Impossible de charger la fiche d’intervention."
      );
    } finally {
      setChargement(false);
    }
  }

  async function chargerFicheComplete(idEntreprise: string, idFiche: string) {
    const { data: ficheData, error: erreurFiche } = await supabase
      .from("fiches_intervention")
      .select("*")
      .eq("entreprise_id", idEntreprise)
      .eq("id", idFiche)
      .maybeSingle();

    if (erreurFiche) throw erreurFiche;

    if (!ficheData) {
      setFiche(null);
      setMessageErreur("Fiche d’intervention introuvable.");
      return;
    }

    const ficheChargee = ficheData as FicheIntervention;
    setFiche(ficheChargee);

    const [
      elementsResult,
      equipeResult,
      salariesResult,
      clientResult,
      devisResult,
      factureResult,
    ] = await Promise.all([
        supabase
          .from("fiches_intervention_elements")
          .select("*")
          .eq("entreprise_id", idEntreprise)
          .eq("fiche_id", idFiche)
          .order("ordre", { ascending: true }),

        supabase
          .from("fiches_intervention_salaries")
          .select("*")
          .eq("entreprise_id", idEntreprise)
          .eq("fiche_id", idFiche)
          .order("created_at", { ascending: true }),

        supabase
          .from("salaries")
          .select("id, nom, prenom, email, statut")
          .eq("entreprise_id", idEntreprise)
          .order("prenom", { ascending: true })
          .order("nom", { ascending: true }),

        ficheChargee.client_id
          ? supabase
              .from("clients")
              .select("*")
              .eq("entreprise_id", idEntreprise)
              .eq("id", ficheChargee.client_id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),

        ficheChargee.devis_id
          ? supabase
              .from("devis")
              .select("id, numero, objet, statut, total_ht, total_tva, total_ttc")
              .eq("entreprise_id", idEntreprise)
              .eq("id", ficheChargee.devis_id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),

        ficheChargee.facture_id
          ? supabase
              .from("factures")
              .select("id, numero, objet, statut, total_ht, total_tva, total_ttc")
              .eq("entreprise_id", idEntreprise)
              .eq("id", ficheChargee.facture_id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ]);

    if (elementsResult.error) throw elementsResult.error;
    if (equipeResult.error) throw equipeResult.error;
    if (salariesResult.error) throw salariesResult.error;
    if (clientResult.error) throw clientResult.error;
    if (devisResult.error) throw devisResult.error;
    if (factureResult.error) throw factureResult.error;

    const equipeChargee =
      (equipeResult.data || []) as FicheSalarie[];

    const salariesActifs =
      ((salariesResult.data || []) as SalarieDisponible[]).filter(
        (salarie) => {
          const statut = String(
            salarie.statut || "actif"
          ).toLowerCase();

          return ![
            "archive",
            "archivee",
            "archivée",
            "inactif",
            "supprime",
            "supprimé",
          ].includes(statut);
        }
      );

    const selectionInitiale = Array.from(
      new Set([
        ...equipeChargee
          .map((item) => item.salarie_id)
          .filter((id): id is string => Boolean(id)),
        ...(ficheChargee.salarie_id
          ? [ficheChargee.salarie_id]
          : []),
      ])
    );

    setElements((elementsResult.data || []) as FicheElement[]);
    setEquipe(equipeChargee);
    setSalariesDisponibles(salariesActifs);
    setSelectionEquipe(selectionInitiale);
    setClient((clientResult.data || null) as Client | null);
    setDevis((devisResult.data || null) as Devis | null);
    setFacture((factureResult.data || null) as Facture | null);
  }

  function basculerSalarieEquipe(salarieId: string) {
    setSelectionEquipe((ancienne) =>
      ancienne.includes(salarieId)
        ? ancienne.filter((id) => id !== salarieId)
        : [...ancienne, salarieId]
    );
    setMessageErreur("");
    setMessageSucces("");
  }

  async function enregistrerEquipeAffectee() {
    if (!entrepriseId || !fiche) return;

    try {
      setEnregistrementEquipe(true);
      setMessageErreur("");
      setMessageSucces("");

      const selection = Array.from(
        new Set(selectionEquipe)
      );

      const affectationsExistantes = new Map(
        equipe
          .filter(
            (item): item is FicheSalarie & {
              salarie_id: string;
            } => Boolean(item.salarie_id)
          )
          .map((item) => [
            item.salarie_id,
            item,
          ])
      );

      const aSupprimer = Array.from(
        affectationsExistantes.keys()
      ).filter((id) => !selection.includes(id));

      if (aSupprimer.length > 0) {
        const { error } = await supabase
          .from("fiches_intervention_salaries")
          .delete()
          .eq("entreprise_id", entrepriseId)
          .eq("fiche_id", fiche.id)
          .in("salarie_id", aSupprimer);

        if (error) throw error;
      }

      const aAjouter = selection.filter(
        (id) => !affectationsExistantes.has(id)
      );

      if (aAjouter.length > 0) {
        const payload = aAjouter.map((id) => {
          const salarie = salariesDisponibles.find(
            (item) => item.id === id
          );

          return {
            entreprise_id: entrepriseId,
            fiche_id: fiche.id,
            salarie_id: id,
            salarie_nom: salarie
              ? nomSalarieDisponible(salarie)
              : "Salarié",
            role_chantier: "Intervenant",
            heure_arrivee_prevue:
              fiche.heure_debut_prevue ||
              fiche.heure_debut ||
              null,
            heure_depart_prevue:
              fiche.heure_fin_prevue ||
              fiche.heure_fin ||
              null,
          };
        });

        const { error } = await supabase
          .from("fiches_intervention_salaries")
          .upsert(payload, {
            onConflict: "fiche_id,salarie_id",
          });

        if (error) throw error;
      }

      const premierId = selection[0] || null;
      const premierSalarie =
        salariesDisponibles.find(
          (item) => item.id === premierId
        ) || null;

      const { error: ficheError } = await supabase
        .from("fiches_intervention")
        .update({
          salarie_id: premierId,
          salarie_nom: premierSalarie
            ? nomSalarieDisponible(premierSalarie)
            : null,
        })
        .eq("entreprise_id", entrepriseId)
        .eq("id", fiche.id);

      if (ficheError) throw ficheError;

      await chargerFicheComplete(
        entrepriseId,
        fiche.id
      );

      setMessageSucces(
        selection.length > 0
          ? `${selection.length} salarié(s) affecté(s) à cette intervention.`
          : "L’équipe a été retirée de cette intervention."
      );
    } catch (error) {
      setMessageErreur(
        error instanceof Error
          ? error.message
          : "Impossible d’enregistrer l’équipe."
      );
    } finally {
      setEnregistrementEquipe(false);
    }
  }

  async function rafraichir() {
    if (!entrepriseId || !ficheId) return;
    await chargerFicheComplete(entrepriseId, ficheId);
  }

  async function changerStatut(nouveauStatut: StatutFiche) {
    if (!entrepriseId || !fiche) return;

    try {
      setEnregistrement(true);
      setMessageErreur("");
      setMessageSucces("");

      const { error } = await supabase
        .from("fiches_intervention")
        .update({
          statut: nouveauStatut,
        })
        .eq("entreprise_id", entrepriseId)
        .eq("id", fiche.id);

      if (error) throw error;

      await rafraichir();
      setMessageSucces(`Statut mis à jour : ${libelleStatut(nouveauStatut)}.`);
    } catch (error: any) {
      console.error("Erreur changement statut fiche :", error);
      setMessageErreur(
        error?.message || "Impossible de modifier le statut de la fiche."
      );
    } finally {
      setEnregistrement(false);
    }
  }

  const elementsParCategorie = useMemo(() => {
    const resultat: Record<string, FicheElement[]> = {};

    for (const element of elements) {
      if (!resultat[element.categorie]) resultat[element.categorie] = [];
      resultat[element.categorie].push(element);
    }

    return resultat;
  }, [elements]);

  const travauxSimples = useMemo(() => {
    return [
      fiche?.travaux_prevus,
      fiche?.materiel_prevu,
      fiche?.consignes_securite,
    ]
      .filter(Boolean)
      .join("\n\n");
  }, [fiche]);

  const nombreEtapesValidees = useMemo(() => {
    if (!fiche) return 0;

    return [
      fiche.etape_materiel_statut,
      fiche.etape_arrivee_statut,
      fiche.etape_fin_statut,
    ].filter((statut) => statut === "valide").length;
  }, [fiche]);

  const nombreElementsPrepares = useMemo(() => {
    return elements.filter((element) => element.coche_prepare).length;
  }, [elements]);

  function renduEtape({
    numero,
    titre,
    description,
    statut,
    dateValidation,
    commentaire,
    icone,
  }: {
    numero: number;
    titre: string;
    description: string;
    statut: string | null | undefined;
    dateValidation: string | null | undefined;
    commentaire: string | null | undefined;
    icone: string;
  }) {
    return (
      <div className={`relative overflow-hidden rounded-3xl border p-4 ${classeEtape(statut)}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/80 text-xl shadow-sm">
              {icone}
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wide opacity-70">
                Étape {numero}
              </p>
              <p className="mt-1 font-bold">{titre}</p>
              <p className="mt-1 text-xs opacity-80">{description}</p>
            </div>
          </div>

          <span className="shrink-0 rounded-full border border-current/15 bg-white/70 px-3 py-1 text-xs font-bold">
            {libelleEtape(statut)}
          </span>
        </div>

        <div className="mt-4 border-t border-current/10 pt-3 text-xs">
          <p className="font-medium opacity-80">
            Validation : {formatDateHeure(dateValidation)}
          </p>

          {commentaire && (
            <p className="mt-2 whitespace-pre-line rounded-2xl bg-white/70 px-3 py-2 leading-5">
              {commentaire}
            </p>
          )}
        </div>
      </div>
    );
  }

  function renduEtapes() {
    if (!fiche) return null;

    return (
      <div className="space-y-4">
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold text-slate-950">
                Progression terrain
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {nombreEtapesValidees} étape(s) validée(s) sur 3
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="h-2 w-36 overflow-hidden rounded-full bg-slate-200 sm:w-48">
                <div
                  className="h-full rounded-full bg-emerald-600 transition-all"
                  style={{ width: `${progressionEtapes}%` }}
                />
              </div>
              <span className="text-xs font-bold text-slate-700">
                {progressionEtapes} %
              </span>
            </div>
          </div>
        </div>

        <div className="grid gap-3 xl:grid-cols-3">
          {renduEtape({
            numero: 1,
            titre: "Préparation matériel",
            description: "Matériel, fournitures et EPI préparés.",
            statut: fiche.etape_materiel_statut,
            dateValidation: fiche.materiel_valide_at,
            commentaire: fiche.commentaire_preparation,
            icone: "🧰",
          })}

          {renduEtape({
            numero: 2,
            titre: "Arrivée chantier",
            description: "Présence de l’équipe et démarrage confirmé.",
            statut: fiche.etape_arrivee_statut,
            dateValidation: fiche.arrivee_validee_at,
            commentaire: fiche.commentaire_arrivee,
            icone: "📍",
          })}

          {renduEtape({
            numero: 3,
            titre: "Fin de chantier",
            description: "Travaux, photos et PV de fin validés.",
            statut: fiche.etape_fin_statut,
            dateValidation: fiche.fin_validee_at,
            commentaire: fiche.commentaire_fin,
            icone: "✅",
          })}
        </div>
      </div>
    );
  }

  function renduBlocElements(
    categorie: string,
    titre: string,
    icone: string,
    description: string
  ) {
    const liste = elementsParCategorie[categorie] || [];

    if (liste.length === 0) return null;

    const prepares = liste.filter((element) => element.coche_prepare).length;

    return (
      <section
        key={categorie}
        className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-xl">
              {icone}
            </div>

            <div>
              <h2 className="font-bold text-slate-950">{titre}</h2>
              <p className="mt-1 text-sm text-slate-500">{description}</p>
            </div>
          </div>

          <span className="w-fit rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600">
            {prepares}/{liste.length} préparé(s)
          </span>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {liste.map((element) => (
            <div
              key={element.id}
              className={`rounded-2xl border p-4 transition ${
                element.coche_prepare
                  ? "border-emerald-200 bg-emerald-50/70"
                  : "border-slate-200 bg-slate-50"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-lg shadow-sm">
                    {element.icone || "•"}
                  </span>

                  <div className="min-w-0">
                    <p className="font-semibold text-slate-950">
                      {element.nom}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Prévu : {Number(element.quantite_prevue || 1)}{" "}
                      {element.unite || "u"}
                      {element.quantite_reelle !== null &&
                      element.quantite_reelle !== undefined
                        ? ` · Réel : ${Number(element.quantite_reelle)} ${
                            element.unite || "u"
                          }`
                        : ""}
                    </p>
                  </div>
                </div>

                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
                    element.coche_prepare
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-white text-slate-500"
                  }`}
                >
                  {element.coche_prepare ? "Préparé" : "À préparer"}
                </span>
              </div>

              {element.commentaire_chef && (
                <div className="mt-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs leading-5 text-slate-600">
                  <span className="font-bold text-slate-700">Chef :</span>{" "}
                  {element.commentaire_chef}
                </div>
              )}

              {element.commentaire_salarie && (
                <div className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs leading-5 text-emerald-700">
                  <span className="font-bold">Retour salarié :</span>{" "}
                  {element.commentaire_salarie}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    );
  }

  function renduActionsStatut() {
    if (!fiche) return null;

    const statut = fiche.statut || "brouillon";

    return (
      <div className="grid gap-2 sm:flex sm:flex-wrap sm:justify-end">
        <button
          type="button"
          onClick={() => void rafraichir()}
          disabled={enregistrement}
          className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {enregistrement ? "Mise à jour…" : "↻ Actualiser"}
        </button>

        {devis ? (
          <Link
            href={`/chef/devis?devisId=${devis.id}`}
            className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
          >
            Voir le devis
          </Link>
        ) : null}

        {facture ? (
          <Link
            href={`/chef/factures?factureId=${facture.id}`}
            className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
          >
            Voir la facture
          </Link>
        ) : null}

        {(statut === "brouillon" || statut === "planifiee") && (
          <button
            type="button"
            onClick={() => void changerStatut("en_cours")}
            disabled={enregistrement}
            className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Démarrer l’intervention
          </button>
        )}

        {statut === "en_cours" && (
          <button
            type="button"
            onClick={() => void changerStatut("terminee")}
            disabled={enregistrement}
            className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Marquer terminée
          </button>
        )}

        {statut === "terminee" && (
          <button
            type="button"
            onClick={() => void changerStatut("archivee")}
            disabled={enregistrement}
            className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-300 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Archiver la fiche
          </button>
        )}
      </div>
    );
  }

  if (chargement) {
    return (
      <div className="space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-2xl">
            📋
          </div>
          <p className="font-semibold text-slate-950">
            Chargement de la fiche...
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Récupération des données du chantier.
          </p>
        </div>
      </div>
    );
  }

  if (!fiche) {
    return (
      <div className="space-y-6">
        <Link
          href="/chef/interventions"
          className="inline-flex rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
        >
          ← Retour aux fiches
        </Link>

        <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-center">
          <p className="font-bold text-red-700">Fiche introuvable</p>
          <p className="mt-2 text-sm text-red-700">
            Cette fiche n’existe pas ou n’appartient pas à votre entreprise.
          </p>
        </div>
      </div>
    );
  }

  const statutActuel = fiche.statut || "brouillon";
  const ficheArchivee = statutActuel === "archivee";
  const ficheTerminee = statutActuel === "terminee";
  const clientAffiche = nomClient(client, fiche.client_nom);
  const decoration = decorationEntete(statutActuel);
  const progressionEtapes = pourcentageProgression(
    nombreEtapesValidees,
    3
  );
  const progressionPreparation = pourcentageProgression(
    nombreElementsPrepares,
    elements.length
  );

  return (
    <div className="space-y-6 pb-28 xl:pb-10">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className={`h-1.5 w-full ${decoration.barre}`} />

        <div
          className={`border-b border-slate-200 bg-gradient-to-br ${decoration.fond} p-5 sm:p-7`}
        >
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <Link
                href="/chef/interventions"
                className="inline-flex min-h-10 items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                ← Retour aux fiches
              </Link>

              <div className="mt-5 flex items-start gap-4">
                <div
                  className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl shadow-sm ${decoration.iconeFond}`}
                >
                  {decoration.icone}
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${badgeStatut(
                        fiche.statut
                      )}`}
                    >
                      {libelleStatut(fiche.statut)}
                    </span>

                    {fiche.numero ? (
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-600">
                        {fiche.numero}
                      </span>
                    ) : null}

                    {fiche.type_intervention ? (
                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                        {fiche.type_intervention}
                      </span>
                    ) : null}
                  </div>

                  <h1 className="mt-3 break-words text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                    {titreFiche(fiche)}
                  </h1>

                  <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2 xl:grid-cols-[minmax(0,220px)_minmax(0,1fr)]">
                    <p className="flex min-w-0 items-start gap-2">
                      <span className="shrink-0">👤</span>
                      <span className="truncate font-semibold text-slate-800">
                        {clientAffiche}
                      </span>
                    </p>

                    <p className="flex min-w-0 items-start gap-2">
                      <span className="shrink-0">📍</span>
                      <span className="break-words">
                        {adresseFiche(fiche)}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="w-full xl:max-w-xl">
              {renduActionsStatut()}
            </div>
          </div>
        </div>

        <div className="grid gap-px bg-slate-200 sm:grid-cols-2 xl:grid-cols-4">
          <div className="bg-white p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <span className="text-lg">📅</span>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Date prévue
              </p>
            </div>
            <p className="mt-2 text-base font-bold text-slate-950">
              {formatDate(fiche.date_prevue || fiche.date_intervention)}
            </p>
          </div>

          <div className="bg-white p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <span className="text-lg">🕘</span>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Horaires prévus
              </p>
            </div>
            <p className="mt-2 text-base font-bold text-slate-950">
              {formatHeure(fiche.heure_debut_prevue || fiche.heure_debut)} →{" "}
              {formatHeure(fiche.heure_fin_prevue || fiche.heure_fin)}
            </p>
          </div>

          <div className="bg-white p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <span className="text-lg">⏱️</span>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Horaires réels
              </p>
            </div>
            <p className="mt-2 text-base font-bold text-slate-950">
              {formatHeure(fiche.heure_debut_reelle)} →{" "}
              {formatHeure(fiche.heure_fin_reelle)}
            </p>
          </div>

          <div className="bg-white p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">🧰</span>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Préparation
                </p>
              </div>
              <span className="text-xs font-bold text-emerald-700">
                {progressionPreparation} %
              </span>
            </div>

            <p className="mt-2 text-base font-bold text-slate-950">
              {nombreElementsPrepares}/{elements.length} élément(s)
            </p>

            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-emerald-600 transition-all"
                style={{ width: `${progressionPreparation}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      <nav className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        <div className="flex min-w-max gap-2">
          {[
            ["#suivi-terrain", "🧭 Suivi terrain"],
            ["#informations-chantier", "📍 Chantier"],
            ["#contenu-fiche", "📋 Travaux et matériel"],
            ["#photos-chantier", "📷 Photos"],
            ["#pv-fin-chantier", "✍️ PV de fin"],
          ].map(([href, label]) => (
            <a
              key={href}
              href={href}
              className="rounded-xl px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-emerald-50 hover:text-emerald-700"
            >
              {label}
            </a>
          ))}
        </div>
      </nav>

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

      {ficheArchivee && (
        <div className="rounded-2xl border border-slate-300 bg-slate-100 px-4 py-3 text-sm text-slate-700">
          <span className="font-bold">Fiche archivée.</span> Elle reste
          consultable, mais aucune action de changement de statut n’est affichée.
        </div>
      )}

      {ficheTerminee && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <span className="font-bold">Intervention terminée.</span> Vérifiez les
          photos et le PV avant d’archiver définitivement la fiche.
        </div>
      )}

      <nav className="sticky top-3 z-20 overflow-x-auto rounded-2xl border border-slate-200 bg-white/95 p-1.5 shadow-sm backdrop-blur">
        <div className="flex min-w-max gap-1">
          {[
            ["resume", "Résumé", "📋"],
            ["preparation", "Préparation", "🧰"],
            ["terrain", "Suivi terrain", "🧭"],
            ["photos", "Photos", "📷"],
            ["pv", "Fin / PV", "✍️"],
          ].map(([valeur, label, icone]) => (
            <button
              key={valeur}
              type="button"
              onClick={() =>
                setOngletActif(valeur as OngletFicheChef)
              }
              className={`rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                ongletActif === valeur
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <span className="mr-1.5">{icone}</span>
              {label}
            </button>
          ))}
        </div>
      </nav>

      {fiche.probleme_signale && ongletActif === "resume" && (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-xl">
              ⚠️
            </div>
            <div>
              <h2 className="font-bold text-red-800">Problème signalé</h2>
              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-red-700">
                {fiche.description_probleme ||
                  "Un problème a été signalé sur cette intervention."}
              </p>
            </div>
          </div>
        </section>
      )}

      <section
        id="suivi-terrain"
        className={`scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 ${
          ongletActif === "terrain" ? "block" : "hidden"
        }`}
      >
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-xl">
            🧭
          </div>
          <div>
            <h2 className="font-bold text-slate-950">
              Suivi terrain en 3 étapes
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Préparation, arrivée sur place et validation de fin de chantier.
            </p>
          </div>
        </div>

        <div className="mt-5">{renduEtapes()}</div>

        <ResumeRetourTerrainFiche
          entrepriseId={entrepriseId}
          ficheId={fiche.id}
          problemeSignale={fiche.probleme_signale}
          descriptionProbleme={fiche.description_probleme}
          afficherActionsPv={false}
          autoriserEnvoiClient={true}
        />
      </section>

      <section
        className={`grid gap-5 ${
          ongletActif === "resume"
            ? "xl:grid-cols-[minmax(0,1fr)_360px]"
            : "grid-cols-1"
        }`}
      >
        <div className="min-w-0 space-y-5">
          <section
            id="informations-chantier"
            className={`scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 ${
              ongletActif === "resume" ? "block" : "hidden"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-xl">
                📍
              </div>
              <div>
                <h2 className="font-bold text-slate-950">
                  Informations chantier
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Client, adresse, accès et informations internes.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Client
                </p>
                <p className="mt-2 font-bold text-slate-950">
                  {clientAffiche}
                </p>

                <div className="mt-3 space-y-1 text-sm text-slate-600">
                  {client?.email ? (
                    <a
                      href={`mailto:${client.email}`}
                      className="block break-all font-medium text-emerald-700 hover:underline"
                    >
                      {client.email}
                    </a>
                  ) : (
                    <p className="text-amber-700">Aucun email enregistré</p>
                  )}

                  {client?.telephone && (
                    <a
                      href={`tel:${client.telephone}`}
                      className="block font-medium text-slate-700 hover:underline"
                    >
                      {client.telephone}
                    </a>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Adresse chantier
                </p>
                <p className="mt-2 whitespace-pre-line font-bold leading-6 text-slate-950">
                  {adresseFiche(fiche)}
                </p>
              </div>
            </div>

            {fiche.notes_chantier && (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-bold text-amber-950">
                  Notes chantier / accès
                </p>
                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-amber-800">
                  {fiche.notes_chantier}
                </p>
              </div>
            )}

            {fiche.notes_internes && (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-bold text-slate-950">
                  Notes internes chef
                </p>
                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">
                  {fiche.notes_internes}
                </p>
              </div>
            )}
          </section>

          <div
            id="contenu-fiche"
            className={`scroll-mt-24 space-y-4 ${
              ongletActif === "preparation" ? "block" : "hidden"
            }`}
          >
            {BLOCS_ELEMENTS.map((bloc) =>
              renduBlocElements(
                bloc.categorie,
                bloc.titre,
                bloc.icone,
                bloc.description
              )
            )}
          </div>

          {travauxSimples &&
            elements.length === 0 &&
            ongletActif === "preparation" && (
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-xl">
                  📝
                </div>
                <div>
                  <h2 className="font-bold text-slate-950">
                    Informations préparées
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Contenu historique de la fiche, sans éléments détaillés.
                  </p>
                </div>
              </div>
              <p className="mt-4 whitespace-pre-line rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                {travauxSimples}
              </p>
            </section>
          )}

          <section
            id="photos-chantier"
            className={`scroll-mt-24 space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 ${
              ongletActif === "photos" ? "block" : "hidden"
            }`}
          >
            <div>
              <p className="text-sm font-bold text-slate-950">
                Photos du chantier
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Photos avant, pendant et après l’intervention.
              </p>
            </div>

            <BlocPhotosChantier
              entrepriseId={entrepriseId}
              ficheId={fiche.id}
              userId={null}
            />
          </section>

          <section
            id="pv-fin-chantier"
            className={`scroll-mt-24 space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 ${
              ongletActif === "pv" ? "block" : "hidden"
            }`}
          >
            <div>
              <p className="text-sm font-bold text-slate-950">
                Procès-verbal de fin de chantier
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Signature, téléchargement et envoi au client par le chef.
              </p>
            </div>

            <BlocPvFinChantier
              entrepriseId={entrepriseId}
              ficheId={fiche.id}
              clientId={fiche.client_id}
              clientNom={clientAffiche}
              signataireEntrepriseNom={signataireEntrepriseNom}
              afficherEnvoiEmail={true}
            />
          </section>
        </div>

        <aside
          className={`space-y-4 xl:sticky xl:top-24 xl:self-start ${
            ongletActif === "resume" ? "block" : "hidden"
          }`}
        >
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-bold text-slate-950">
                  Équipe affectée
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Plusieurs salariés peuvent travailler sur la même fiche.
                </p>
              </div>

              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                {selectionEquipe.length}
              </span>
            </div>

            {salariesDisponibles.length === 0 ? (
              <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                Aucun salarié actif disponible.
              </p>
            ) : (
              <div className="mt-4 max-h-72 space-y-2 overflow-y-auto pr-1">
                {salariesDisponibles.map((salarie) => {
                  const actif =
                    selectionEquipe.includes(
                      salarie.id
                    );

                  const retourTerrain =
                    equipe.find(
                      (item) =>
                        item.salarie_id ===
                        salarie.id
                    ) || null;

                  return (
                    <label
                      key={salarie.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3 transition ${
                        actif
                          ? "border-emerald-300 bg-emerald-50"
                          : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={actif}
                        onChange={() =>
                          basculerSalarieEquipe(
                            salarie.id
                          )
                        }
                        disabled={
                          enregistrementEquipe ||
                          fiche.statut ===
                            "archivee"
                        }
                        className="mt-1 h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />

                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold text-slate-950">
                          {nomSalarieDisponible(
                            salarie
                          )}
                        </span>

                        {retourTerrain ? (
                          <span className="mt-1 block text-xs text-slate-500">
                            Réel :{" "}
                            {formatHeure(
                              retourTerrain.heure_arrivee_reelle
                            )}{" "}
                            →{" "}
                            {formatHeure(
                              retourTerrain.heure_depart_reelle
                            )}
                          </span>
                        ) : (
                          <span className="mt-1 block text-xs text-slate-400">
                            Pas encore de retour terrain.
                          </span>
                        )}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}

            <button
              type="button"
              onClick={() =>
                void enregistrerEquipeAffectee()
              }
              disabled={
                enregistrementEquipe ||
                fiche.statut === "archivee"
              }
              className="mt-4 w-full rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {enregistrementEquipe
                ? "Enregistrement…"
                : "Enregistrer l’équipe"}
            </button>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-bold text-slate-950">Documents liés</h2>

            <div className="mt-4 space-y-3">
              {devis ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-emerald-600">
                        Devis
                      </p>
                      <p className="mt-2 font-bold text-emerald-950">
                        {devis.numero || "Devis sans numéro"}
                      </p>
                    </div>
                    <span className="rounded-full bg-white px-2 py-1 text-[11px] font-bold text-emerald-700">
                      {devis.statut || "—"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-emerald-700">
                    {devis.objet || "Sans objet"}
                  </p>
                  <p className="mt-2 text-sm font-bold text-emerald-900">
                    {formatMontant(devis.total_ttc)}
                  </p>
                  <Link
                    href={`/chef/devis?devisId=${devis.id}`}
                    className="mt-3 inline-flex min-h-10 items-center rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                  >
                    Ouvrir ce devis
                  </Link>
                </div>
              ) : (
                <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                  Aucun devis lié.
                </p>
              )}

              {facture ? (
                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
                        Facture
                      </p>
                      <p className="mt-2 font-bold text-blue-950">
                        {facture.numero || "Facture sans numéro"}
                      </p>
                    </div>
                    <span className="rounded-full bg-white px-2 py-1 text-[11px] font-bold text-blue-700">
                      {facture.statut || "—"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-blue-700">
                    {facture.objet || "Sans objet"}
                  </p>
                  <p className="mt-2 text-sm font-bold text-blue-900">
                    {formatMontant(facture.total_ttc)}
                  </p>
                  <Link
                    href={`/chef/factures?factureId=${facture.id}`}
                    className="mt-3 inline-flex min-h-10 items-center rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                  >
                    Ouvrir cette facture
                  </Link>
                </div>
              ) : (
                <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                  Aucune facture liée.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-bold text-slate-950">Résumé fiche</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <dt className="text-slate-500">Éléments</dt>
                <dd className="font-bold text-slate-950">{elements.length}</dd>
              </div>
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <dt className="text-slate-500">Préparés</dt>
                <dd className="font-bold text-emerald-700">
                  {nombreElementsPrepares}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <dt className="text-slate-500">Étapes validées</dt>
                <dd className="font-bold text-slate-950">
                  {nombreEtapesValidees}/3
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">Dernière mise à jour</dt>
                <dd className="text-right text-xs font-semibold text-slate-700">
                  {formatDateHeure(fiche.updated_at)}
                </dd>
              </div>
            </dl>
          </section>
        </aside>
      </section>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 p-3 shadow-[0_-8px_30px_rgba(15,23,42,0.08)] backdrop-blur xl:hidden">
        <div className="mx-auto grid max-w-3xl grid-cols-2 gap-2">
          <Link
            href="/chef/interventions"
            className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
          >
            ← Liste des fiches
          </Link>

          <button
            type="button"
            onClick={() => void rafraichir()}
            disabled={enregistrement}
            className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {enregistrement ? "Mise à jour…" : "↻ Actualiser"}
          </button>
        </div>
      </div>

    </div>
  );
}