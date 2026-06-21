import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
} from "@react-pdf/renderer";

export type TypeDocumentPdf = "devis" | "facture" | "avoir";

type GenererPdfParams = {
  typeDocument: TypeDocumentPdf;
  entreprise: any;
  document: any;
  client?: any | null;
  lignes?: any[];
  factureOrigine?: any | null;
};

type PieceJointePdf = {
  filename: string;
  content: string;
  buffer: Buffer;
};

function texte(valeur: unknown, defaut = "—") {
  const resultat = String(valeur ?? "").trim();
  return resultat.length > 0 ? resultat : defaut;
}

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

function nomClient(client: any, document: any) {
  if (document?.client_nom) return String(document.client_nom);

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

function titreDocument(typeDocument: TypeDocumentPdf) {
  if (typeDocument === "devis") return "DEVIS";
  if (typeDocument === "avoir") return "AVOIR";
  return "FACTURE";
}

function libelleDocument(typeDocument: TypeDocumentPdf) {
  if (typeDocument === "devis") return "devis";
  if (typeDocument === "avoir") return "avoir";
  return "facture";
}

function libelleStatut(statut: string | null | undefined) {
  if (statut === "envoye") return "Envoyé";
  if (statut === "envoyee") return "Envoyée";
  if (statut === "accepte") return "Accepté";
  if (statut === "refuse") return "Refusé";
  if (statut === "payee") return "Payée";
  if (statut === "en_retard") return "En retard";
  if (statut === "annulee") return "Annulée";
  if (statut === "archive") return "Archivée";
  return "Brouillon";
}

function libelleTypeFacture(type: string | null | undefined) {
  if (type === "acompte") return "Facture d’acompte";
  if (type === "solde") return "Facture de solde";
  if (type === "avoir") return "Avoir";
  return "Facture";
}

function nomFichierPdf(typeDocument: TypeDocumentPdf, document: any) {
  const numero = texte(document?.numero, `${typeDocument}-${Date.now()}`);

  const nomNettoye = numero
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, "-")
    .trim();

  return `${nomNettoye}.pdf`;
}

async function renduPdfEnBuffer(element: React.ReactElement) {
  const resultat = await pdf(element).toBuffer();

  if (Buffer.isBuffer(resultat)) {
    return resultat;
  }

  return await new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    const stream = resultat as any;

    stream.on("data", (chunk: Buffer | Uint8Array | string) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });

    stream.on("end", () => {
      resolve(Buffer.concat(chunks));
    });

    stream.on("error", (error: unknown) => {
      reject(error);
    });
  });
}

const styles = StyleSheet.create({
  page: {
    padding: 34,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#0f172a",
    backgroundColor: "#ffffff",
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 24,
    paddingBottom: 22,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    borderBottomStyle: "solid",
  },

  entrepriseBloc: {
    flexGrow: 1,
    paddingRight: 20,
  },

  entrepriseNom: {
    fontSize: 19,
    fontWeight: "bold",
    marginBottom: 5,
  },

  textePetit: {
    fontSize: 9,
    lineHeight: 1.45,
    color: "#334155",
  },

  texteNormal: {
    fontSize: 10,
    lineHeight: 1.5,
    color: "#334155",
  },

  documentBox: {
    width: 180,
    padding: 15,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderStyle: "solid",
    borderRadius: 12,
    backgroundColor: "#f8fafc",
  },

  titreDoc: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
  },

  numeroDoc: {
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 13,
  },

  sectionDeuxColonnes: {
    flexDirection: "row",
    gap: 28,
    paddingVertical: 22,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    borderBottomStyle: "solid",
  },

  colonne: {
    flex: 1,
  },

  label: {
    fontSize: 8,
    fontWeight: "bold",
    textTransform: "uppercase",
    color: "#94a3b8",
    marginBottom: 8,
  },

  titreBloc: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 8,
  },

  description: {
    fontSize: 10,
    lineHeight: 1.55,
    color: "#334155",
  },

  avoirBox: {
    marginTop: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e9d5ff",
    borderStyle: "solid",
    borderRadius: 12,
    backgroundColor: "#faf5ff",
  },

  avoirTitre: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#6b21a8",
    marginBottom: 7,
  },

  avoirTexte: {
    fontSize: 10,
    lineHeight: 1.45,
    color: "#581c87",
  },

  table: {
    marginTop: 22,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderStyle: "solid",
  },

  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f8fafc",
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
    borderBottomStyle: "solid",
  },

  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    borderBottomStyle: "solid",
  },

  thDesignation: {
    width: "38%",
    padding: 8,
    fontSize: 8,
    fontWeight: "bold",
    color: "#475569",
    textTransform: "uppercase",
  },

  thSmall: {
    width: "12%",
    padding: 8,
    fontSize: 8,
    fontWeight: "bold",
    color: "#475569",
    textTransform: "uppercase",
    textAlign: "right",
  },

  thMontant: {
    width: "14%",
    padding: 8,
    fontSize: 8,
    fontWeight: "bold",
    color: "#475569",
    textTransform: "uppercase",
    textAlign: "right",
  },

  tdDesignation: {
    width: "38%",
    padding: 8,
  },

  tdSmall: {
    width: "12%",
    padding: 8,
    textAlign: "right",
  },

  tdMontant: {
    width: "14%",
    padding: 8,
    textAlign: "right",
    fontWeight: "bold",
  },

  ligneDesignation: {
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 3,
  },

  ligneDescription: {
    fontSize: 8,
    lineHeight: 1.35,
    color: "#475569",
  },

  basPage: {
    flexDirection: "row",
    gap: 28,
    marginTop: 22,
    paddingTop: 22,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    borderTopStyle: "solid",
  },

  blocConditions: {
    flex: 1,
  },

  blocTotaux: {
    width: 210,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderStyle: "solid",
    borderRadius: 12,
    backgroundColor: "#f8fafc",
  },

  totalLigne: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },

  totalLabel: {
    color: "#64748b",
  },

  totalValeur: {
    fontWeight: "bold",
  },

  totalFinal: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 9,
    marginTop: 3,
    borderTopWidth: 1,
    borderTopColor: "#cbd5e1",
    borderTopStyle: "solid",
  },

  totalFinalLabel: {
    fontSize: 13,
    fontWeight: "bold",
  },

  totalFinalValeur: {
    fontSize: 13,
    fontWeight: "bold",
  },

  reste: {
    color: "#dc2626",
    fontWeight: "bold",
  },

  footer: {
    marginTop: 28,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    borderTopStyle: "solid",
    textAlign: "center",
    fontSize: 8,
    color: "#64748b",
  },
});

function DocumentPdf({
  typeDocument,
  entreprise,
  document,
  client,
  lignes = [],
  factureOrigine,
}: GenererPdfParams) {
  const estDevis = typeDocument === "devis";
  const estAvoir = typeDocument === "avoir";

  const adresseEntreprise = adresseComplete(
    entreprise?.adresse,
    entreprise?.code_postal,
    entreprise?.ville
  );

  const adresseClient = adresseComplete(
    client?.adresse,
    client?.code_postal,
    client?.ville
  );

  const dateDocument = estDevis
    ? document?.date_devis
    : document?.date_facture;

  const totalColor = estAvoir ? "#7e22ce" : "#0f172a";

  return (
    <Document
      title={`${titreDocument(typeDocument)} ${texte(document?.numero, "")}`}
      author={texte(entreprise?.nom_entreprise, "Arboboard")}
      subject={texte(document?.objet, libelleDocument(typeDocument))}
      creator="Arboboard"
      producer="Arboboard"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.entrepriseBloc}>
            <Text style={styles.entrepriseNom}>
              {texte(entreprise?.nom_entreprise, "Entreprise")}
            </Text>

            {entreprise?.forme_juridique ? (
              <Text style={styles.textePetit}>{entreprise.forme_juridique}</Text>
            ) : null}

            {adresseEntreprise ? (
              <Text style={[styles.textePetit, { marginTop: 9 }]}>
                {adresseEntreprise}
              </Text>
            ) : null}

            <View style={{ marginTop: 9 }}>
              {entreprise?.telephone ? (
                <Text style={styles.textePetit}>Tél. : {entreprise.telephone}</Text>
              ) : null}

              {entreprise?.email_contact ? (
                <Text style={styles.textePetit}>
                  Email : {entreprise.email_contact}
                </Text>
              ) : null}

              {entreprise?.siret ? (
                <Text style={styles.textePetit}>SIRET : {entreprise.siret}</Text>
              ) : null}

              {entreprise?.numero_tva ? (
                <Text style={styles.textePetit}>
                  TVA intracommunautaire : {entreprise.numero_tva}
                </Text>
              ) : null}
            </View>
          </View>

          <View style={styles.documentBox}>
            <Text style={[styles.titreDoc, { color: totalColor }]}>
              {titreDocument(typeDocument)}
            </Text>

            <Text style={styles.numeroDoc}>
              {texte(document?.numero, "Sans numéro")}
            </Text>

            <Text style={styles.textePetit}>
              Type :{" "}
              {estDevis
                ? "Devis"
                : estAvoir
                ? "Avoir"
                : libelleTypeFacture(document?.type_facture)}
            </Text>

            <Text style={styles.textePetit}>
              Date : {formatDate(dateDocument)}
            </Text>

            {estDevis ? (
              <Text style={styles.textePetit}>
                Validité : {formatDate(document?.date_validite)}
              </Text>
            ) : !estAvoir ? (
              <Text style={styles.textePetit}>
                Échéance : {formatDate(document?.date_echeance)}
              </Text>
            ) : null}

            <Text style={styles.textePetit}>
              Statut : {libelleStatut(document?.statut)}
            </Text>
          </View>
        </View>

        <View style={styles.sectionDeuxColonnes}>
          <View style={styles.colonne}>
            <Text style={styles.label}>Client</Text>

            <Text style={styles.titreBloc}>{nomClient(client, document)}</Text>

            {adresseClient ? (
              <Text style={styles.texteNormal}>{adresseClient}</Text>
            ) : null}

            {client?.email ? (
              <Text style={[styles.textePetit, { marginTop: 8 }]}>
                Email : {client.email}
              </Text>
            ) : null}

            {client?.telephone ? (
              <Text style={styles.textePetit}>Tél. : {client.telephone}</Text>
            ) : null}
          </View>

          <View style={styles.colonne}>
            <Text style={styles.label}>Objet</Text>

            <Text style={styles.titreBloc}>
              {texte(document?.objet, "Sans objet")}
            </Text>

            {document?.description ? (
              <Text style={styles.description}>{document.description}</Text>
            ) : null}
          </View>
        </View>

        {estAvoir ? (
          <View style={styles.avoirBox}>
            <Text style={styles.avoirTitre}>Informations avoir</Text>

            {factureOrigine ? (
              <Text style={styles.avoirTexte}>
                Cet avoir est établi en référence à la facture{" "}
                {texte(factureOrigine.numero, "sans numéro")} du{" "}
                {formatDate(factureOrigine.date_facture)}.
              </Text>
            ) : (
              <Text style={styles.avoirTexte}>
                Cet avoir est établi en référence à une facture précédemment
                émise.
              </Text>
            )}

            {document?.motif_avoir ? (
              <Text style={[styles.avoirTexte, { marginTop: 6 }]}>
                Motif : {document.motif_avoir}
              </Text>
            ) : null}
          </View>
        ) : null}

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.thDesignation}>Désignation</Text>
            <Text style={styles.thSmall}>Qté</Text>
            <Text style={styles.thSmall}>Unité</Text>
            <Text style={styles.thSmall}>PU HT</Text>
            <Text style={styles.thSmall}>TVA</Text>
            <Text style={styles.thMontant}>Total HT</Text>
          </View>

          {lignes.length === 0 ? (
            <View style={styles.tableRow}>
              <Text style={[styles.tdDesignation, { width: "100%" }]}>
                Aucune ligne renseignée.
              </Text>
            </View>
          ) : (
            lignes.map((ligne, index) => (
              <View key={ligne.id || index} style={styles.tableRow} wrap={false}>
                <View style={styles.tdDesignation}>
                  <Text style={styles.ligneDesignation}>
                    {texte(ligne.designation, "Ligne sans désignation")}
                  </Text>

                  {ligne.description ? (
                    <Text style={styles.ligneDescription}>
                      {ligne.description}
                    </Text>
                  ) : null}
                </View>

                <Text style={styles.tdSmall}>
                  {Number(ligne.quantite || 0).toLocaleString("fr-FR")}
                </Text>

                <Text style={styles.tdSmall}>{texte(ligne.unite, "u")}</Text>

                <Text style={styles.tdSmall}>
                  {formatMontant(ligne.prix_unitaire_ht)}
                </Text>

                <Text style={styles.tdSmall}>
                  {Number(ligne.tva || 0).toLocaleString("fr-FR")} %
                </Text>

                <Text style={styles.tdMontant}>
                  {formatMontant(ligne.total_ht)}
                </Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.basPage}>
          <View style={styles.blocConditions}>
            {document?.conditions ? (
              <>
                <Text style={styles.label}>Conditions</Text>
                <Text style={styles.description}>{document.conditions}</Text>
              </>
            ) : null}

            {entreprise?.assurance_nom ? (
              <View style={{ marginTop: 18 }}>
                <Text style={styles.label}>Assurance professionnelle</Text>
                <Text style={styles.description}>
                  {entreprise.assurance_nom}
                  {entreprise.assurance_numero_contrat
                    ? ` — Contrat n° ${entreprise.assurance_numero_contrat}`
                    : ""}
                  {entreprise.assurance_zone_couverture
                    ? ` — Zone : ${entreprise.assurance_zone_couverture}`
                    : ""}
                </Text>
              </View>
            ) : null}

            {entreprise?.mentions_legales_documents ? (
              <View style={{ marginTop: 18 }}>
                <Text style={styles.label}>Mentions légales</Text>
                <Text style={styles.textePetit}>
                  {entreprise.mentions_legales_documents}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.blocTotaux}>
            <View style={styles.totalLigne}>
              <Text style={styles.totalLabel}>Total HT</Text>
              <Text style={styles.totalValeur}>
                {formatMontant(document?.total_ht)}
              </Text>
            </View>

            <View style={styles.totalLigne}>
              <Text style={styles.totalLabel}>Total TVA</Text>
              <Text style={styles.totalValeur}>
                {formatMontant(document?.total_tva)}
              </Text>
            </View>

            <View style={styles.totalFinal}>
              <Text style={styles.totalFinalLabel}>Total TTC</Text>
              <Text style={[styles.totalFinalValeur, { color: totalColor }]}>
                {formatMontant(document?.total_ttc)}
              </Text>
            </View>

            {!estDevis && !estAvoir ? (
              <View style={{ marginTop: 12 }}>
                <View style={styles.totalLigne}>
                  <Text style={styles.totalLabel}>Montant payé</Text>
                  <Text style={styles.totalValeur}>
                    {formatMontant(document?.montant_paye)}
                  </Text>
                </View>

                <View style={styles.totalLigne}>
                  <Text style={styles.totalLabel}>Reste à payer</Text>
                  <Text style={styles.reste}>
                    {formatMontant(document?.reste_a_payer)}
                  </Text>
                </View>
              </View>
            ) : null}
          </View>
        </View>

        <Text style={styles.footer}>
          Document généré par Arboboard.
        </Text>
      </Page>
    </Document>
  );
}

export async function genererPdfDocument({
  typeDocument,
  entreprise,
  document,
  client = null,
  lignes = [],
  factureOrigine = null,
}: GenererPdfParams): Promise<PieceJointePdf> {
  const element = (
    <DocumentPdf
      typeDocument={typeDocument}
      entreprise={entreprise}
      document={document}
      client={client}
      lignes={lignes}
      factureOrigine={factureOrigine}
    />
  );

  const buffer = await renduPdfEnBuffer(element);

  return {
    filename: nomFichierPdf(typeDocument, document),
    content: buffer.toString("base64"),
    buffer,
  };
}