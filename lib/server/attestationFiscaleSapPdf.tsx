import React from "react";
import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

export type OrganismeAttestation = {
  nom: string;
  adresse: string;
  code_postal: string;
  ville: string;
  siret: string;
  email: string;
  telephone: string;
};

export type BeneficiaireAttestation = {
  nom: string;
  adresse: string;
  code_postal: string;
  ville: string;
};

export type FactureAttestation = {
  id: string;
  numero: string;
  date: string;
  montant_ttc: number;
};

export type InterventionAttestation = {
  mois: string;
  intervenant_id: string;
  intervenant_nom: string;
  duree_minutes: number;
  nombre_interventions: number;
  nature_services: string;
};

export type AttestationFiscaleSapPdf = {
  numero: string;
  annee: number;
  organisme: OrganismeAttestation;
  beneficiaire: BeneficiaireAttestation;
  factures: FactureAttestation[];
  interventions: InterventionAttestation[];
  nature_services: string;
  compte_debite_masque: string;
  montant_factures_ttc: number;
  montant_acquitte_client: number;
  montant_cesu_prefinance: number;
  numero_declaration_sap: string;
  date_enregistrement_sap: string;
  signataire_nom: string;
  signataire_qualite: string;
  date_emission: string;
  notes: string;
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 34,
    paddingBottom: 42,
    paddingHorizontal: 38,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: "#0f172a",
    lineHeight: 1.4,
  },
  header: {
    borderBottomWidth: 1.5,
    borderBottomColor: "#0f766e",
    paddingBottom: 12,
    marginBottom: 18,
  },
  company: {
    fontSize: 14,
    fontWeight: 700,
    color: "#0f766e",
  },
  muted: {
    color: "#64748b",
    marginTop: 2,
  },
  title: {
    marginTop: 18,
    textAlign: "center",
    fontSize: 17,
    fontWeight: 700,
    color: "#0f172a",
  },
  subtitle: {
    marginTop: 4,
    textAlign: "center",
    fontSize: 10,
    color: "#475569",
  },
  section: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 700,
    color: "#0f766e",
    marginBottom: 6,
    textTransform: "uppercase",
  },
  box: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 5,
    padding: 10,
  },
  paragraph: {
    marginTop: 6,
    textAlign: "justify",
  },
  amountBox: {
    marginTop: 14,
    padding: 12,
    borderWidth: 1.5,
    borderColor: "#0f766e",
    backgroundColor: "#f0fdfa",
    borderRadius: 5,
  },
  amountLabel: {
    fontSize: 9,
    color: "#475569",
  },
  amountValue: {
    marginTop: 4,
    fontSize: 15,
    fontWeight: 700,
    color: "#0f766e",
  },
  table: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    minHeight: 28,
  },
  rowLast: {
    flexDirection: "row",
    minHeight: 28,
  },
  head: {
    backgroundColor: "#f1f5f9",
    fontWeight: 700,
  },
  cell: {
    padding: 5,
    justifyContent: "center",
  },
  cellMonth: {
    width: "18%",
  },
  cellPerson: {
    width: "32%",
  },
  cellNature: {
    width: "28%",
  },
  cellDuration: {
    width: "12%",
    textAlign: "right",
  },
  cellCount: {
    width: "10%",
    textAlign: "right",
  },
  signature: {
    marginTop: 24,
    marginLeft: "52%",
  },
  signatureBox: {
    height: 64,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 5,
    padding: 8,
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 38,
    right: 38,
    flexDirection: "row",
    justifyContent: "space-between",
    color: "#94a3b8",
    fontSize: 7,
  },
});

function monnaie(montant: number) {
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(montant || 0)) + " EUR";
}

function dateFr(date: string) {
  if (!date) return "Non renseignée";

  try {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(`${date.slice(0, 10)}T00:00:00Z`));
  } catch {
    return date;
  }
}

function moisFr(mois: string) {
  if (!/^\d{4}-\d{2}$/.test(mois)) {
    return mois;
  }

  try {
    return new Intl.DateTimeFormat("fr-FR", {
      month: "long",
      year: "numeric",
    }).format(new Date(`${mois}-01T00:00:00Z`));
  } catch {
    return mois;
  }
}

function duree(minutes: number) {
  const total = Math.max(0, Math.round(minutes || 0));
  const heures = Math.floor(total / 60);
  const reste = total % 60;

  if (heures === 0) {
    return `${reste} min`;
  }

  return reste > 0
    ? `${heures} h ${reste}`
    : `${heures} h`;
}

export function creerAttestationFiscaleSapPdf(
  donnees: AttestationFiscaleSapPdf
) {
  const organisme = donnees.organisme;
  const beneficiaire = donnees.beneficiaire;

  return (
    <Document
      title={`Attestation fiscale ${donnees.annee} - ${beneficiaire.nom}`}
      author={organisme.nom}
      subject="Attestation fiscale annuelle services à la personne"
      creator="Arboboard"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.company}>
            {organisme.nom}
          </Text>
          <Text style={styles.muted}>
            {organisme.adresse} - {organisme.code_postal} {organisme.ville}
          </Text>
          <Text style={styles.muted}>
            SIRET : {organisme.siret || "Non renseigné"}
          </Text>
          <Text style={styles.muted}>
            {organisme.email || ""}
            {organisme.email && organisme.telephone ? " - " : ""}
            {organisme.telephone || ""}
          </Text>

          <Text style={styles.title}>
            ATTESTATION FISCALE ANNUELLE
          </Text>
          <Text style={styles.subtitle}>
            Services à la personne - Année {donnees.annee}
          </Text>
          <Text style={styles.subtitle}>
            Référence Arboboard : {donnees.numero}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Organisme de services à la personne
          </Text>
          <View style={styles.box}>
            <Text>
              Numéro de déclaration SAP : {donnees.numero_declaration_sap}
            </Text>
            <Text style={styles.paragraph}>
              Date d'enregistrement : {dateFr(donnees.date_enregistrement_sap)}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Bénéficiaire
          </Text>
          <View style={styles.box}>
            <Text>{beneficiaire.nom}</Text>
            <Text style={styles.paragraph}>
              {beneficiaire.adresse}
            </Text>
            <Text>
              {beneficiaire.code_postal} {beneficiaire.ville}
            </Text>
            {donnees.compte_debite_masque ? (
              <Text style={styles.paragraph}>
                Compte débité : {donnees.compte_debite_masque}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.section}>
          <Text>
            Je soussigné(e), {donnees.signataire_nom}, agissant en qualité de{" "}
            {donnees.signataire_qualite} pour l'organisme {organisme.nom},
            certifie que {beneficiaire.nom} a bénéficié, au cours de l'année{" "}
            {donnees.annee}, des services à la personne suivants :
          </Text>
          <Text style={styles.paragraph}>
            {donnees.nature_services}
          </Text>
        </View>

        <View style={styles.amountBox}>
          <Text style={styles.amountLabel}>
            Montant total des factures SAP recensées
          </Text>
          <Text style={styles.amountValue}>
            {monnaie(donnees.montant_factures_ttc)}
          </Text>

          <Text style={[styles.amountLabel, { marginTop: 10 }]}>
            Montant effectivement acquitté par le client après déduction,
            le cas échéant, de l'Avance immédiate et des autres aides
          </Text>
          <Text style={styles.amountValue}>
            {monnaie(donnees.montant_acquitte_client)}
          </Text>

          <Text style={[styles.amountLabel, { marginTop: 10 }]}>
            Dont CESU préfinancé déclaré
          </Text>
          <Text style={styles.amountValue}>
            {monnaie(donnees.montant_cesu_prefinance)}
          </Text>
        </View>

        <View style={styles.section} wrap={false}>
          <Text style={styles.sectionTitle}>
            Récapitulatif des interventions
          </Text>

          {donnees.interventions.length === 0 ? (
            <View style={styles.box}>
              <Text>
                Aucun détail d'intervention n'a été trouvé automatiquement.
                Le récapitulatif doit être vérifié avant remise au client.
              </Text>
            </View>
          ) : (
            <View style={styles.table}>
              <View style={[styles.row, styles.head]}>
                <View style={[styles.cell, styles.cellMonth]}>
                  <Text>Mois</Text>
                </View>
                <View style={[styles.cell, styles.cellPerson]}>
                  <Text>Intervenant</Text>
                </View>
                <View style={[styles.cell, styles.cellNature]}>
                  <Text>Nature</Text>
                </View>
                <View style={[styles.cell, styles.cellDuration]}>
                  <Text>Durée</Text>
                </View>
                <View style={[styles.cell, styles.cellCount]}>
                  <Text>Nombre</Text>
                </View>
              </View>

              {donnees.interventions.map((ligne, index) => (
                <View
                  key={`${ligne.mois}-${ligne.intervenant_id}-${index}`}
                  style={
                    index === donnees.interventions.length - 1
                      ? styles.rowLast
                      : styles.row
                  }
                  wrap={false}
                >
                  <View style={[styles.cell, styles.cellMonth]}>
                    <Text>{moisFr(ligne.mois)}</Text>
                  </View>
                  <View style={[styles.cell, styles.cellPerson]}>
                    <Text>
                      {ligne.intervenant_id} - {ligne.intervenant_nom}
                    </Text>
                  </View>
                  <View style={[styles.cell, styles.cellNature]}>
                    <Text>{ligne.nature_services}</Text>
                  </View>
                  <View style={[styles.cell, styles.cellDuration]}>
                    <Text>{duree(ligne.duree_minutes)}</Text>
                  </View>
                  <View style={[styles.cell, styles.cellCount]}>
                    <Text>{ligne.nombre_interventions}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {donnees.notes ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Observations
            </Text>
            <View style={styles.box}>
              <Text>{donnees.notes}</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.signature}>
          <Text>
            Fait le {dateFr(donnees.date_emission)}
          </Text>
          <View style={styles.signatureBox}>
            <Text>{donnees.signataire_nom}</Text>
            <Text style={styles.muted}>
              {donnees.signataire_qualite}
            </Text>
            <Text style={[styles.muted, { marginTop: 10 }]}>
              Signature
            </Text>
          </View>
        </View>

        <View style={styles.footer} fixed>
          <Text>
            Attestation fiscale annuelle SAP générée avec Arboboard
          </Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} / ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}