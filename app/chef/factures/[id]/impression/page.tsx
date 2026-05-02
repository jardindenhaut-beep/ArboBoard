"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { chargerContexteEntreprise } from "@/lib/entreprise";
import { supabase } from "@/lib/supabaseClient";

type Entreprise = {
  id: string;
  nom_entreprise?: string | null;
  slug?: string | null;
  email_contact?: string | null;
  telephone?: string | null;

  adresse?: string | null;
  code_postal?: string | null;
  ville?: string | null;
  siret?: string | null;
  numero_tva?: string | null;
  forme_juridique?: string | null;

  assurance_nom?: string | null;
  assurance_numero_contrat?: string | null;
  assurance_zone_couverture?: string | null;

  mentions_legales_documents?: string | null;
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

type Facture = {
  id: string;
  entreprise_id: string;
  client_id: string | null;
  client_nom: string | null;
  devis_id: string | null;
  numero: string | null;
  objet: string | null;
  description: string | null;
  type_facture: string | null;
  statut: string | null;
  date_facture: string | null;
  date_echeance: string | null;
  total_ht: number | null;
  total_tva: number | null;
  total_ttc: number | null;
  montant_paye: number | null;
  reste_a_payer: number | null;
  notes_internes: string | null;
  conditions: string | null;
};

type LigneFacture = {
  id: string;
  facture_id: string;
  entreprise_id: string;
  ordre: number | null;
  designation: string | null;
  description: string | null;
  quantite: number | null;
  unite: string | null;
  prix_unitaire_ht: number | null;
  tva: number | null;
  total_ht: number | null;
  total_tva: number | null;
  total_ttc: number | null;
};

type EntrepriseParametres = {
  conditions_factures?: string | null;
  mention_retard?: string | null;
  footer_documents?: string | null;
  afficher_logo_documents?: boolean | null;
};

function formatMontant(montant: number | null | undefined) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(Number(montant || 0));
}

function formatNombre(nombre: number | null | undefined) {
  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 2,
  }).format(Number(nombre || 0));
}

function formatDate(date: string | null | undefined) {
  if (!date) return "—";

  try {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(`${date}T00:00:00`));
  } catch {
    return "—";
  }
}

function nomClient(client: Client | null, facture: Facture | null) {
  if (client) {
    if (client.type_client === "particulier") {
      const complet = `${client.prenom || ""} ${client.nom || ""}`.trim();
      return complet || "Client particulier";
    }

    return (
      client.entreprise ||
      client.nom ||
      `${client.prenom || ""} ${client.nom || ""}`.trim() ||
      "Client professionnel"
    );
  }

  return facture?.client_nom || "Client non renseigné";
}

function adresseClient(client: Client | null) {
  if (!client) return "Adresse non renseignée";

  return (
    [client.adresse, client.code_postal, client.ville]
      .filter(Boolean)
      .join(", ") || "Adresse non renseignée"
  );
}

function adresseEntreprise(entreprise: Entreprise | null) {
  if (!entreprise) return "";

  return [entreprise.adresse, entreprise.code_postal, entreprise.ville]
    .filter(Boolean)
    .join(", ");
}

function statutLisible(statut: string | null | undefined) {
  if (statut === "envoyee") return "Envoyée";
  if (statut === "payee") return "Payée";
  if (statut === "en_retard") return "En retard";
  if (statut === "annulee") return "Annulée";
  if (statut === "archive") return "Archivée";
  return "Brouillon";
}

function typeFactureLisible(type: string | null | undefined) {
  if (type === "acompte") return "Facture d’acompte";
  if (type === "solde") return "Facture de solde";
  return "Facture";
}

function calculerTotaux(lignes: LigneFacture[], facture: Facture | null) {
  const totalHtLignes = lignes.reduce(
    (total, ligne) => total + Number(ligne.total_ht || 0),
    0
  );

  const totalTvaLignes = lignes.reduce(
    (total, ligne) => total + Number(ligne.total_tva || 0),
    0
  );

  const totalTtcLignes = lignes.reduce(
    (total, ligne) => total + Number(ligne.total_ttc || 0),
    0
  );

  return {
    totalHt: facture?.total_ht ?? totalHtLignes,
    totalTva: facture?.total_tva ?? totalTvaLignes,
    totalTtc: facture?.total_ttc ?? totalTtcLignes,
  };
}

function infosLegalesEntreprise(entreprise: Entreprise | null) {
  if (!entreprise) return [];

  const infos: string[] = [];

  if (entreprise.forme_juridique) {
    infos.push(entreprise.forme_juridique);
  }

  if (entreprise.siret) {
    infos.push(`SIRET : ${entreprise.siret}`);
  }

  if (entreprise.numero_tva) {
    infos.push(`TVA intracommunautaire : ${entreprise.numero_tva}`);
  }

  return infos;
}

function infosAssuranceEntreprise(entreprise: Entreprise | null) {
  if (!entreprise) return [];

  const infos: string[] = [];

  if (entreprise.assurance_nom) {
    infos.push(`Assurance : ${entreprise.assurance_nom}`);
  }

  if (entreprise.assurance_numero_contrat) {
    infos.push(`Contrat : ${entreprise.assurance_numero_contrat}`);
  }

  if (entreprise.assurance_zone_couverture) {
    infos.push(`Zone de couverture : ${entreprise.assurance_zone_couverture}`);
  }

  return infos;
}

export default function ImpressionFacturePage() {
  const params = useParams();
  const router = useRouter();

  const factureId =
    typeof params.id === "string"
      ? params.id
      : Array.isArray(params.id)
      ? params.id[0]
      : "";

  const [entreprise, setEntreprise] = useState<Entreprise | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [facture, setFacture] = useState<Facture | null>(null);
  const [lignes, setLignes] = useState<LigneFacture[]>([]);
  const [parametres, setParametres] = useState<EntrepriseParametres | null>(
    null
  );

  const [chargement, setChargement] = useState(true);
  const [messageErreur, setMessageErreur] = useState("");

  useEffect(() => {
    chargerDocument();
  }, []);

  async function chargerDocument() {
    try {
      setChargement(true);
      setMessageErreur("");

      if (!factureId) {
        setMessageErreur("Identifiant de la facture introuvable.");
        setChargement(false);
        return;
      }

      const resultat = await chargerContexteEntreprise();

      if (
        resultat.erreur ||
        !resultat.contexte?.profil ||
        !resultat.contexte?.entreprise?.id
      ) {
        setMessageErreur(
          "Impossible de charger votre entreprise. Veuillez vous reconnecter."
        );
        setChargement(false);
        return;
      }

      if (resultat.contexte.profil.role !== "chef") {
        setMessageErreur("Cette page est réservée au chef d’entreprise.");
        setChargement(false);
        return;
      }

      const entrepriseChargee = resultat.contexte.entreprise as Entreprise;
      const idEntreprise = entrepriseChargee.id;

      setEntreprise(entrepriseChargee);

      const { data: factureData, error: factureError } = await supabase
        .from("factures")
        .select("*")
        .eq("id", factureId)
        .eq("entreprise_id", idEntreprise)
        .single();

      if (factureError) throw factureError;

      const factureChargee = factureData as Facture;
      setFacture(factureChargee);

      const { data: lignesData, error: lignesError } = await supabase
        .from("factures_lignes")
        .select("*")
        .eq("facture_id", factureId)
        .eq("entreprise_id", idEntreprise)
        .order("ordre", { ascending: true });

      if (lignesError) throw lignesError;

      setLignes((lignesData || []) as LigneFacture[]);

      if (factureChargee.client_id) {
        const { data: clientData, error: clientError } = await supabase
          .from("clients")
          .select("*")
          .eq("id", factureChargee.client_id)
          .eq("entreprise_id", idEntreprise)
          .maybeSingle();

        if (!clientError && clientData) {
          setClient(clientData as Client);
        }
      }

      const { data: parametresData, error: parametresError } = await supabase
        .from("entreprise_parametres")
        .select("*")
        .eq("entreprise_id", idEntreprise)
        .maybeSingle();

      if (!parametresError && parametresData) {
        setParametres(parametresData as EntrepriseParametres);
      }
    } catch (error: any) {
      console.error("Erreur impression facture :", error);
      setMessageErreur(
        error?.message || "Impossible de charger l’aperçu de la facture."
      );
    } finally {
      setChargement(false);
    }
  }

  const totaux = useMemo(
    () => calculerTotaux(lignes, facture),
    [lignes, facture]
  );

  if (chargement) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="rounded-3xl bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-emerald-50 text-3xl">
            🧾
          </div>
          <p className="text-lg font-bold text-slate-950">
            Chargement de la facture...
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Préparation de l’aperçu imprimable.
          </p>
        </div>
      </div>
    );
  }

  if (messageErreur || !facture) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
        <div className="max-w-lg rounded-3xl bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-red-50 text-3xl">
            ⚠️
          </div>
          <p className="text-lg font-bold text-slate-950">
            Impossible d’afficher la facture
          </p>
          <p className="mt-2 text-sm text-slate-600">
            {messageErreur || "Facture introuvable."}
          </p>

          <button
            onClick={() => router.push("/chef/factures")}
            className="mt-5 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Retour aux factures
          </button>
        </div>
      </div>
    );
  }

  const conditions =
    facture.conditions ||
    parametres?.conditions_factures ||
    "Paiement à réception de facture sauf indication contraire.";

  const mentionRetard =
    parametres?.mention_retard ||
    "En cas de retard de paiement, des pénalités pourront être appliquées, ainsi qu’une indemnité forfaitaire de recouvrement de 40 € pour les professionnels.";

  const footer = parametres?.footer_documents || "Merci pour votre confiance.";

  const mentionsLegales =
    entreprise?.mentions_legales_documents ||
    "Entreprise assurée pour les travaux réalisés selon les garanties du contrat d’assurance en vigueur.";

  const montantPaye = Number(facture.montant_paye || 0);

  const resteAPayer =
    facture.reste_a_payer !== null && facture.reste_a_payer !== undefined
      ? Number(facture.reste_a_payer)
      : Math.max(Number(totaux.totalTtc || 0) - montantPaye, 0);

  const infosLegales = infosLegalesEntreprise(entreprise);
  const infosAssurance = infosAssuranceEntreprise(entreprise);
  const adressePro = adresseEntreprise(entreprise);

  return (
    <main className="min-h-screen bg-slate-100 p-6 print:bg-white print:p-0">
      <div className="mx-auto mb-6 flex max-w-5xl items-center justify-between print:hidden">
        <button
          onClick={() => router.push("/chef/factures")}
          className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          ← Retour aux factures
        </button>

        <button
          onClick={() => window.print()}
          className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
        >
          Imprimer / Enregistrer en PDF
        </button>
      </div>

      <section className="mx-auto max-w-5xl bg-white p-10 shadow-sm print:max-w-none print:p-8 print:shadow-none">
        <header className="flex flex-col gap-8 border-b border-slate-200 pb-8 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-start gap-3">
              {parametres?.afficher_logo_documents !== false && (
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-2xl">
                  🌿
                </div>
              )}

              <div>
                <p className="text-xl font-bold text-slate-950">
                  {entreprise?.nom_entreprise ||
                    entreprise?.slug ||
                    "Votre entreprise"}
                </p>

                {adressePro && (
                  <p className="mt-1 text-sm text-slate-500">{adressePro}</p>
                )}

                <p className="mt-1 text-sm text-slate-500">
                  {entreprise?.email_contact || "Email non renseigné"}
                </p>

                <p className="text-sm text-slate-500">
                  {entreprise?.telephone || "Téléphone non renseigné"}
                </p>

                {infosLegales.length > 0 && (
                  <div className="mt-2 space-y-0.5 text-xs text-slate-500">
                    {infosLegales.map((info) => (
                      <p key={info}>{info}</p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="text-left sm:text-right">
            <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">
              {typeFactureLisible(facture.type_facture)}
            </p>
            <h1 className="mt-1 text-3xl font-bold text-slate-950">
              {facture.numero || "Sans numéro"}
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Statut : {statutLisible(facture.statut)}
            </p>
          </div>
        </header>

        <section className="grid gap-8 border-b border-slate-200 py-8 md:grid-cols-2">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Client
            </p>
            <p className="mt-2 text-lg font-bold text-slate-950">
              {nomClient(client, facture)}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {adresseClient(client)}
            </p>
            {client?.email && (
              <p className="mt-1 text-sm text-slate-600">{client.email}</p>
            )}
            {client?.telephone && (
              <p className="mt-1 text-sm text-slate-600">{client.telephone}</p>
            )}
          </div>

          <div className="md:text-right">
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Informations
            </p>
            <div className="mt-2 space-y-1 text-sm text-slate-600">
              <p>
                <span className="font-semibold text-slate-800">
                  Date facture :
                </span>{" "}
                {formatDate(facture.date_facture)}
              </p>
              <p>
                <span className="font-semibold text-slate-800">
                  Date échéance :
                </span>{" "}
                {formatDate(facture.date_echeance)}
              </p>
            </div>
          </div>
        </section>

        <section className="py-8">
          <h2 className="text-xl font-bold text-slate-950">
            {facture.objet || "Objet non renseigné"}
          </h2>

          {facture.description && (
            <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-700">
              {facture.description}
            </p>
          )}
        </section>

        <section>
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Désignation</th>
                  <th className="px-4 py-3 text-right font-semibold">Qté</th>
                  <th className="px-4 py-3 text-right font-semibold">Unité</th>
                  <th className="px-4 py-3 text-right font-semibold">PU HT</th>
                  <th className="px-4 py-3 text-right font-semibold">TVA</th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Total TTC
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {lignes.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-6 text-center text-slate-500"
                    >
                      Aucune ligne renseignée.
                    </td>
                  </tr>
                ) : (
                  lignes.map((ligne) => (
                    <tr key={ligne.id}>
                      <td className="px-4 py-4 align-top">
                        <p className="font-semibold text-slate-900">
                          {ligne.designation || "Ligne sans désignation"}
                        </p>
                        {ligne.description && (
                          <p className="mt-1 whitespace-pre-line text-xs leading-5 text-slate-500">
                            {ligne.description}
                          </p>
                        )}
                      </td>

                      <td className="px-4 py-4 text-right align-top text-slate-700">
                        {formatNombre(ligne.quantite)}
                      </td>

                      <td className="px-4 py-4 text-right align-top text-slate-700">
                        {ligne.unite || "u"}
                      </td>

                      <td className="px-4 py-4 text-right align-top text-slate-700">
                        {formatMontant(ligne.prix_unitaire_ht)}
                      </td>

                      <td className="px-4 py-4 text-right align-top text-slate-700">
                        {formatNombre(ligne.tva)} %
                      </td>

                      <td className="px-4 py-4 text-right align-top font-semibold text-slate-950">
                        {formatMontant(ligne.total_ttc)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-8 flex justify-end">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 p-5">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Total HT</span>
                <span className="font-semibold text-slate-950">
                  {formatMontant(totaux.totalHt)}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-500">Total TVA</span>
                <span className="font-semibold text-slate-950">
                  {formatMontant(totaux.totalTva)}
                </span>
              </div>

              <div className="flex justify-between border-t border-slate-200 pt-3 text-lg">
                <span className="font-bold text-slate-950">Total TTC</span>
                <span className="font-bold text-slate-950">
                  {formatMontant(totaux.totalTtc)}
                </span>
              </div>

              <div className="flex justify-between border-t border-slate-200 pt-3">
                <span className="text-slate-500">Déjà payé</span>
                <span className="font-semibold text-slate-950">
                  {formatMontant(montantPaye)}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-500">Reste à payer</span>
                <span className="font-bold text-slate-950">
                  {formatMontant(resteAPayer)}
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-10 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 p-5">
            <p className="text-sm font-bold text-slate-950">
              Conditions de paiement
            </p>
            <p className="mt-2 whitespace-pre-line text-xs leading-5 text-slate-600">
              {conditions}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 p-5">
            <p className="text-sm font-bold text-slate-950">
              Retard de paiement
            </p>
            <p className="mt-2 whitespace-pre-line text-xs leading-5 text-slate-600">
              {mentionRetard}
            </p>
          </div>
        </section>

        {(infosAssurance.length > 0 || mentionsLegales) && (
          <section className="mt-8 rounded-2xl border border-slate-200 p-5">
            {infosAssurance.length > 0 && (
              <div>
                <p className="text-sm font-bold text-slate-950">
                  Assurance professionnelle
                </p>
                <div className="mt-2 space-y-1 text-xs text-slate-600">
                  {infosAssurance.map((info) => (
                    <p key={info}>{info}</p>
                  ))}
                </div>
              </div>
            )}

            {mentionsLegales && (
              <div className={infosAssurance.length > 0 ? "mt-4" : ""}>
                <p className="text-sm font-bold text-slate-950">
                  Mentions légales
                </p>
                <p className="mt-2 whitespace-pre-line text-xs leading-5 text-slate-600">
                  {mentionsLegales}
                </p>
              </div>
            )}
          </section>
        )}

        <footer className="mt-10 border-t border-slate-200 pt-5 text-center text-xs text-slate-500">
          {footer}
        </footer>
      </section>
    </main>
  );
}