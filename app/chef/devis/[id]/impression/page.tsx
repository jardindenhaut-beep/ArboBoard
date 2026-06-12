"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { chargerContexteEntreprise } from "@/lib/entreprise";
import { supabase } from "@/lib/supabaseClient";

type Entreprise = {
  id: string;
  nom_entreprise?: string | null;
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
  created_at: string | null;
  updated_at: string | null;
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

function formatMontant(montant: number | null | undefined) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(Number(montant || 0));
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
  if (devis?.client_nom) return devis.client_nom;

  if (!client) return "Client non renseigné";

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

function adresseComplete(
  adresse?: string | null,
  codePostal?: string | null,
  ville?: string | null
) {
  return [adresse, [codePostal, ville].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join("\n");
}

function libelleStatut(statut: string | null | undefined) {
  if (statut === "envoye") return "Envoyé";
  if (statut === "accepte") return "Accepté";
  if (statut === "refuse") return "Refusé";
  if (statut === "archive") return "Archivé";
  return "Brouillon";
}

export default function ImpressionDevisPage() {
  const params = useParams();
  const devisId = String(params?.id || "");

  const [chargement, setChargement] = useState(true);
  const [messageErreur, setMessageErreur] = useState("");

  const [entreprise, setEntreprise] = useState<Entreprise | null>(null);
  const [devis, setDevis] = useState<Devis | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [lignes, setLignes] = useState<LigneDevis[]>([]);

  useEffect(() => {
    chargerPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [devisId]);

  async function chargerPage() {
    try {
      setChargement(true);
      setMessageErreur("");

      if (!devisId) {
        setMessageErreur("Identifiant de devis manquant.");
        return;
      }

      const resultat = await chargerContexteEntreprise();

      if (resultat.erreur || !resultat.contexte?.entreprise?.id) {
        setMessageErreur(
          "Impossible de charger votre entreprise. Veuillez vous reconnecter."
        );
        return;
      }

      const entrepriseCourante = resultat.contexte.entreprise as Entreprise;
      setEntreprise(entrepriseCourante);

      const { data: devisData, error: devisError } = await supabase
        .from("devis")
        .select("*")
        .eq("id", devisId)
        .eq("entreprise_id", entrepriseCourante.id)
        .maybeSingle();

      if (devisError) throw devisError;

      if (!devisData) {
        setMessageErreur("Devis introuvable.");
        return;
      }

      const devisCharge = devisData as Devis;
      setDevis(devisCharge);

      const { data: lignesData, error: lignesError } = await supabase
        .from("devis_lignes")
        .select("*")
        .eq("devis_id", devisId)
        .eq("entreprise_id", entrepriseCourante.id)
        .order("ordre", { ascending: true });

      if (lignesError) throw lignesError;

      setLignes((lignesData || []) as LigneDevis[]);

      if (devisCharge.client_id) {
        const { data: clientData, error: clientError } = await supabase
          .from("clients")
          .select("*")
          .eq("id", devisCharge.client_id)
          .eq("entreprise_id", entrepriseCourante.id)
          .maybeSingle();

        if (clientError) throw clientError;

        setClient((clientData || null) as Client | null);
      }
    } catch (error: any) {
      console.error("Erreur chargement impression devis :", error);
      setMessageErreur(error?.message || "Impossible de charger le document.");
    } finally {
      setChargement(false);
    }
  }

  if (chargement) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <div className="rounded-3xl bg-white p-8 text-center shadow-sm">
          <p className="text-lg font-bold text-slate-950">
            Chargement du devis...
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Préparation de l’impression.
          </p>
        </div>
      </main>
    );
  }

  if (messageErreur || !devis || !entreprise) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <div className="max-w-xl rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sm">
          <p className="text-lg font-bold text-red-700">
            Impossible d’afficher le devis
          </p>
          <p className="mt-2 text-sm text-slate-600">
            {messageErreur || "Document introuvable."}
          </p>
        </div>
      </main>
    );
  }

  const adresseEntreprise = adresseComplete(
    entreprise.adresse,
    entreprise.code_postal,
    entreprise.ville
  );

  const adresseClient = adresseComplete(
    client?.adresse,
    client?.code_postal,
    client?.ville
  );

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-950 print:bg-white print:px-0 print:py-0">
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 12mm;
          }

          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }

          .no-print {
            display: none !important;
          }

          body * {
            visibility: hidden !important;
          }

          .zone-impression,
          .zone-impression * {
            visibility: visible !important;
          }

          .zone-impression {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            background: white !important;
          }

          .print-header-grid {
            display: grid !important;
            grid-template-columns: 1fr 280px !important;
            gap: 2rem !important;
            align-items: start !important;
          }

          .print-info-grid {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 2rem !important;
            align-items: start !important;
          }

          .print-bottom-grid {
            display: grid !important;
            grid-template-columns: 1fr 340px !important;
            gap: 2rem !important;
            align-items: start !important;
          }

          main {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
        }
      `}</style>

      <div className="no-print mx-auto mb-6 flex max-w-5xl justify-between gap-3">
        <a
          href="/chef/devis"
          className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          Retour devis
        </a>

        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
        >
          Imprimer / PDF
        </button>
      </div>

      <section className="zone-impression mx-auto max-w-5xl rounded-3xl bg-white p-8 shadow-sm print:max-w-none print:rounded-none print:p-0 print:shadow-none">
        <header className="print-header-grid grid gap-8 border-b border-slate-200 pb-8 md:grid-cols-[1fr_280px]">
          <div>
            <p className="text-2xl font-black tracking-tight text-slate-950">
              {entreprise.nom_entreprise || "Entreprise"}
            </p>

            {entreprise.forme_juridique && (
              <p className="mt-1 text-sm text-slate-600">
                {entreprise.forme_juridique}
              </p>
            )}

            {adresseEntreprise && (
              <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-700">
                {adresseEntreprise}
              </p>
            )}

            <div className="mt-3 space-y-1 text-sm text-slate-700">
              {entreprise.telephone && <p>Tél. : {entreprise.telephone}</p>}
              {entreprise.email_contact && (
                <p>Email : {entreprise.email_contact}</p>
              )}
              {entreprise.siret && <p>SIRET : {entreprise.siret}</p>}
              {entreprise.numero_tva && (
                <p>TVA intracommunautaire : {entreprise.numero_tva}</p>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-3xl font-black tracking-tight text-slate-950">
              DEVIS
            </p>

            <p className="mt-2 text-sm font-semibold text-slate-700">
              {devis.numero || "Sans numéro"}
            </p>

            <div className="mt-5 space-y-2 text-sm text-slate-700">
              <p>
                <span className="font-semibold">Date :</span>{" "}
                {formatDate(devis.date_devis)}
              </p>
              <p>
                <span className="font-semibold">Validité :</span>{" "}
                {formatDate(devis.date_validite)}
              </p>
              <p>
                <span className="font-semibold">Statut :</span>{" "}
                {libelleStatut(devis.statut)}
              </p>
            </div>
          </div>
        </header>

        <section className="print-info-grid grid gap-8 border-b border-slate-200 py-8 md:grid-cols-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Client
            </p>

            <p className="mt-2 text-lg font-bold text-slate-950">
              {nomClient(client, devis)}
            </p>

            {adresseClient && (
              <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-700">
                {adresseClient}
              </p>
            )}

            <div className="mt-3 space-y-1 text-sm text-slate-700">
              {client?.email && <p>Email : {client.email}</p>}
              {client?.telephone && <p>Tél. : {client.telephone}</p>}
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Objet
            </p>

            <p className="mt-2 text-lg font-bold text-slate-950">
              {devis.objet || "Sans objet"}
            </p>

            {devis.description && (
              <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-700">
                {devis.description}
              </p>
            )}
          </div>
        </section>

        <section className="py-8">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-300 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-3 py-3 font-bold">Désignation</th>
                <th className="px-3 py-3 text-right font-bold">Qté</th>
                <th className="px-3 py-3 text-right font-bold">Unité</th>
                <th className="px-3 py-3 text-right font-bold">PU HT</th>
                <th className="px-3 py-3 text-right font-bold">TVA</th>
                <th className="px-3 py-3 text-right font-bold">Total HT</th>
              </tr>
            </thead>

            <tbody>
              {lignes.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="border-b border-slate-200 px-3 py-6 text-center text-slate-500"
                  >
                    Aucune ligne renseignée.
                  </td>
                </tr>
              ) : (
                lignes.map((ligne) => (
                  <tr key={ligne.id} className="border-b border-slate-200">
                    <td className="px-3 py-4 align-top">
                      <p className="font-semibold text-slate-950">
                        {ligne.designation || "Ligne sans désignation"}
                      </p>

                      {ligne.description && (
                        <p className="mt-1 whitespace-pre-line text-xs leading-5 text-slate-600">
                          {ligne.description}
                        </p>
                      )}
                    </td>

                    <td className="px-3 py-4 text-right align-top">
                      {Number(ligne.quantite || 0).toLocaleString("fr-FR")}
                    </td>

                    <td className="px-3 py-4 text-right align-top">
                      {ligne.unite || "u"}
                    </td>

                    <td className="px-3 py-4 text-right align-top">
                      {formatMontant(ligne.prix_unitaire_ht)}
                    </td>

                    <td className="px-3 py-4 text-right align-top">
                      {Number(ligne.tva || 0).toLocaleString("fr-FR")} %
                    </td>

                    <td className="px-3 py-4 text-right align-top font-semibold">
                      {formatMontant(ligne.total_ht)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>

        <section className="print-bottom-grid grid gap-8 border-t border-slate-200 pt-8 md:grid-cols-[1fr_340px]">
          <div className="space-y-5">
            {devis.conditions && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Conditions
                </p>
                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">
                  {devis.conditions}
                </p>
              </div>
            )}

            {entreprise.assurance_nom && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Assurance professionnelle
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  {entreprise.assurance_nom}
                  {entreprise.assurance_numero_contrat
                    ? ` — Contrat n° ${entreprise.assurance_numero_contrat}`
                    : ""}
                  {entreprise.assurance_zone_couverture
                    ? ` — Zone : ${entreprise.assurance_zone_couverture}`
                    : ""}
                </p>
              </div>
            )}

            {entreprise.mentions_legales_documents && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Mentions légales
                </p>
                <p className="mt-2 whitespace-pre-line text-xs leading-5 text-slate-600">
                  {entreprise.mentions_legales_documents}
                </p>
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Total HT</span>
                <span className="font-semibold">
                  {formatMontant(devis.total_ht)}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-500">Total TVA</span>
                <span className="font-semibold">
                  {formatMontant(devis.total_tva)}
                </span>
              </div>

              <div className="flex justify-between border-t border-slate-200 pt-3 text-lg">
                <span className="font-black text-slate-950">Total TTC</span>
                <span className="font-black text-slate-950">
                  {formatMontant(devis.total_ttc)}
                </span>
              </div>
            </div>
          </div>
        </section>

        <footer className="mt-10 border-t border-slate-200 pt-5 text-center text-xs text-slate-500">
          <p>Document généré par Arboboard.</p>
        </footer>
      </section>
    </main>
  );
}