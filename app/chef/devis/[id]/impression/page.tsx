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

type Devis = {
  id: string;
  entreprise_id: string;
  client_id: string | null;
  client_nom: string | null;
  numero: string | null;
  objet: string | null;
  description: string | null;
  statut: string | null;
  date_devis: string | null;
  date_validite: string | null;
  total_ht: number | null;
  total_tva: number | null;
  total_ttc: number | null;
  conditions: string | null;
  notes_internes: string | null;
};

type LigneDevis = {
  id: string;
  devis_id: string;
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
  conditions_devis?: string | null;
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

function nomClient(client: Client | null, devis: Devis | null) {
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

  return devis?.client_nom || "Client non renseigné";
}

function adresseClient(client: Client | null) {
  if (!client) return "Adresse non renseignée";

  return (
    [client.adresse, client.code_postal, client.ville]
      .filter(Boolean)
      .join(", ") || "Adresse non renseignée"
  );
}

function statutLisible(statut: string | null | undefined) {
  if (statut === "envoye") return "Envoyé";
  if (statut === "accepte") return "Accepté";
  if (statut === "refuse") return "Refusé";
  if (statut === "archive") return "Archivé";
  return "Brouillon";
}

function calculerTotaux(lignes: LigneDevis[], devis: Devis | null) {
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
    totalHt: devis?.total_ht ?? totalHtLignes,
    totalTva: devis?.total_tva ?? totalTvaLignes,
    totalTtc: devis?.total_ttc ?? totalTtcLignes,
  };
}

export default function ImpressionDevisPage() {
  const params = useParams();
  const router = useRouter();

  const devisId =
    typeof params.id === "string"
      ? params.id
      : Array.isArray(params.id)
      ? params.id[0]
      : "";

  const [entreprise, setEntreprise] = useState<Entreprise | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [devis, setDevis] = useState<Devis | null>(null);
  const [lignes, setLignes] = useState<LigneDevis[]>([]);
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

      if (!devisId) {
        setMessageErreur("Identifiant du devis introuvable.");
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

      const { data: devisData, error: devisError } = await supabase
        .from("devis")
        .select("*")
        .eq("id", devisId)
        .eq("entreprise_id", idEntreprise)
        .single();

      if (devisError) throw devisError;

      const devisCharge = devisData as Devis;
      setDevis(devisCharge);

      const { data: lignesData, error: lignesError } = await supabase
        .from("devis_lignes")
        .select("*")
        .eq("devis_id", devisId)
        .eq("entreprise_id", idEntreprise)
        .order("ordre", { ascending: true });

      if (lignesError) throw lignesError;

      setLignes((lignesData || []) as LigneDevis[]);

      if (devisCharge.client_id) {
        const { data: clientData, error: clientError } = await supabase
          .from("clients")
          .select("*")
          .eq("id", devisCharge.client_id)
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
      console.error("Erreur impression devis :", error);
      setMessageErreur(
        error?.message || "Impossible de charger l’aperçu du devis."
      );
    } finally {
      setChargement(false);
    }
  }

  const totaux = useMemo(() => calculerTotaux(lignes, devis), [lignes, devis]);

  if (chargement) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="rounded-3xl bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-emerald-50 text-3xl">
            📝
          </div>
          <p className="text-lg font-bold text-slate-950">
            Chargement du devis...
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Préparation de l’aperçu imprimable.
          </p>
        </div>
      </div>
    );
  }

  if (messageErreur || !devis) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
        <div className="max-w-lg rounded-3xl bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-red-50 text-3xl">
            ⚠️
          </div>
          <p className="text-lg font-bold text-slate-950">
            Impossible d’afficher le devis
          </p>
          <p className="mt-2 text-sm text-slate-600">
            {messageErreur || "Devis introuvable."}
          </p>

          <button
            onClick={() => router.push("/chef/devis")}
            className="mt-5 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Retour aux devis
          </button>
        </div>
      </div>
    );
  }

  const conditions =
    devis.conditions ||
    parametres?.conditions_devis ||
    "Devis valable pendant la durée indiquée.";

  const footer =
    parametres?.footer_documents || "Merci pour votre confiance.";

  return (
    <main className="min-h-screen bg-slate-100 p-6 print:bg-white print:p-0">
      <div className="mx-auto mb-6 flex max-w-5xl items-center justify-between print:hidden">
        <button
          onClick={() => router.push("/chef/devis")}
          className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          ← Retour aux devis
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
            <div className="flex items-center gap-3">
              {parametres?.afficher_logo_documents !== false && (
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-2xl">
                  🌿
                </div>
              )}

              <div>
                <p className="text-xl font-bold text-slate-950">
                  {entreprise?.nom_entreprise ||
                    entreprise?.slug ||
                    "Votre entreprise"}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {entreprise?.email_contact || "Email non renseigné"}
                </p>
                <p className="text-sm text-slate-500">
                  {entreprise?.telephone || "Téléphone non renseigné"}
                </p>
              </div>
            </div>
          </div>

          <div className="text-left sm:text-right">
            <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">
              Devis
            </p>
            <h1 className="mt-1 text-3xl font-bold text-slate-950">
              {devis.numero || "Sans numéro"}
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Statut : {statutLisible(devis.statut)}
            </p>
          </div>
        </header>

        <section className="grid gap-8 border-b border-slate-200 py-8 md:grid-cols-2">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Client
            </p>
            <p className="mt-2 text-lg font-bold text-slate-950">
              {nomClient(client, devis)}
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
                  Date devis :
                </span>{" "}
                {formatDate(devis.date_devis)}
              </p>
              <p>
                <span className="font-semibold text-slate-800">
                  Valable jusqu’au :
                </span>{" "}
                {formatDate(devis.date_validite)}
              </p>
            </div>
          </div>
        </section>

        <section className="py-8">
          <h2 className="text-xl font-bold text-slate-950">
            {devis.objet || "Objet non renseigné"}
          </h2>

          {devis.description && (
            <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-700">
              {devis.description}
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
            </div>
          </div>
        </section>

        <section className="mt-10 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 p-5">
            <p className="text-sm font-bold text-slate-950">
              Conditions du devis
            </p>
            <p className="mt-2 whitespace-pre-line text-xs leading-5 text-slate-600">
              {conditions}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 p-5">
            <p className="text-sm font-bold text-slate-950">Bon pour accord</p>
            <div className="mt-8 h-20 rounded-xl border border-dashed border-slate-300 p-3 text-xs text-slate-400">
              Date, nom, signature précédée de la mention “Bon pour accord”.
            </div>
          </div>
        </section>

        <footer className="mt-10 border-t border-slate-200 pt-5 text-center text-xs text-slate-500">
          {footer}
        </footer>
      </section>
    </main>
  );
}