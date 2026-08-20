import React from "react";
import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
  pdf,
} from "@react-pdf/renderer";
import { chargerParametresEntrepriseDocument } from "@/lib/documents/chargerParametresEntreprise";
import {
  DESIGN_DOCUMENTS_DEFAUT,
  normaliserDesignDocuments,
  tailleLogoPdf,
  type DesignDocuments,
} from "@/lib/documents/designDocuments";

export type TypeDocumentPdf = "devis" | "facture" | "avoir";

type GenererPdfParams = {
  typeDocument: TypeDocumentPdf;
  entreprise: Record<string, any>;
  document: Record<string, any>;
  client?: Record<string, any> | null;
  lignes?: Array<Record<string, any>>;
  factureOrigine?: Record<string, any> | null;
};

type PieceJointePdf = {
  filename: string;
  content: string;
  buffer: Buffer;
};

function texte(valeur: unknown, defaut = "-") {
  const resultat = String(valeur ?? "").trim();
  return resultat || defaut;
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
  client: Record<string, any> | null | undefined,
  document: Record<string, any>
) {
  if (document.client_nom) return String(document.client_nom);
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

function libelleStatut(statut: unknown) {
  const valeur = String(statut || "");

  if (valeur === "envoye") return "Envoyé";
  if (valeur === "envoyee") return "Envoyée";
  if (valeur === "accepte") return "Accepté";
  if (valeur === "facture") return "Facturé";
  if (valeur === "refuse") return "Refusé";
  if (valeur === "payee") return "Payée";
  if (valeur === "en_retard") return "En retard";
  if (valeur === "annulee") return "Annulée";
  if (valeur === "archive") return "Archivée";

  return "Brouillon";
}

function libelleTypeFacture(type: unknown) {
  if (type === "acompte") return "Facture d’acompte";
  if (type === "solde") return "Facture de solde";
  if (type === "avoir") return "Avoir";
  return "Facture";
}

function logoValide(valeur: unknown) {
  const url = String(valeur || "").trim();

  return /^https?:\/\//i.test(url) ? url : null;
}

function nomFichierPdf(
  typeDocument: TypeDocumentPdf,
  document: Record<string, any>
) {
  const numero = texte(
    document.numero,
    `${typeDocument}-${Date.now()}`
  );

  return `${numero
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, "-")
    .trim()}.pdf`;
}

async function renduPdfEnBuffer(
  element: React.ReactElement<any>
) {
  const resultat = await pdf(element).toBuffer();

  if (Buffer.isBuffer(resultat)) {
    return resultat;
  }

  return await new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    const stream = resultat as any;

    stream.on(
      "data",
      (chunk: Buffer | Uint8Array | string) => {
        chunks.push(
          Buffer.isBuffer(chunk)
            ? chunk
            : Buffer.from(chunk)
        );
      }
    );

    stream.on("end", () => {
      resolve(Buffer.concat(chunks));
    });

    stream.on("error", reject);
  });
}

function creerStyles(design: DesignDocuments) {
  const compact =
    design.design_modele_document === "compact" ||
    design.design_lignes_compactes;

  const classique =
    design.design_modele_document === "classique";

  const empilee =
    design.design_disposition_entete === "empilee";

  const tableauMinimal =
    design.design_style_tableau === "minimal";

  const tableauPlein =
    design.design_style_tableau === "lignes";

  const paddingPage = compact ? 24 : 32;
  const paddingLigne = compact ? 4.5 : 7;
  const tailleLogo = tailleLogoPdf(design.design_taille_logo);

  return StyleSheet.create({
    page: {
      paddingTop: compact ? 22 : 28,
      paddingRight: paddingPage,
      paddingBottom: 42,
      paddingLeft: paddingPage,
      fontFamily: "Helvetica",
      fontSize: compact ? 8 : 9,
      color: "#0f172a",
      backgroundColor: "#ffffff",
    },
    topBar: {
      display: classique ? "none" : "flex",
      height: compact ? 4 : 6,
      marginBottom: compact ? 12 : 18,
      borderRadius: 999,
      backgroundColor: design.design_couleur_principale,
    },
    header: {
      flexDirection: empilee ? "column" : "row",
      justifyContent: "space-between",
      paddingBottom: compact ? 12 : 18,
      borderBottomWidth: 1,
      borderBottomColor: classique
        ? design.design_couleur_principale
        : "#e2e8f0",
      borderBottomStyle: "solid",
    },
    entrepriseCol: {
      width: empilee ? "100%" : "58%",
      paddingRight: empilee ? 0 : 18,
      marginBottom: empilee ? 12 : 0,
    },
    documentCol: {
      width: empilee ? "100%" : "38%",
    },
    entrepriseHeader: {
      flexDirection:
        design.design_position_logo === "centre"
          ? "column"
          : design.design_position_logo === "droite"
            ? "row-reverse"
            : "row",
      alignItems:
        design.design_position_logo === "centre"
          ? "center"
          : "flex-start",
      textAlign:
        design.design_position_logo === "centre"
          ? "center"
          : design.design_position_logo === "droite"
            ? "right"
            : "left",
    },
    logo: {
      width: tailleLogo,
      height: tailleLogo,
      objectFit: "contain",
      marginRight:
        design.design_position_logo === "gauche" ? 10 : 0,
      marginLeft:
        design.design_position_logo === "droite" ? 10 : 0,
      marginBottom:
        design.design_position_logo === "centre" ? 8 : 0,
    },
    entrepriseTexte: {
      flexGrow: 1,
      flexShrink: 1,
    },
    entrepriseNom: {
      fontSize: compact ? 15 : 18,
      fontWeight: "bold",
      color: "#0f172a",
      marginBottom: 4,
    },
    entrepriseInfo: {
      fontSize: compact ? 7.5 : 8.5,
      lineHeight: 1.4,
      color: "#475569",
    },
    documentCard: {
      padding: compact ? 10 : 14,
      borderWidth: 1,
      borderStyle: "solid",
      borderColor: design.design_couleur_principale,
      borderRadius: classique ? 2 : 12,
      backgroundColor: design.design_couleur_secondaire,
    },
    documentLabel: {
      fontSize: 7.5,
      fontWeight: "bold",
      color: design.design_couleur_principale,
      marginBottom: 4,
    },
    documentTitle: {
      fontSize: compact ? 20 : 26,
      fontWeight: "bold",
      color: design.design_couleur_principale,
      marginBottom: 5,
    },
    documentNumero: {
      fontSize: compact ? 9 : 11,
      fontWeight: "bold",
      color: "#0f172a",
      marginBottom: compact ? 6 : 10,
    },
    miniRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 3,
    },
    miniLabel: {
      fontSize: 7.5,
      color: "#64748b",
    },
    miniValue: {
      fontSize: 7.5,
      fontWeight: "bold",
      color: "#0f172a",
      textAlign: "right",
    },
    sectionInfos: {
      flexDirection: "row",
      paddingTop: compact ? 12 : 18,
      paddingBottom: compact ? 12 : 18,
      borderBottomWidth: 1,
      borderBottomColor: "#e2e8f0",
      borderBottomStyle: "solid",
    },
    demiBloc: {
      width: "50%",
      paddingRight: 14,
    },
    demiBlocDroit: {
      width: "50%",
      paddingLeft: 14,
      borderLeftWidth: 1,
      borderLeftColor: "#e2e8f0",
      borderLeftStyle: "solid",
    },
    labelSection: {
      fontSize: 7.5,
      fontWeight: "bold",
      color: design.design_couleur_principale,
      marginBottom: 6,
    },
    titreBloc: {
      fontSize: compact ? 9.5 : 11,
      fontWeight: "bold",
      color: "#0f172a",
      marginBottom: 5,
    },
    texteNormal: {
      fontSize: compact ? 8 : 9,
      lineHeight: 1.45,
      color: "#334155",
    },
    textePetit: {
      fontSize: compact ? 7 : 8,
      lineHeight: 1.4,
      color: "#64748b",
    },
    chantier: {
      marginTop: compact ? 10 : 14,
      padding: compact ? 8 : 12,
      borderWidth: 1,
      borderColor: design.design_couleur_principale,
      borderStyle: "solid",
      borderRadius: classique ? 2 : 10,
      backgroundColor: design.design_couleur_secondaire,
    },
    chantierTitre: {
      fontSize: 8.5,
      fontWeight: "bold",
      color: design.design_couleur_principale,
      marginBottom: 5,
    },
    avoir: {
      marginTop: 12,
      padding: 10,
      borderWidth: 1,
      borderColor: design.design_couleur_principale,
      borderStyle: "solid",
      borderRadius: classique ? 2 : 10,
      backgroundColor: design.design_couleur_secondaire,
    },
    tableWrap: {
      marginTop: compact ? 12 : 18,
      borderWidth: tableauMinimal ? 0 : 1,
      borderColor: "#cbd5e1",
      borderStyle: "solid",
      borderRadius: classique || tableauMinimal ? 0 : 8,
    },
    tableHeader: {
      flexDirection: "row",
      backgroundColor: tableauPlein
        ? design.design_couleur_principale
        : tableauMinimal
          ? "#ffffff"
          : design.design_couleur_secondaire,
      borderBottomWidth: 1,
      borderBottomColor: tableauMinimal
        ? design.design_couleur_principale
        : "#cbd5e1",
      borderBottomStyle: "solid",
    },
    th: {
      padding: paddingLigne,
      fontSize: compact ? 6.7 : 7.5,
      fontWeight: "bold",
      color: tableauPlein
        ? "#ffffff"
        : design.design_couleur_principale,
    },
    row: {
      flexDirection: "row",
      borderBottomWidth: 1,
      borderBottomColor: "#e2e8f0",
      borderBottomStyle: "solid",
      minHeight: compact ? 24 : 34,
    },
    cell: {
      padding: paddingLigne,
      fontSize: compact ? 7.5 : 8.5,
      color: "#334155",
    },
    designation: {
      fontSize: compact ? 8 : 9,
      fontWeight: "bold",
      color: "#0f172a",
      marginBottom: compact ? 1 : 3,
    },
    description: {
      fontSize: compact ? 6.7 : 7.5,
      lineHeight: 1.3,
      color: "#64748b",
    },
    bottom: {
      flexDirection:
        design.design_position_totaux === "gauche"
          ? "row-reverse"
          : "row",
      marginTop: compact ? 12 : 18,
      paddingTop: compact ? 10 : 16,
      borderTopWidth: 1,
      borderTopColor: "#e2e8f0",
      borderTopStyle: "solid",
    },
    conditions: {
      width: "58%",
      paddingRight:
        design.design_position_totaux === "droite" ? 18 : 0,
      paddingLeft:
        design.design_position_totaux === "gauche" ? 18 : 0,
    },
    totaux: {
      width: "42%",
    },
    totalCard: {
      padding: compact ? 9 : 13,
      borderWidth: 1,
      borderColor: design.design_couleur_principale,
      borderStyle: "solid",
      borderRadius: classique ? 2 : 10,
      backgroundColor: design.design_couleur_secondaire,
    },
    totalRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: compact ? 4 : 7,
    },
    totalLabel: {
      fontSize: compact ? 7.5 : 9,
      color: "#64748b",
    },
    totalValue: {
      fontSize: compact ? 7.5 : 9,
      fontWeight: "bold",
      color: "#0f172a",
    },
    totalFinal: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 4,
      paddingTop: 7,
      borderTopWidth: 1,
      borderTopColor: design.design_couleur_principale,
      borderTopStyle: "solid",
    },
    totalFinalValue: {
      fontSize: compact ? 11 : 14,
      fontWeight: "bold",
      color: design.design_couleur_principale,
    },
    paiement: {
      marginTop: 7,
      paddingTop: 7,
      borderTopWidth: 1,
      borderTopColor: "#cbd5e1",
      borderTopStyle: "solid",
    },
    conditionsBox: {
      marginBottom: compact ? 7 : 12,
    },
    conditionsTitle: {
      fontSize: 7.5,
      fontWeight: "bold",
      color: design.design_couleur_principale,
      marginBottom: 4,
    },
    conditionsText: {
      fontSize: compact ? 7 : 8,
      lineHeight: 1.4,
      color: "#475569",
    },
    signature: {
      marginTop: 10,
      padding: 10,
      borderWidth: 1,
      borderColor: "#e2e8f0",
      borderStyle: "solid",
      borderRadius: classique ? 2 : 8,
    },
    signatureLigne: {
      height: compact ? 24 : 34,
      borderBottomWidth: 1,
      borderBottomColor: "#cbd5e1",
      borderBottomStyle: "solid",
    },
    footer: {
      position: "absolute",
      left: paddingPage,
      right: paddingPage,
      bottom: 16,
      paddingTop: 7,
      borderTopWidth: 1,
      borderTopColor: "#e2e8f0",
      borderTopStyle: "solid",
      fontSize: 6.8,
      color: "#94a3b8",
      textAlign: "center",
    },
  });
}

function typeLigneDocument(ligne: Record<string, any>) {
  return String(ligne?.type_ligne || "prestation") === "section"
    ? "section"
    : "prestation";
}

function pourcentage(valeur: unknown) {
  const nombre = Number(valeur || 0);
  if (!Number.isFinite(nombre)) return 0;
  return Math.min(100, Math.max(0, nombre));
}

function totalBrutLigne(ligne: Record<string, any>) {
  if (typeLigneDocument(ligne) === "section") return 0;

  const stocke = Number(ligne.total_brut_ht);
  if (Number.isFinite(stocke) && stocke !== 0) return stocke;

  return Number(ligne.quantite || 0) * Number(ligne.prix_unitaire_ht || 0);
}

function sousTotalSectionPdf(
  lignes: Array<Record<string, any>>,
  indexSection: number
) {
  let total = 0;

  for (let index = indexSection + 1; index < lignes.length; index += 1) {
    const ligne = lignes[index];
    if (typeLigneDocument(ligne) === "section") break;
    total += Number(ligne.total_ht || 0);
  }

  return Number(total.toFixed(2));
}

function resumeFinancierPdf(
  lignes: Array<Record<string, any>>,
  document: Record<string, any>
) {
  const prestations = lignes.filter(
    (ligne) => typeLigneDocument(ligne) !== "section"
  );

  const totalBrutHt = prestations.reduce(
    (total, ligne) => total + totalBrutLigne(ligne),
    0
  );

  const totalLignesHt = prestations.reduce(
    (total, ligne) => total + Number(ligne.total_ht || 0),
    0
  );

  const remiseLignes = Math.max(0, totalBrutHt - totalLignesHt);
  const remiseGlobalePourcent = pourcentage(
    document.remise_globale_pourcent
  );

  const remiseGlobaleMontantStocke = Number(
    document.remise_globale_montant || 0
  );

  const remiseGlobaleMontant =
    remiseGlobaleMontantStocke > 0
      ? remiseGlobaleMontantStocke
      : totalLignesHt * (remiseGlobalePourcent / 100);

  const coefficientGlobal =
    totalLignesHt > 0
      ? Math.max(
          0,
          (totalLignesHt - remiseGlobaleMontant) / totalLignesHt
        )
      : 1;

  const recap = new Map<
    number,
    { base_ht: number; montant_tva: number }
  >();

  for (const ligne of prestations) {
    const taux = Number(ligne.tva || 0);
    const base =
      Number(ligne.total_ht || 0) * coefficientGlobal;
    const montantTva = base * (taux / 100);
    const actuel = recap.get(taux) || {
      base_ht: 0,
      montant_tva: 0,
    };

    recap.set(taux, {
      base_ht: actuel.base_ht + base,
      montant_tva: actuel.montant_tva + montantTva,
    });
  }

  return {
    totalBrutHt: Number(totalBrutHt.toFixed(2)),
    remiseLignes: Number(remiseLignes.toFixed(2)),
    remiseGlobalePourcent,
    remiseGlobaleMontant: Number(remiseGlobaleMontant.toFixed(2)),
    recapTva: Array.from(recap.entries())
      .map(([taux, valeur]) => ({
        taux,
        base_ht: Number(valeur.base_ht.toFixed(2)),
        montant_tva: Number(valeur.montant_tva.toFixed(2)),
      }))
      .sort((a, b) => a.taux - b.taux),
  };
}

function DocumentPdf({
  typeDocument,
  entreprise,
  document,
  client,
  lignes = [],
  factureOrigine,
  design,
}: GenererPdfParams & { design: DesignDocuments }) {
  const styles = creerStyles(design);
  const estDevis = typeDocument === "devis";
  const estAvoir = typeDocument === "avoir";
  const resumeFinancier = resumeFinancierPdf(lignes, document);

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

  const adresseChantier = adresseComplete(
    document.adresse_chantier,
    document.code_postal_chantier,
    document.ville_chantier
  );

  const logo = logoValide(entreprise.logo_url);

  const conditions =
    document.conditions ||
    (estDevis
      ? entreprise.conditions_generales_devis
      : entreprise.conditions_generales_factures);

  const piedPage =
    design.design_pied_page ||
    `Document généré par Arboboard - ${texte(
      entreprise.nom_entreprise,
      "Entreprise"
    )}`;

  const blocLogo = logo ? (
    <Image src={logo} style={styles.logo} />
  ) : null;

  const blocEntrepriseTexte = (
    <View style={styles.entrepriseTexte}>
      <Text style={styles.entrepriseNom}>
        {texte(entreprise.nom_entreprise, "Entreprise")}
      </Text>

      {entreprise.forme_juridique ? (
        <Text style={styles.entrepriseInfo}>
          {entreprise.forme_juridique}
        </Text>
      ) : null}

      {design.design_afficher_adresse && adresseEntreprise ? (
        <Text style={[styles.entrepriseInfo, { marginTop: 5 }]}>
          {adresseEntreprise}
        </Text>
      ) : null}

      {design.design_afficher_contact ? (
        <View style={{ marginTop: 5 }}>
          {entreprise.telephone ? (
            <Text style={styles.entrepriseInfo}>
              Téléphone : {entreprise.telephone}
            </Text>
          ) : null}

          {entreprise.email || entreprise.email_contact ? (
            <Text style={styles.entrepriseInfo}>
              Email : {entreprise.email || entreprise.email_contact}
            </Text>
          ) : null}
        </View>
      ) : null}

      {design.design_afficher_siret && entreprise.siret ? (
        <Text style={[styles.entrepriseInfo, { marginTop: 4 }]}>
          SIRET : {entreprise.siret}
        </Text>
      ) : null}

      {design.design_afficher_tva &&
      (entreprise.numero_tva_intracommunautaire ||
        entreprise.numero_tva) ? (
        <Text style={styles.entrepriseInfo}>
          TVA intracommunautaire :{" "}
          {entreprise.numero_tva_intracommunautaire ||
            entreprise.numero_tva}
        </Text>
      ) : null}
    </View>
  );

  return (
    <Document
      title={`${titreDocument(typeDocument)} ${texte(
        document.numero,
        ""
      )}`}
      author={texte(entreprise.nom_entreprise, "Arboboard")}
      subject={texte(document.objet, libelleDocument(typeDocument))}
      creator="Arboboard"
      producer="Arboboard"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.topBar} />

        <View style={styles.header}>
          <View style={styles.entrepriseCol}>
            <View style={styles.entrepriseHeader}>
              {design.design_position_logo === "droite" ? (
                <>
                  {blocEntrepriseTexte}
                  {blocLogo}
                </>
              ) : (
                <>
                  {blocLogo}
                  {blocEntrepriseTexte}
                </>
              )}
            </View>
          </View>

          <View style={styles.documentCol}>
            <View style={styles.documentCard}>
              <Text style={styles.documentLabel}>DOCUMENT</Text>
              <Text style={styles.documentTitle}>
                {titreDocument(typeDocument)}
              </Text>
              <Text style={styles.documentNumero}>
                N° {texte(document.numero, "Sans numéro")}
              </Text>

              <View style={styles.miniRow}>
                <Text style={styles.miniLabel}>Type</Text>
                <Text style={styles.miniValue}>
                  {estDevis
                    ? "Devis"
                    : estAvoir
                      ? "Avoir"
                      : libelleTypeFacture(document.type_facture)}
                </Text>
              </View>

              <View style={styles.miniRow}>
                <Text style={styles.miniLabel}>Date</Text>
                <Text style={styles.miniValue}>
                  {formatDate(
                    estDevis
                      ? document.date_devis
                      : document.date_facture
                  )}
                </Text>
              </View>

              {estDevis ? (
                <View style={styles.miniRow}>
                  <Text style={styles.miniLabel}>Validité</Text>
                  <Text style={styles.miniValue}>
                    {formatDate(document.date_validite)}
                  </Text>
                </View>
              ) : !estAvoir ? (
                <View style={styles.miniRow}>
                  <Text style={styles.miniLabel}>Échéance</Text>
                  <Text style={styles.miniValue}>
                    {formatDate(document.date_echeance)}
                  </Text>
                </View>
              ) : null}

              <View style={styles.miniRow}>
                <Text style={styles.miniLabel}>Statut</Text>
                <Text style={styles.miniValue}>
                  {libelleStatut(document.statut)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.sectionInfos}>
          <View style={styles.demiBloc}>
            <Text style={styles.labelSection}>CLIENT</Text>
            <Text style={styles.titreBloc}>
              {nomClient(client, document)}
            </Text>

            {adresseClient ? (
              <Text style={styles.texteNormal}>
                {adresseClient}
              </Text>
            ) : null}

            {client?.email ? (
              <Text style={[styles.textePetit, { marginTop: 5 }]}>
                Email : {client.email}
              </Text>
            ) : null}

            {client?.telephone ? (
              <Text style={styles.textePetit}>
                Téléphone : {client.telephone}
              </Text>
            ) : null}
          </View>

          <View style={styles.demiBlocDroit}>
            <Text style={styles.labelSection}>
              OBJET DU {titreDocument(typeDocument)}
            </Text>
            <Text style={styles.titreBloc}>
              {texte(document.objet, "Sans objet")}
            </Text>
            <Text style={styles.texteNormal}>
              {texte(
                document.description,
                "Aucune description renseignée."
              )}
            </Text>
          </View>
        </View>

        {(adresseChantier || document.notes_chantier) ? (
          <View style={styles.chantier}>
            <Text style={styles.chantierTitre}>
              Lieu d’intervention / chantier
            </Text>
            <Text style={styles.texteNormal}>
              {adresseChantier ||
                "Adresse chantier non renseignée."}
            </Text>
            {document.notes_chantier ? (
              <Text style={[styles.textePetit, { marginTop: 5 }]}>
                Notes : {document.notes_chantier}
              </Text>
            ) : null}
          </View>
        ) : null}

        {estAvoir ? (
          <View style={styles.avoir}>
            <Text style={styles.chantierTitre}>
              Informations liées à l’avoir
            </Text>
            <Text style={styles.texteNormal}>
              {factureOrigine
                ? `Référence : facture ${texte(
                    factureOrigine.numero,
                    "sans numéro"
                  )} du ${formatDate(
                    factureOrigine.date_facture
                  )}.`
                : "Cet avoir est établi en référence à une facture précédemment émise."}
            </Text>
            {document.motif_avoir ? (
              <Text style={[styles.textePetit, { marginTop: 5 }]}>
                Motif : {document.motif_avoir}
              </Text>
            ) : null}
          </View>
        ) : null}

        <View style={styles.tableWrap}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, { width: "32%" }]}>
              Désignation
            </Text>
            <Text
              style={[
                styles.th,
                { width: "8%", textAlign: "right" },
              ]}
            >
              Qté
            </Text>
            <Text
              style={[
                styles.th,
                { width: "8%", textAlign: "right" },
              ]}
            >
              Unité
            </Text>
            <Text
              style={[
                styles.th,
                { width: "14%", textAlign: "right" },
              ]}
            >
              PU HT
            </Text>
            <Text
              style={[
                styles.th,
                { width: "10%", textAlign: "right" },
              ]}
            >
              Remise
            </Text>
            <Text
              style={[
                styles.th,
                { width: "9%", textAlign: "right" },
              ]}
            >
              TVA
            </Text>
            <Text
              style={[
                styles.th,
                { width: "19%", textAlign: "right" },
              ]}
            >
              Total HT
            </Text>
          </View>

          {lignes.length === 0 ? (
            <View style={styles.row}>
              <Text style={[styles.cell, { width: "100%" }]}>
                Aucune ligne renseignée.
              </Text>
            </View>
          ) : (
            lignes.map((ligne, index) => {
              if (typeLigneDocument(ligne) === "section") {
                return (
                  <View
                    key={ligne.id || `section-${index}`}
                    style={[
                      styles.row,
                      {
                        backgroundColor:
                          design.design_couleur_secondaire,
                        borderBottomColor:
                          design.design_couleur_principale,
                        minHeight: 30,
                      },
                    ]}
                    wrap={false}
                  >
                    <View
                      style={[
                        styles.cell,
                        { width: "76%" },
                      ]}
                    >
                      <Text
                        style={[
                          styles.designation,
                          {
                            color:
                              design.design_couleur_principale,
                          },
                        ]}
                      >
                        {texte(ligne.designation, "Section")}
                      </Text>

                      {ligne.description ? (
                        <Text style={styles.description}>
                          {ligne.description}
                        </Text>
                      ) : null}
                    </View>

                    <View
                      style={[
                        styles.cell,
                        {
                          width: "24%",
                          textAlign: "right",
                        },
                      ]}
                    >
                      <Text
                        style={{
                          fontSize: 6.8,
                          color: "#64748b",
                        }}
                      >
                        Sous-total HT
                      </Text>
                      <Text
                        style={{
                          marginTop: 2,
                          fontSize: 9,
                          fontWeight: "bold",
                          color:
                            design.design_couleur_principale,
                        }}
                      >
                        {formatMontant(
                          sousTotalSectionPdf(lignes, index)
                        )}
                      </Text>
                    </View>
                  </View>
                );
              }

              return (
                <View
                  key={ligne.id || index}
                  style={styles.row}
                  wrap={false}
                >
                  <View style={[styles.cell, { width: "32%" }]}>
                    <Text style={styles.designation}>
                      {texte(
                        ligne.designation,
                        "Ligne sans désignation"
                      )}
                    </Text>

                    {ligne.description ? (
                      <Text style={styles.description}>
                        {ligne.description}
                      </Text>
                    ) : null}
                  </View>

                  <Text
                    style={[
                      styles.cell,
                      { width: "8%", textAlign: "right" },
                    ]}
                  >
                    {formatNombre(ligne.quantite)}
                  </Text>

                  <Text
                    style={[
                      styles.cell,
                      { width: "8%", textAlign: "right" },
                    ]}
                  >
                    {texte(ligne.unite, "u")}
                  </Text>

                  <Text
                    style={[
                      styles.cell,
                      { width: "14%", textAlign: "right" },
                    ]}
                  >
                    {formatMontant(ligne.prix_unitaire_ht)}
                  </Text>

                  <Text
                    style={[
                      styles.cell,
                      { width: "10%", textAlign: "right" },
                    ]}
                  >
                    {pourcentage(ligne.remise_pourcent) > 0
                      ? `${formatNombre(
                          pourcentage(ligne.remise_pourcent)
                        )} %`
                      : "-"}
                  </Text>

                  <Text
                    style={[
                      styles.cell,
                      { width: "9%", textAlign: "right" },
                    ]}
                  >
                    {formatNombre(ligne.tva)} %
                  </Text>

                  <Text
                    style={[
                      styles.cell,
                      {
                        width: "19%",
                        textAlign: "right",
                        fontWeight: "bold",
                      },
                    ]}
                  >
                    {formatMontant(ligne.total_ht)}
                  </Text>
                </View>
              );
            })
          )}
        </View>

        <View style={styles.bottom}>
          <View style={styles.conditions}>
            {conditions ? (
              <View style={styles.conditionsBox}>
                <Text style={styles.conditionsTitle}>
                  {estDevis
                    ? "CONDITIONS GÉNÉRALES DU DEVIS"
                    : "CONDITIONS GÉNÉRALES DE FACTURE"}
                </Text>
                <Text style={styles.conditionsText}>
                  {conditions}
                </Text>
              </View>
            ) : null}

            {design.design_afficher_assurance &&
            entreprise.assurance_professionnelle ? (
              <View style={styles.conditionsBox}>
                <Text style={styles.conditionsTitle}>
                  ASSURANCE PROFESSIONNELLE
                </Text>
                <Text style={styles.conditionsText}>
                  {entreprise.assurance_professionnelle}
                </Text>
              </View>
            ) : null}

            {entreprise.mentions_legales ? (
              <View style={styles.conditionsBox}>
                <Text style={styles.conditionsTitle}>
                  MENTIONS LÉGALES
                </Text>
                <Text style={styles.conditionsText}>
                  {entreprise.mentions_legales}
                </Text>
              </View>
            ) : null}

            {estDevis ? (
              <View style={styles.signature}>
                <Text style={styles.conditionsTitle}>
                  BON POUR ACCORD — DATE, NOM ET SIGNATURE
                </Text>
                <View style={styles.signatureLigne} />
              </View>
            ) : null}
          </View>

          <View style={styles.totaux}>
            <View style={styles.totalCard}>
              {resumeFinancier.totalBrutHt >
              Number(document.total_ht || 0) ? (
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>
                    Total brut HT
                  </Text>
                  <Text style={styles.totalValue}>
                    {formatMontant(resumeFinancier.totalBrutHt)}
                  </Text>
                </View>
              ) : null}

              {resumeFinancier.remiseLignes > 0 ? (
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>
                    Remises lignes
                  </Text>
                  <Text style={styles.totalValue}>
                    -{formatMontant(resumeFinancier.remiseLignes)}
                  </Text>
                </View>
              ) : null}

              {resumeFinancier.remiseGlobaleMontant > 0 ? (
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>
                    Remise globale (
                    {formatNombre(
                      resumeFinancier.remiseGlobalePourcent
                    )}{" "}
                    %)
                  </Text>
                  <Text style={styles.totalValue}>
                    -{formatMontant(
                      resumeFinancier.remiseGlobaleMontant
                    )}
                  </Text>
                </View>
              ) : null}

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total HT</Text>
                <Text style={styles.totalValue}>
                  {formatMontant(document.total_ht)}
                </Text>
              </View>

              {resumeFinancier.recapTva.map((ligneTva) => (
                <View
                  key={`tva-${ligneTva.taux}`}
                  style={styles.totalRow}
                >
                  <Text style={styles.totalLabel}>
                    TVA {formatNombre(ligneTva.taux)} % · base{" "}
                    {formatMontant(ligneTva.base_ht)}
                  </Text>
                  <Text style={styles.totalValue}>
                    {formatMontant(ligneTva.montant_tva)}
                  </Text>
                </View>
              ))}

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total TVA</Text>
                <Text style={styles.totalValue}>
                  {formatMontant(document.total_tva)}
                </Text>
              </View>

              <View style={styles.totalFinal}>
                <Text style={styles.totalFinalValue}>
                  {estAvoir ? "Total avoir TTC" : "Total TTC"}
                </Text>
                <Text style={styles.totalFinalValue}>
                  {formatMontant(document.total_ttc)}
                </Text>
              </View>

              {!estDevis && !estAvoir ? (
                <View style={styles.paiement}>
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>
                      Montant payé
                    </Text>
                    <Text style={styles.totalValue}>
                      {formatMontant(document.montant_paye)}
                    </Text>
                  </View>

                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>
                      Reste à payer
                    </Text>
                    <Text style={styles.totalValue}>
                      {formatMontant(document.reste_a_payer)}
                    </Text>
                  </View>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        <Text style={styles.footer}>{piedPage}</Text>
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
    document.entreprise_id ||
    entreprise.id ||
    entreprise.entreprise_id;

  const parametres = entrepriseId
    ? await chargerParametresEntrepriseDocument(entrepriseId)
    : null;

  const design = normaliserDesignDocuments(
    parametres || DESIGN_DOCUMENTS_DEFAUT
  );

  const entreprisePourPdf = {
    ...entreprise,
    ...parametres,
    nom_entreprise:
      parametres?.nom_entreprise ||
      entreprise.nom_entreprise ||
      entreprise.nom ||
      entreprise.raison_sociale ||
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
      design={design}
    />
  );

  const buffer = await renduPdfEnBuffer(element);

  return {
    filename: nomFichierPdf(typeDocument, document),
    content: buffer.toString("base64"),
    buffer,
  };
}