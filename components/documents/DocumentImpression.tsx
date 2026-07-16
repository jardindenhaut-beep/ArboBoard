"use client";

import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
import { chargerContexteEntreprise } from "@/lib/entreprise";
import {
  chargerParametresEntrepriseClient,
  type ParametresEntrepriseClient,
} from "@/lib/parametresEntrepriseClient";
import { normaliserDesignDocuments } from "@/lib/documents/designDocuments";
import { supabase } from "@/lib/supabaseClient";

type TypeDocumentImpression = "devis" | "facture";

type Props = {
  typeDocument: TypeDocumentImpression;
  documentId: string;
};

type Entreprise = Record<string, any> & {
  id: string;
};

type EntrepriseImpression = Entreprise &
  ParametresEntrepriseClient & {
    email_contact?: string | null;
    numero_tva?: string | null;
  };

type DocumentCommercial = Record<string, any> & {
  id: string;
  entreprise_id: string;
};

type LigneDocument = Record<string, any>;

function formatMontant(montant: unknown) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(Number(montant || 0));
}

function formatDate(date: unknown) {
  const valeur = String(date || "").trim();

  if (!valeur) return "—";

  try {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(`${valeur.slice(0, 10)}T00:00:00`));
  } catch {
    return "—";
  }
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

function nomClient(
  client: Record<string, any> | null,
  document: DocumentCommercial | null
) {
  if (document?.client_nom) return String(document.client_nom);
  if (!client) return "Client non renseigné";

  if (client.type_client === "particulier") {
    const nom = `${client.prenom || ""} ${client.nom || ""}`.trim();
    return nom || "Client particulier";
  }

  return (
    client.entreprise ||
    client.nom ||
    `${client.prenom || ""} ${client.nom || ""}`.trim() ||
    "Client professionnel"
  );
}

function initialesEntreprise(nom: string) {
  const mots = nom.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  return mots.length
    ? mots.map((mot) => mot.charAt(0).toUpperCase()).join("")
    : "AR";
}

export default function DocumentImpression({
  typeDocument,
  documentId,
}: Props) {
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");

  const [entreprise, setEntreprise] =
    useState<Entreprise | null>(null);
  const [parametres, setParametres] =
    useState<ParametresEntrepriseClient | null>(null);
  const [document, setDocument] =
    useState<DocumentCommercial | null>(null);
  const [client, setClient] =
    useState<Record<string, any> | null>(null);
  const [lignes, setLignes] =
    useState<LigneDocument[]>([]);
  const [factureOrigine, setFactureOrigine] =
    useState<Record<string, any> | null>(null);

  useEffect(() => {
    void charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeDocument, documentId]);

  async function charger() {
    try {
      setChargement(true);
      setErreur("");

      if (!documentId) {
        throw new Error("Identifiant du document manquant.");
      }

      const contexte = await chargerContexteEntreprise();
      const entrepriseCourante =
        contexte.contexte?.entreprise as Entreprise | undefined;

      if (contexte.erreur || !entrepriseCourante?.id) {
        throw new Error(
          contexte.erreur ||
            "Impossible de charger votre entreprise."
        );
      }

      setEntreprise(entrepriseCourante);

      const parametresEntreprise =
        await chargerParametresEntrepriseClient(
          entrepriseCourante.id
        );

      setParametres(parametresEntreprise);

      const tableDocument =
        typeDocument === "devis" ? "devis" : "factures";

      const { data: documentData, error: documentError } =
        await supabase
          .from(tableDocument)
          .select("*")
          .eq("id", documentId)
          .eq("entreprise_id", entrepriseCourante.id)
          .maybeSingle();

      if (documentError) throw documentError;
      if (!documentData) {
        throw new Error(
          typeDocument === "devis"
            ? "Devis introuvable."
            : "Facture introuvable."
        );
      }

      const documentCharge =
        documentData as DocumentCommercial;

      setDocument(documentCharge);

      const tableLignes =
        typeDocument === "devis"
          ? "devis_lignes"
          : "factures_lignes";

      const colonneDocument =
        typeDocument === "devis"
          ? "devis_id"
          : "facture_id";

      const { data: lignesData, error: lignesError } =
        await supabase
          .from(tableLignes)
          .select("*")
          .eq(colonneDocument, documentId)
          .eq("entreprise_id", entrepriseCourante.id)
          .order("ordre", { ascending: true });

      if (lignesError) throw lignesError;

      setLignes((lignesData || []) as LigneDocument[]);

      if (documentCharge.client_id) {
        const { data: clientData, error: clientError } =
          await supabase
            .from("clients")
            .select("*")
            .eq("id", documentCharge.client_id)
            .eq("entreprise_id", entrepriseCourante.id)
            .maybeSingle();

        if (clientError) throw clientError;
        setClient(clientData || null);
      } else {
        setClient(null);
      }

      if (
        typeDocument === "facture" &&
        documentCharge.facture_origine_id
      ) {
        const { data: origineData, error: origineError } =
          await supabase
            .from("factures")
            .select("id, numero, date_facture, total_ttc")
            .eq("id", documentCharge.facture_origine_id)
            .eq("entreprise_id", entrepriseCourante.id)
            .maybeSingle();

        if (origineError) throw origineError;
        setFactureOrigine(origineData || null);
      } else {
        setFactureOrigine(null);
      }
    } catch (error) {
      setErreur(
        error instanceof Error
          ? error.message
          : "Impossible de charger le document."
      );
    } finally {
      setChargement(false);
    }
  }

  const design = useMemo(
    () => normaliserDesignDocuments(parametres),
    [parametres]
  );

  if (chargement) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <div className="rounded-3xl bg-white p-8 text-center shadow-sm">
          <p className="text-lg font-bold text-slate-950">
            Chargement du document…
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Préparation de l’impression.
          </p>
        </div>
      </main>
    );
  }

  if (erreur || !document || !entreprise || !parametres) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <div className="max-w-xl rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sm">
          <p className="text-lg font-bold text-red-700">
            Impossible d’afficher le document
          </p>
          <p className="mt-2 text-sm text-slate-600">
            {erreur || "Document introuvable."}
          </p>
        </div>
      </main>
    );
  }

  const estAvoir =
    typeDocument === "facture" &&
    (!!document.est_avoir ||
      document.type_facture === "avoir");

  const estDevis = typeDocument === "devis";
  const titre = estDevis
    ? "DEVIS"
    : estAvoir
      ? "AVOIR"
      : "FACTURE";

  const entrepriseFusionnee: EntrepriseImpression = {
    ...entreprise,
    ...parametres,
    nom_entreprise:
      parametres.nom_entreprise ||
      entreprise.nom_entreprise ||
      "Entreprise",
    email_contact:
      typeof entreprise.email_contact === "string"
        ? entreprise.email_contact
        : null,
    numero_tva:
      typeof entreprise.numero_tva === "string"
        ? entreprise.numero_tva
        : null,
  };

  const adresseEntreprise = adresseComplete(
    entrepriseFusionnee.adresse,
    entrepriseFusionnee.code_postal,
    entrepriseFusionnee.ville
  );

  const adresseClient = adresseComplete(
    client?.adresse,
    client?.code_postal,
    client?.ville
  );

  const adresseChantier = adresseComplete(
    document.adresse_chantier,
    document.code_postal_chantier,
    document.ville_chantier
  );

  const conditions =
    document.conditions ||
    (estDevis
      ? parametres.conditions_generales_devis
      : parametres.conditions_generales_factures);

  const compact =
    design.design_modele_document === "compact" ||
    design.design_lignes_compactes;

  const classique =
    design.design_modele_document === "classique";

  const enteteEmpilee =
    design.design_disposition_entete === "empilee";

  const logoTaille =
    design.design_taille_logo === "petit"
      ? "h-12 w-12"
      : design.design_taille_logo === "grand"
        ? "h-24 w-24"
        : "h-16 w-16";

  const variables = {
    "--doc-primary": design.design_couleur_principale,
    "--doc-secondary": design.design_couleur_secondaire,
  } as CSSProperties;

  const enteteTableau =
    design.design_style_tableau === "lignes"
      ? {
          backgroundColor: design.design_couleur_principale,
          color: "#ffffff",
        }
      : design.design_style_tableau === "minimal"
        ? {
            backgroundColor: "#ffffff",
            color: design.design_couleur_principale,
          }
        : {
            backgroundColor: design.design_couleur_secondaire,
            color: design.design_couleur_principale,
          };

  const retour =
    typeDocument === "devis"
      ? "/chef/devis"
      : "/chef/factures";

  return (
    <main
      style={variables}
      className="min-h-screen bg-slate-100 px-4 py-8 text-slate-950 print:bg-white print:px-0 print:py-0"
    >
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 10mm;
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
            inset: 0 auto auto 0 !important;
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
            border: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            background: white !important;
          }
        }
      `}</style>

      <div className="no-print mx-auto mb-6 flex max-w-5xl justify-between gap-3">
        <a
          href={retour}
          className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          Retour
        </a>

        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-2xl px-5 py-3 text-sm font-semibold text-white shadow-sm"
          style={{
            backgroundColor: design.design_couleur_principale,
          }}
        >
          Imprimer / PDF
        </button>
      </div>

      <section
        className={`zone-impression mx-auto max-w-5xl bg-white shadow-sm print:max-w-none print:shadow-none ${
          classique ? "rounded-sm" : "rounded-3xl"
        } ${compact ? "p-6" : "p-8"}`}
      >
        {!classique && (
          <div
            className="mb-6 h-1.5 rounded-full"
            style={{
              backgroundColor: design.design_couleur_principale,
            }}
          />
        )}

        <header
          className={`flex gap-7 border-b border-slate-200 pb-7 ${
            enteteEmpilee
              ? "flex-col"
              : "flex-col justify-between md:flex-row"
          }`}
        >
          <div
            className={`flex min-w-0 flex-1 gap-4 ${
              design.design_position_logo === "centre"
                ? "flex-col items-center text-center"
                : design.design_position_logo === "droite"
                  ? "flex-row-reverse text-right"
                  : "items-start"
            }`}
          >
            <div
              className={`${logoTaille} flex shrink-0 items-center justify-center overflow-hidden rounded-2xl font-black`}
              style={{
                backgroundColor: design.design_couleur_secondaire,
                color: design.design_couleur_principale,
              }}
            >
              {entrepriseFusionnee.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={entrepriseFusionnee.logo_url}
                  alt="Logo de l’entreprise"
                  className="h-full w-full object-contain p-1"
                />
              ) : (
                initialesEntreprise(
                  entrepriseFusionnee.nom_entreprise
                )
              )}
            </div>

            <div className="min-w-0">
              <h1 className="break-words text-2xl font-black tracking-tight">
                {entrepriseFusionnee.nom_entreprise}
              </h1>

              {entrepriseFusionnee.forme_juridique && (
                <p className="mt-1 text-sm text-slate-500">
                  {entrepriseFusionnee.forme_juridique}
                </p>
              )}

              {design.design_afficher_adresse &&
                adresseEntreprise && (
                  <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-600">
                    {adresseEntreprise}
                  </p>
                )}

              {design.design_afficher_contact && (
                <div className="mt-2 text-sm leading-6 text-slate-600">
                  {entrepriseFusionnee.telephone && (
                    <p>
                      Téléphone : {entrepriseFusionnee.telephone}
                    </p>
                  )}
                  {(entrepriseFusionnee.email ||
                    entrepriseFusionnee.email_contact) && (
                    <p>
                      Email :{" "}
                      {entrepriseFusionnee.email ||
                        entrepriseFusionnee.email_contact}
                    </p>
                  )}
                </div>
              )}

              <div className="mt-2 text-xs leading-5 text-slate-500">
                {design.design_afficher_siret &&
                  entrepriseFusionnee.siret && (
                    <p>SIRET : {entrepriseFusionnee.siret}</p>
                  )}

                {design.design_afficher_tva &&
                  (entrepriseFusionnee
                    .numero_tva_intracommunautaire ||
                    entrepriseFusionnee.numero_tva) && (
                    <p>
                      TVA intracommunautaire :{" "}
                      {entrepriseFusionnee
                        .numero_tva_intracommunautaire ||
                        entrepriseFusionnee.numero_tva}
                    </p>
                  )}
              </div>
            </div>
          </div>

          <div
            className={`${enteteEmpilee ? "w-full" : "w-full md:w-72"} border p-5 ${
              classique ? "rounded-sm" : "rounded-2xl"
            }`}
            style={{
              borderColor: design.design_couleur_principale,
              backgroundColor: design.design_couleur_secondaire,
            }}
          >
            <p
              className="text-xs font-black uppercase tracking-[0.18em]"
              style={{
                color: design.design_couleur_principale,
              }}
            >
              {titre}
            </p>

            <p className="mt-2 break-words text-2xl font-black">
              {document.numero || "Sans numéro"}
            </p>

            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Date</dt>
                <dd className="font-bold">
                  {formatDate(
                    estDevis
                      ? document.date_devis
                      : document.date_facture
                  )}
                </dd>
              </div>

              {estDevis ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Validité</dt>
                  <dd className="font-bold">
                    {formatDate(document.date_validite)}
                  </dd>
                </div>
              ) : !estAvoir ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Échéance</dt>
                  <dd className="font-bold">
                    {formatDate(document.date_echeance)}
                  </dd>
                </div>
              ) : null}

              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Statut</dt>
                <dd className="font-bold">
                  {String(document.statut || "brouillon")}
                </dd>
              </div>
            </dl>
          </div>
        </header>

        <section
          className={`grid grid-cols-1 gap-7 border-b border-slate-200 ${
            compact ? "py-5" : "py-7"
          } md:grid-cols-2`}
        >
          <div>
            <p
              className="text-xs font-black uppercase tracking-[0.15em]"
              style={{
                color: design.design_couleur_principale,
              }}
            >
              Client
            </p>

            <h2 className="mt-2 text-lg font-black">
              {nomClient(client, document)}
            </h2>

            {adresseClient && (
              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">
                {adresseClient}
              </p>
            )}

            {client?.email && (
              <p className="mt-2 text-sm text-slate-600">
                Email : {client.email}
              </p>
            )}

            {client?.telephone && (
              <p className="text-sm text-slate-600">
                Téléphone : {client.telephone}
              </p>
            )}
          </div>

          <div>
            <p
              className="text-xs font-black uppercase tracking-[0.15em]"
              style={{
                color: design.design_couleur_principale,
              }}
            >
              Objet du {titre.toLowerCase()}
            </p>

            <h2 className="mt-2 text-lg font-black">
              {document.objet || "Sans objet"}
            </h2>

            {document.description && (
              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">
                {document.description}
              </p>
            )}
          </div>
        </section>

        {(adresseChantier || document.notes_chantier) && (
          <section
            className={`mt-6 border p-4 ${
              classique ? "rounded-sm" : "rounded-2xl"
            }`}
            style={{
              borderColor: design.design_couleur_principale,
              backgroundColor: design.design_couleur_secondaire,
            }}
          >
            <h2
              className="font-black"
              style={{
                color: design.design_couleur_principale,
              }}
            >
              Lieu d’intervention / chantier
            </h2>

            {adresseChantier && (
              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">
                {adresseChantier}
              </p>
            )}

            {document.notes_chantier && (
              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">
                Notes : {document.notes_chantier}
              </p>
            )}
          </section>
        )}

        {estAvoir && (
          <section
            className={`mt-6 border p-4 ${
              classique ? "rounded-sm" : "rounded-2xl"
            }`}
            style={{
              borderColor: design.design_couleur_principale,
              backgroundColor: design.design_couleur_secondaire,
            }}
          >
            <h2
              className="font-black"
              style={{
                color: design.design_couleur_principale,
              }}
            >
              Informations liées à l’avoir
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-700">
              {factureOrigine
                ? `Référence : facture ${
                    factureOrigine.numero || "sans numéro"
                  } du ${formatDate(
                    factureOrigine.date_facture
                  )}.`
                : "Cet avoir est établi en référence à une facture précédemment émise."}
            </p>

            {document.motif_avoir && (
              <p className="mt-2 text-sm text-slate-600">
                Motif : {document.motif_avoir}
              </p>
            )}
          </section>
        )}

        <section
          className={`mt-7 overflow-hidden ${
            design.design_style_tableau === "minimal"
              ? "border-y border-slate-200"
              : classique
                ? "border border-slate-200"
                : "rounded-2xl border border-slate-200"
          }`}
        >
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr style={enteteTableau}>
                <th className="px-3 py-3 text-left">Désignation</th>
                <th className="px-3 py-3 text-right">Qté</th>
                <th className="px-3 py-3 text-right">Unité</th>
                <th className="px-3 py-3 text-right">PU HT</th>
                <th className="px-3 py-3 text-right">TVA</th>
                <th className="px-3 py-3 text-right">Total HT</th>
              </tr>
            </thead>

            <tbody>
              {lignes.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="border-t border-slate-100 px-3 py-5 text-center text-slate-500"
                  >
                    Aucune ligne renseignée.
                  </td>
                </tr>
              ) : (
                lignes.map((ligne, index) => (
                  <tr
                    key={ligne.id || index}
                    className="border-t border-slate-100"
                  >
                    <td
                      className={`px-3 ${
                        compact ? "py-2" : "py-3"
                      }`}
                    >
                      <p className="font-bold text-slate-900">
                        {ligne.designation ||
                          "Ligne sans désignation"}
                      </p>
                      {ligne.description && (
                        <p className="mt-1 whitespace-pre-line text-xs leading-5 text-slate-500">
                          {ligne.description}
                        </p>
                      )}
                    </td>

                    <td className="px-3 text-right">
                      {Number(ligne.quantite || 0).toLocaleString(
                        "fr-FR"
                      )}
                    </td>
                    <td className="px-3 text-right">
                      {ligne.unite || "u"}
                    </td>
                    <td className="px-3 text-right">
                      {formatMontant(ligne.prix_unitaire_ht)}
                    </td>
                    <td className="px-3 text-right">
                      {Number(ligne.tva || 0)} %
                    </td>
                    <td className="px-3 text-right font-bold">
                      {formatMontant(ligne.total_ht)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>

        <section
          className={`mt-7 flex flex-col gap-7 ${
            design.design_position_totaux === "gauche"
              ? "lg:flex-row-reverse"
              : "lg:flex-row"
          }`}
        >
          <div className="min-w-0 flex-1 space-y-5">
            {conditions && (
              <div>
                <h2
                  className="text-xs font-black uppercase tracking-[0.15em]"
                  style={{
                    color: design.design_couleur_principale,
                  }}
                >
                  {estDevis
                    ? "Conditions générales du devis"
                    : "Conditions générales de facture"}
                </h2>
                <p className="mt-2 whitespace-pre-line text-xs leading-5 text-slate-600">
                  {conditions}
                </p>
              </div>
            )}

            {design.design_afficher_assurance &&
              parametres.assurance_professionnelle && (
                <div>
                  <h2
                    className="text-xs font-black uppercase tracking-[0.15em]"
                    style={{
                      color: design.design_couleur_principale,
                    }}
                  >
                    Assurance professionnelle
                  </h2>
                  <p className="mt-2 whitespace-pre-line text-xs leading-5 text-slate-600">
                    {parametres.assurance_professionnelle}
                  </p>
                </div>
              )}

            {parametres.mentions_legales && (
              <div>
                <h2
                  className="text-xs font-black uppercase tracking-[0.15em]"
                  style={{
                    color: design.design_couleur_principale,
                  }}
                >
                  Mentions légales
                </h2>
                <p className="mt-2 whitespace-pre-line text-xs leading-5 text-slate-600">
                  {parametres.mentions_legales}
                </p>
              </div>
            )}

            {estDevis && (
              <div className="border border-slate-200 p-4">
                <p className="text-xs font-bold text-slate-600">
                  Bon pour accord — Date, nom et signature du
                  client
                </p>
                <div className="mt-8 border-b border-slate-300" />
              </div>
            )}
          </div>

          <div className="w-full lg:w-80">
            <div
              className={`border p-5 ${
                classique ? "rounded-sm" : "rounded-2xl"
              }`}
              style={{
                borderColor: design.design_couleur_principale,
                backgroundColor: design.design_couleur_secondaire,
              }}
            >
              <div className="flex justify-between gap-4 text-sm">
                <span className="text-slate-500">Total HT</span>
                <span className="font-bold">
                  {formatMontant(document.total_ht)}
                </span>
              </div>

              <div className="mt-2 flex justify-between gap-4 text-sm">
                <span className="text-slate-500">TVA</span>
                <span className="font-bold">
                  {formatMontant(document.total_tva)}
                </span>
              </div>

              <div
                className="mt-4 flex justify-between gap-4 border-t pt-4 text-lg font-black"
                style={{
                  borderColor: design.design_couleur_principale,
                  color: design.design_couleur_principale,
                }}
              >
                <span>
                  {estAvoir ? "Total avoir TTC" : "Total TTC"}
                </span>
                <span>{formatMontant(document.total_ttc)}</span>
              </div>

              {!estDevis && !estAvoir && (
                <div className="mt-4 border-t border-slate-200 pt-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">
                      Montant payé
                    </span>
                    <span className="font-bold">
                      {formatMontant(document.montant_paye)}
                    </span>
                  </div>

                  <div className="mt-2 flex justify-between">
                    <span className="text-slate-500">
                      Reste à payer
                    </span>
                    <span className="font-black text-red-700">
                      {formatMontant(document.reste_a_payer)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        <footer className="mt-10 border-t border-slate-200 pt-5 text-center text-xs text-slate-500">
          {design.design_pied_page ||
            `Document généré par Arboboard — ${entrepriseFusionnee.nom_entreprise}`}
        </footer>
      </section>
    </main>
  );
}