import React from "react";
import { chargerParametresEntrepriseDocument } from "@/lib/documents/chargerParametresEntreprise";

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
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

function texte(valeur: unknown, defaut = "-") {
  const resultat = String(valeur ?? "").trim();
  return resultat.length > 0 ? resultat : defaut;
}

function formatMontant(montant: unknown) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(Number(montant || 0));
}

function formatNombre(nombre: unknown) {
  return Number(nombre || 0).toLocaleString("fr-FR", {
    maximumFractionDigits: 2,
  });
}

function formatDate(date: unknown) {
  const valeur = String(date || "").trim();

  if (!valeur) return "-";

  try {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(`${valeur.slice(0, 10)}T00:00:00`));
  } catch {
    return "-";
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

function adresseChantierDocument(document: any) {
  return adresseComplete(
    document?.adresse_chantier,
    document?.code_postal_chantier,
    document?.ville_chantier
  );
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
  if (statut === "facture") return "Facturé";
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

function couleurDocument(typeDocument: TypeDocumentPdf) {
  if (typeDocument === "devis") return "#047857";
  if (typeDocument === "avoir") return "#7e22ce";
  return "#1d4ed8";
}

function fondDocument(typeDocument: TypeDocumentPdf) {
  if (typeDocument === "devis") return "#ecfdf5";
  if (typeDocument === "avoir") return "#faf5ff";
  return "#eff6ff";
}

function bordureDocument(typeDocument: TypeDocumentPdf) {
  if (typeDocument === "devis") return "#a7f3d0";
  if (typeDocument === "avoir") return "#e9d5ff";
  return "#bfdbfe";
}

function logoValide(logoUrl: unknown) {
  const url = String(logoUrl || "").trim();

  if (!url) return null;

  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return null;
  }

  return url;
}

function nomFichierPdf(typeDocument: TypeDocumentPdf, document: any) {
  const numero = texte(document?.numero, `${typeDocument}-${Date.now()}`);

  const nomNettoye = numero
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, "-")
    .trim();

  return `${nomNettoye}.pdf`;
}

async function renduPdfEnBuffer(element: React.ReactElement<any>) {
  const resultat = await pdf(element as any).toBuffer();

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
    paddingTop: 28,
    paddingRight: 32,
    paddingBottom: 34,
    paddingLeft: 32,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#0f172a",
    backgroundColor: "#ffffff",
  },

  topBar: {
    height: 6,
    marginBottom: 18,
    borderRadius: 999,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    borderBottomStyle: "solid",
  },

  entrepriseCol: {
    width: "58%",
    paddingRight: 18,
  },

  documentCol: {
    width: "38%",
  },

  entrepriseHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },

  logoEntreprise: {
    width: 54,
    height: 54,
    objectFit: "contain",
    marginRight: 10,
  },

  entrepriseTexteWrap: {
    flex: 1,
  },

  entrepriseNom: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 5,
  },

  entrepriseInfos: {
    fontSize: 8.5,
    lineHeight: 1.45,
    color: "#475569",
  },

  documentCard: {
    padding: 14,
    borderWidth: 1,
    borderStyle: "solid",
    borderRadius: 12,
  },

  documentLabel: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#64748b",
    marginBottom: 4,
  },

  documentTitle: {
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 6,
  },

  documentNumero: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 10,
  },

  miniRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },

  miniLabel: {
    fontSize: 8,
    color: "#64748b",
  },

  miniValue: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#0f172a",
    textAlign: "right",
  },

  sectionInfos: {
    flexDirection: "row",
    paddingTop: 18,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    borderBottomStyle: "solid",
  },

  blocClient: {
    width: "50%",
    paddingRight: 16,
  },

  blocObjet: {
    width: "50%",
    paddingLeft: 16,
    borderLeftWidth: 1,
    borderLeftColor: "#e2e8f0",
    borderLeftStyle: "solid",
  },

  labelSection: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#94a3b8",
    marginBottom: 7,
  },

  titreBloc: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 6,
  },

  texteNormal: {
    fontSize: 9,
    lineHeight: 1.45,
    color: "#334155",
  },

  textePetit: {
    fontSize: 8,
    lineHeight: 1.4,
    color: "#64748b",
  },

  objetTexte: {
    fontSize: 9,
    lineHeight: 1.5,
    color: "#334155",
  },

  chantierBox: {
    marginTop: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#a7f3d0",
    borderStyle: "solid",
    borderRadius: 12,
    backgroundColor: "#ecfdf5",
  },

  chantierTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#047857",
    marginBottom: 7,
  },

  chantierRow: {
    flexDirection: "row",
  },

  chantierColLeft: {
    width: "50%",
    paddingRight: 12,
  },

  chantierColRight: {
    width: "50%",
    paddingLeft: 12,
    borderLeftWidth: 1,
    borderLeftColor: "#a7f3d0",
    borderLeftStyle: "solid",
  },

  chantierLabel: {
    fontSize: 7.5,
    fontWeight: "bold",
    color: "#059669",
    marginBottom: 4,
  },

  chantierTexte: {
    fontSize: 8.5,
    lineHeight: 1.45,
    color: "#064e3b",
  },

  avoirBox: {
    marginTop: 16,
    padding: 12,
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
    marginBottom: 5,
  },

  avoirTexte: {
    fontSize: 9,
    lineHeight: 1.45,
    color: "#581c87",
  },

  tableWrap: {
    marginTop: 18,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderStyle: "solid",
    borderRadius: 8,
  },

  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
    borderBottomStyle: "solid",
  },

  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    borderBottomStyle: "solid",
    minHeight: 34,
  },

  thDesignation: {
    width: "36%",
    padding: 7,
    fontSize: 7.5,
    fontWeight: "bold",
    color: "#334155",
  },

  thQty: {
    width: "9%",
    padding: 7,
    fontSize: 7.5,
    fontWeight: "bold",
    color: "#334155",
    textAlign: "right",
  },

  thUnite: {
    width: "9%",
    padding: 7,
    fontSize: 7.5,
    fontWeight: "bold",
    color: "#334155",
    textAlign: "right",
  },

  thPu: {
    width: "14%",
    padding: 7,
    fontSize: 7.5,
    fontWeight: "bold",
    color: "#334155",
    textAlign: "right",
  },

  thTva: {
    width: "10%",
    padding: 7,
    fontSize: 7.5,
    fontWeight: "bold",
    color: "#334155",
    textAlign: "right",
  },

  thTotal: {
    width: "22%",
    padding: 7,
    fontSize: 7.5,
    fontWeight: "bold",
    color: "#334155",
    textAlign: "right",
  },

  tdDesignation: {
    width: "36%",
    padding: 7,
  },

  tdQty: {
    width: "9%",
    padding: 7,
    fontSize: 8.5,
    color: "#334155",
    textAlign: "right",
  },

  tdUnite: {
    width: "9%",
    padding: 7,
    fontSize: 8.5,
    color: "#334155",
    textAlign: "right",
  },

  tdPu: {
    width: "14%",
    padding: 7,
    fontSize: 8.5,
    color: "#334155",
    textAlign: "right",
  },

  tdTva: {
    width: "10%",
    padding: 7,
    fontSize: 8.5,
    color: "#334155",
    textAlign: "right",
  },

  tdTotal: {
    width: "22%",
    padding: 7,
    fontSize: 8.5,
    fontWeight: "bold",
    color: "#0f172a",
    textAlign: "right",
  },

  ligneDesignation: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 3,
  },

  ligneDescription: {
    fontSize: 7.5,
    lineHeight: 1.35,
    color: "#64748b",
  },

  bottomArea: {
    flexDirection: "row",
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    borderTopStyle: "solid",
  },

  leftBottom: {
    width: "58%",
    paddingRight: 18,
  },

  rightBottom: {
    width: "42%",
  },

  totalCard: {
    padding: 13,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderStyle: "solid",
    borderRadius: 12,
    backgroundColor: "#f8fafc",
  },

  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 7,
  },

  totalLabel: {
    fontSize: 9,
    color: "#64748b",
  },

  totalValue: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#0f172a",
    textAlign: "right",
  },

  totalFinal: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 9,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: "#cbd5e1",
    borderTopStyle: "solid",
  },

  totalFinalLabel: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#0f172a",
  },

  totalFinalValue: {
    fontSize: 12,
    fontWeight: "bold",
    textAlign: "right",
  },

  paiementBox: {
    marginTop: 10,
    paddingTop: 9,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    borderTopStyle: "solid",
  },

  resteValue: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#dc2626",
    textAlign: "right",
  },

  conditionsBox: {
    marginBottom: 12,
  },

  conditionsTitle: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#94a3b8",
    marginBottom: 5,
  },

  conditionsText: {
    fontSize: 8,
    lineHeight: 1.4,
    color: "#475569",
  },

  signatureArea: {
    marginTop: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderStyle: "solid",
    borderRadius: 10,
    backgroundColor: "#f8fafc",
  },

  signatureTitle: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#475569",
    marginBottom: 6,
  },

  signatureLine: {
    height: 34,
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
    borderBottomStyle: "solid",
  },

  footer: {
    position: "absolute",
    left: 32,
    right: 32,
    bottom: 18,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    borderTopStyle: "solid",
    fontSize: 7,
    color: "#94a3b8",
    textAlign: "center",
  },
});

function BlocEntreprise({ entreprise }: { entreprise: any }) {
  const adresseEntreprise = adresseComplete(
    entreprise?.adresse,
    entreprise?.code_postal,
    entreprise?.ville
  );

  const logoUrl = logoValide(entreprise?.logo_url);

  return (
    <View style={styles.entrepriseCol}>
      <View style={styles.entrepriseHeader}>
        {logoUrl ? (
          <Image src={logoUrl} style={styles.logoEntreprise} />
        ) : null}

        <View style={styles.entrepriseTexteWrap}>
          <Text style={styles.entrepriseNom}>
            {texte(entreprise?.nom_entreprise, "Entreprise")}
          </Text>

          {entreprise?.forme_juridique ? (
            <Text style={styles.entrepriseInfos}>
              {entreprise.forme_juridique}
            </Text>
          ) : null}

          {adresseEntreprise ? (
            <Text style={[styles.entrepriseInfos, { marginTop: 7 }]}>
              {adresseEntreprise}
            </Text>
          ) : null}

          <View style={{ marginTop: 8 }}>
            {entreprise?.telephone ? (
              <Text style={styles.entrepriseInfos}>
                Téléphone : {entreprise.telephone}
              </Text>
            ) : null}

            {entreprise?.email || entreprise?.email_contact ? (
              <Text style={styles.entrepriseInfos}>
                Email : {entreprise.email || entreprise.email_contact}
              </Text>
            ) : null}

            {entreprise?.siret ? (
              <Text style={styles.entrepriseInfos}>
                SIRET : {entreprise.siret}
              </Text>
            ) : null}

            {entreprise?.numero_tva_intracommunautaire ||
            entreprise?.numero_tva ? (
              <Text style={styles.entrepriseInfos}>
                TVA intracommunautaire :{" "}
                {entreprise.numero_tva_intracommunautaire ||
                  entreprise.numero_tva}
              </Text>
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );
}

function BlocDocument({
  typeDocument,
  document,
}: {
  typeDocument: TypeDocumentPdf;
  document: any;
}) {
  const estDevis = typeDocument === "devis";
  const estAvoir = typeDocument === "avoir";
  const couleur = couleurDocument(typeDocument);

  const dateDocument = estDevis
    ? document?.date_devis
    : document?.date_facture;

  return (
    <View
      style={[
        styles.documentCard,
        {
          backgroundColor: fondDocument(typeDocument),
          borderColor: bordureDocument(typeDocument),
        },
      ]}
    >
      <Text style={styles.documentLabel}>DOCUMENT</Text>

      <Text style={[styles.documentTitle, { color: couleur }]}>
        {titreDocument(typeDocument)}
      </Text>

      <Text style={styles.documentNumero}>
        N° {texte(document?.numero, "Sans numéro")}
      </Text>

      <View style={styles.miniRow}>
        <Text style={styles.miniLabel}>Type</Text>
        <Text style={styles.miniValue}>
          {estDevis
            ? "Devis"
            : estAvoir
            ? "Avoir"
            : libelleTypeFacture(document?.type_facture)}
        </Text>
      </View>

      <View style={styles.miniRow}>
        <Text style={styles.miniLabel}>Date</Text>
        <Text style={styles.miniValue}>{formatDate(dateDocument)}</Text>
      </View>

      {estDevis ? (
        <View style={styles.miniRow}>
          <Text style={styles.miniLabel}>Validité</Text>
          <Text style={styles.miniValue}>
            {formatDate(document?.date_validite)}
          </Text>
        </View>
      ) : !estAvoir ? (
        <View style={styles.miniRow}>
          <Text style={styles.miniLabel}>Échéance</Text>
          <Text style={styles.miniValue}>
            {formatDate(document?.date_echeance)}
          </Text>
        </View>
      ) : null}

      <View style={styles.miniRow}>
        <Text style={styles.miniLabel}>Statut</Text>
        <Text style={styles.miniValue}>{libelleStatut(document?.statut)}</Text>
      </View>
    </View>
  );
}

function BlocClientEtObjet({
  typeDocument,
  document,
  client,
}: {
  typeDocument: TypeDocumentPdf;
  document: any;
  client: any;
}) {
  const adresseClient = adresseComplete(
    client?.adresse,
    client?.code_postal,
    client?.ville
  );

  return (
    <View style={styles.sectionInfos}>
      <View style={styles.blocClient}>
        <Text style={styles.labelSection}>CLIENT</Text>

        <Text style={styles.titreBloc}>{nomClient(client, document)}</Text>

        {adresseClient ? (
          <Text style={styles.texteNormal}>{adresseClient}</Text>
        ) : null}

        {client?.email ? (
          <Text style={[styles.textePetit, { marginTop: 7 }]}>
            Email : {client.email}
          </Text>
        ) : null}

        {client?.telephone ? (
          <Text style={styles.textePetit}>Téléphone : {client.telephone}</Text>
        ) : null}
      </View>

      <View style={styles.blocObjet}>
        <Text style={styles.labelSection}>
          OBJET DU {titreDocument(typeDocument)}
        </Text>

        <Text style={styles.titreBloc}>
          {texte(document?.objet, "Sans objet")}
        </Text>

        {document?.description ? (
          <Text style={styles.objetTexte}>{document.description}</Text>
        ) : (
          <Text style={styles.textePetit}>Aucune description renseignée.</Text>
        )}
      </View>
    </View>
  );
}

function BlocChantier({ document }: { document: any }) {
  const adresseChantier = adresseChantierDocument(document);
  const notesChantier = String(document?.notes_chantier || "").trim();

  if (!adresseChantier && !notesChantier) {
    return null;
  }

  return (
    <View style={styles.chantierBox}>
      <Text style={styles.chantierTitle}>Lieu d’intervention / chantier</Text>

      <View style={styles.chantierRow}>
        <View style={styles.chantierColLeft}>
          <Text style={styles.chantierLabel}>ADRESSE CHANTIER</Text>

          <Text style={styles.chantierTexte}>
            {adresseChantier || "Adresse chantier non renseignée."}
          </Text>
        </View>

        <View style={styles.chantierColRight}>
          <Text style={styles.chantierLabel}>NOTES CHANTIER</Text>

          <Text style={styles.chantierTexte}>
            {notesChantier || "Aucune note chantier."}
          </Text>
        </View>
      </View>
    </View>
  );
}

function BlocAvoir({
  document,
  factureOrigine,
}: {
  document: any;
  factureOrigine?: any | null;
}) {
  return (
    <View style={styles.avoirBox}>
      <Text style={styles.avoirTitre}>Informations liées à l’avoir</Text>

      {factureOrigine ? (
        <Text style={styles.avoirTexte}>
          Cet avoir est établi en référence à la facture{" "}
          {texte(factureOrigine.numero, "sans numéro")} du{" "}
          {formatDate(factureOrigine.date_facture)}.
        </Text>
      ) : (
        <Text style={styles.avoirTexte}>
          Cet avoir est établi en référence à une facture précédemment émise.
        </Text>
      )}

      {document?.motif_avoir ? (
        <Text style={[styles.avoirTexte, { marginTop: 5 }]}>
          Motif : {document.motif_avoir}
        </Text>
      ) : null}
    </View>
  );
}

function TableauLignes({ lignes = [] }: { lignes?: any[] }) {
  return (
    <View style={styles.tableWrap}>
      <View style={styles.tableHeader}>
        <Text style={styles.thDesignation}>Désignation</Text>
        <Text style={styles.thQty}>Qté</Text>
        <Text style={styles.thUnite}>Unité</Text>
        <Text style={styles.thPu}>PU HT</Text>
        <Text style={styles.thTva}>TVA</Text>
        <Text style={styles.thTotal}>Total HT</Text>
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
                <Text style={styles.ligneDescription}>{ligne.description}</Text>
              ) : null}
            </View>

            <Text style={styles.tdQty}>{formatNombre(ligne.quantite)}</Text>
            <Text style={styles.tdUnite}>{texte(ligne.unite, "u")}</Text>
            <Text style={styles.tdPu}>
              {formatMontant(ligne.prix_unitaire_ht)}
            </Text>
            <Text style={styles.tdTva}>{formatNombre(ligne.tva)} %</Text>
            <Text style={styles.tdTotal}>{formatMontant(ligne.total_ht)}</Text>
          </View>
        ))
      )}
    </View>
  );
}

function BlocTotaux({
  typeDocument,
  document,
}: {
  typeDocument: TypeDocumentPdf;
  document: any;
}) {
  const estDevis = typeDocument === "devis";
  const estAvoir = typeDocument === "avoir";
  const couleur = couleurDocument(typeDocument);

  return (
    <View style={styles.totalCard}>
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total HT</Text>
        <Text style={styles.totalValue}>{formatMontant(document?.total_ht)}</Text>
      </View>

      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total TVA</Text>
        <Text style={styles.totalValue}>
          {formatMontant(document?.total_tva)}
        </Text>
      </View>

      <View style={styles.totalFinal}>
        <Text style={styles.totalFinalLabel}>
          {estAvoir ? "Total avoir TTC" : "Total TTC"}
        </Text>
        <Text style={[styles.totalFinalValue, { color: couleur }]}>
          {formatMontant(document?.total_ttc)}
        </Text>
      </View>

      {!estDevis && !estAvoir ? (
        <View style={styles.paiementBox}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Montant payé</Text>
            <Text style={styles.totalValue}>
              {formatMontant(document?.montant_paye)}
            </Text>
          </View>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Reste à payer</Text>
            <Text style={styles.resteValue}>
              {formatMontant(document?.reste_a_payer)}
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function BlocConditions({
  typeDocument,
  document,
  entreprise,
}: {
  typeDocument: TypeDocumentPdf;
  document: any;
  entreprise: any;
}) {
  const estDevis = typeDocument === "devis";

  const conditionsParametres = estDevis
    ? entreprise?.conditions_generales_devis
    : entreprise?.conditions_generales_factures;

  const conditionsFinales =
    document?.conditions || conditionsParametres || null;

  const assuranceProfessionnelle =
    entreprise?.assurance_professionnelle ||
    entreprise?.assurance_nom ||
    null;

  const mentionsLegales =
    entreprise?.mentions_legales ||
    entreprise?.mentions_legales_documents ||
    null;

  return (
    <View>
      {conditionsFinales ? (
        <View style={styles.conditionsBox}>
          <Text style={styles.conditionsTitle}>
            {estDevis
              ? "CONDITIONS GÉNÉRALES DU DEVIS"
              : "CONDITIONS GÉNÉRALES DE FACTURE"}
          </Text>
          <Text style={styles.conditionsText}>{conditionsFinales}</Text>
        </View>
      ) : null}

      {assuranceProfessionnelle ? (
        <View style={styles.conditionsBox}>
          <Text style={styles.conditionsTitle}>ASSURANCE PROFESSIONNELLE</Text>

          <Text style={styles.conditionsText}>
            {assuranceProfessionnelle}
            {entreprise?.assurance_numero_contrat
              ? ` - Contrat n° ${entreprise.assurance_numero_contrat}`
              : ""}
            {entreprise?.assurance_zone_couverture
              ? ` - Zone : ${entreprise.assurance_zone_couverture}`
              : ""}
          </Text>
        </View>
      ) : null}

      {mentionsLegales ? (
        <View style={styles.conditionsBox}>
          <Text style={styles.conditionsTitle}>MENTIONS LÉGALES</Text>
          <Text style={styles.conditionsText}>{mentionsLegales}</Text>
        </View>
      ) : null}

      {estDevis ? (
        <View style={styles.signatureArea}>
          <Text style={styles.signatureTitle}>
            Bon pour accord - Date, nom et signature du client
          </Text>
          <View style={styles.signatureLine} />
        </View>
      ) : null}
    </View>
  );
}

function DocumentPdf({
  typeDocument,
  entreprise,
  document,
  client,
  lignes = [],
  factureOrigine,
}: GenererPdfParams) {
  const estAvoir = typeDocument === "avoir";
  const couleur = couleurDocument(typeDocument);

  return (
    <Document
      title={`${titreDocument(typeDocument)} ${texte(document?.numero, "")}`}
      author={texte(entreprise?.nom_entreprise, "Arboboard")}
      subject={texte(document?.objet, libelleDocument(typeDocument))}
      creator="Arboboard"
      producer="Arboboard"
    >
      <Page size="A4" style={styles.page}>
        <View style={[styles.topBar, { backgroundColor: couleur }]} />

        <View style={styles.header}>
          <BlocEntreprise entreprise={entreprise} />

          <View style={styles.documentCol}>
            <BlocDocument typeDocument={typeDocument} document={document} />
          </View>
        </View>

        <BlocClientEtObjet
          typeDocument={typeDocument}
          document={document}
          client={client}
        />

        <BlocChantier document={document} />

        {estAvoir ? (
          <BlocAvoir document={document} factureOrigine={factureOrigine} />
        ) : null}

        <TableauLignes lignes={lignes} />

        <View style={styles.bottomArea}>
          <View style={styles.leftBottom}>
            <BlocConditions
              typeDocument={typeDocument}
              document={document}
              entreprise={entreprise}
            />
          </View>

          <View style={styles.rightBottom}>
            <BlocTotaux typeDocument={typeDocument} document={document} />
          </View>
        </View>

        <Text style={styles.footer}>
          Document généré par Arboboard -{" "}
          {texte(entreprise?.nom_entreprise, "Entreprise")}
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
  const entrepriseId =
    document?.entreprise_id || entreprise?.id || entreprise?.entreprise_id;

  const parametresEntreprise = entrepriseId
    ? await chargerParametresEntrepriseDocument(entrepriseId)
    : null;

  const entreprisePourPdf = {
    ...entreprise,
    ...parametresEntreprise,
    nom_entreprise:
      parametresEntreprise?.nom_entreprise ||
      entreprise?.nom_entreprise ||
      entreprise?.nom ||
      entreprise?.raison_sociale ||
      "Entreprise",
  };

  const element = (
    <DocumentPdf
      typeDocument={typeDocument}
      entreprise={entreprisePourPdf}
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