import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

export type ParametresEntreprisePv = {
  nom_entreprise: string | null;
  adresse: string | null;
  code_postal: string | null;
  ville: string | null;
  telephone: string | null;
  email: string | null;
  siret: string | null;
  forme_juridique: string | null;
  logo_url: string | null;
  assurance_professionnelle: string | null;
  mentions_legales: string | null;
};

export type FichePvPdf = {
  id: string;
  numero: string | null;
  client_id: string | null;
  client_nom: string | null;
  titre: string | null;
  type_intervention: string | null;
  date_prevue: string | null;
  date_fin_prevue?: string | null;
  date_intervention: string | null;
  heure_debut_prevue: string | null;
  heure_fin_prevue: string | null;
  heure_debut_reelle: string | null;
  heure_fin_reelle: string | null;
  adresse_chantier: string | null;
  code_postal_chantier: string | null;
  ville_chantier: string | null;
  adresse: string | null;
  code_postal: string | null;
  ville: string | null;
  notes_chantier: string | null;
  travaux_prevus: string | null;
  materiel_prevu: string | null;
  consignes_securite: string | null;
};

export type PvFinChantierPdf = {
  id: string;
  client_email?: string | null;
  client_present: boolean | null;
  chantier_termine: boolean | null;
  reserves?: string | null;
  commentaire_client: string | null;
  commentaire_entreprise: string | null;
  signataire_client_nom?: string | null;
  signature_client?: string | null;
  signataire_entreprise_nom?: string | null;
  signature_entreprise?: string | null;

  // Compatibilité anciens enregistrements
  reserves_client?: string | null;
  nom_signataire_client?: string | null;
  signature_client_data_url?: string | null;
  signe_client_at?: string | null;
  nom_signataire_entreprise?: string | null;
  signature_entreprise_data_url?: string | null;
  signe_entreprise_at?: string | null;

  envoye_client_at?: string | null;
  envoye_client_email?: string | null;
  created_at: string | null;
  updated_at?: string | null;
};

export type ElementFichePv = {
  id: string;
  nom: string;
  categorie: string;
  icone: string | null;
  quantite_prevue: number | null;
  quantite_reelle?: number | null;
  unite: string | null;
  commentaire_chef: string | null;
  commentaire_salarie?: string | null;
};

export type PhotoPv = {
  id: string;
  categorie: string | null;
  commentaire: string | null;
  created_at: string | null;
  signed_url?: string | null;
};

export type SalariePv = {
  id: string;
  salarie_nom: string | null;
  role_chantier: string | null;
  heure_arrivee_prevue: string | null;
  heure_depart_prevue: string | null;
  heure_arrivee_reelle: string | null;
  heure_depart_reelle: string | null;
};

type Props = {
  entreprise: ParametresEntreprisePv | null;
  fiche: FichePvPdf;
  pv: PvFinChantierPdf;
  elements: ElementFichePv[];
  photos: PhotoPv[];
  equipe: SalariePv[];
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 28,
    paddingRight: 34,
    paddingBottom: 48,
    paddingLeft: 34,
    fontSize: 9.5,
    fontFamily: "Helvetica",
    color: "#0f172a",
    backgroundColor: "#ffffff",
  },
  topBar: {
    height: 5,
    borderRadius: 999,
    backgroundColor: "#047857",
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#dbe4df",
  },
  headerLeft: {
    width: "58%",
    paddingRight: 16,
  },
  headerRight: {
    width: "38%",
    alignItems: "flex-end",
    textAlign: "right",
  },
  logo: {
    width: 82,
    height: 58,
    objectFit: "contain",
    marginBottom: 6,
  },
  companyName: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#064e3b",
    marginBottom: 4,
  },
  small: {
    fontSize: 8.2,
    lineHeight: 1.4,
    color: "#64748b",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#064e3b",
  },
  subtitle: {
    marginTop: 5,
    fontSize: 8.5,
    color: "#64748b",
  },
  section: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#dbe4df",
    borderRadius: 10,
    padding: 12,
  },
  sectionGreen: {
    backgroundColor: "#f0fdf4",
    borderColor: "#bbf7d0",
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#064e3b",
    marginBottom: 9,
  },
  twoCols: {
    flexDirection: "row",
  },
  col: {
    flex: 1,
  },
  colLeft: {
    paddingRight: 10,
  },
  colRight: {
    paddingLeft: 10,
  },
  label: {
    fontSize: 7.5,
    textTransform: "uppercase",
    color: "#64748b",
    marginBottom: 2,
  },
  value: {
    fontSize: 9.5,
    lineHeight: 1.4,
    color: "#0f172a",
    marginBottom: 7,
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#064e3b",
    marginBottom: 4,
  },
  summaryMeta: {
    fontSize: 8.5,
    color: "#475569",
    lineHeight: 1.45,
    marginBottom: 9,
  },
  summaryText: {
    fontSize: 11,
    lineHeight: 1.6,
    color: "#1e293b",
  },
  validationBox: {
    marginTop: 8,
    borderRadius: 8,
    padding: 10,
    backgroundColor: "#ecfdf5",
    borderWidth: 1,
    borderColor: "#a7f3d0",
  },
  validationMain: {
    fontSize: 10.5,
    fontWeight: "bold",
    lineHeight: 1.45,
    color: "#065f46",
  },
  validationText: {
    marginTop: 6,
    fontSize: 9.2,
    lineHeight: 1.5,
    color: "#334155",
  },
  reserveBox: {
    marginTop: 8,
    borderRadius: 7,
    padding: 8,
    backgroundColor: "#fff7ed",
    borderWidth: 1,
    borderColor: "#fed7aa",
  },
  reserveTitle: {
    fontSize: 8.5,
    fontWeight: "bold",
    color: "#9a3412",
    marginBottom: 3,
  },
  reserveText: {
    fontSize: 9,
    lineHeight: 1.45,
    color: "#7c2d12",
  },
  signatureRow: {
    flexDirection: "row",
  },
  signatureBox: {
    width: "48%",
    minHeight: 122,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 9,
    padding: 10,
  },
  signatureLeft: {
    marginRight: "4%",
  },
  signatureTitle: {
    fontSize: 10.5,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 6,
  },
  signatureImage: {
    width: "100%",
    height: 62,
    objectFit: "contain",
    marginVertical: 6,
  },
  footer: {
    position: "absolute",
    left: 34,
    right: 34,
    bottom: 18,
    paddingTop: 7,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    fontSize: 7.2,
    color: "#64748b",
    textAlign: "center",
  },
});

function texte(valeur?: string | null, defaut = "—") {
  const propre = String(valeur ?? "").trim();
  return propre || defaut;
}

function formatDate(date?: string | null) {
  if (!date) return "—";

  try {
    const valeur = date.includes("T") ? date.slice(0, 10) : date;
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(`${valeur}T00:00:00`));
  } catch {
    return "—";
  }
}

function formatDateHeure(date?: string | null) {
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
    return "—";
  }
}

function adresseEntreprise(entreprise: ParametresEntreprisePv | null) {
  return [
    entreprise?.adresse,
    [entreprise?.code_postal, entreprise?.ville].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ");
}

function adresseChantier(fiche: FichePvPdf) {
  const adresse = fiche.adresse_chantier || fiche.adresse;
  const cp = fiche.code_postal_chantier || fiche.code_postal;
  const ville = fiche.ville_chantier || fiche.ville;

  return [adresse, [cp, ville].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");
}

function reservesPv(pv: PvFinChantierPdf) {
  return pv.reserves || pv.reserves_client || null;
}

function nomSignataireClient(pv: PvFinChantierPdf) {
  return pv.signataire_client_nom || pv.nom_signataire_client || null;
}

function signatureClient(pv: PvFinChantierPdf) {
  return pv.signature_client || pv.signature_client_data_url || null;
}

function nomSignataireEntreprise(pv: PvFinChantierPdf) {
  return (
    pv.signataire_entreprise_nom ||
    pv.nom_signataire_entreprise ||
    null
  );
}

function signatureEntreprise(pv: PvFinChantierPdf) {
  return (
    pv.signature_entreprise ||
    pv.signature_entreprise_data_url ||
    null
  );
}

function dateSignatureClient(pv: PvFinChantierPdf) {
  return pv.signe_client_at || pv.updated_at || pv.created_at;
}

function dateSignatureEntreprise(pv: PvFinChantierPdf) {
  return pv.signe_entreprise_at || pv.updated_at || pv.created_at;
}

function periodeIntervention(fiche: FichePvPdf) {
  const debut = fiche.date_prevue || fiche.date_intervention;
  const fin = fiche.date_fin_prevue || debut;

  if (!debut) return "Date non renseignée";
  if (!fin || fin === debut) return formatDate(debut);
  return `Du ${formatDate(debut)} au ${formatDate(fin)}`;
}

function resumeIntervention(fiche: FichePvPdf, pv: PvFinChantierPdf) {
  const travaux = String(fiche.travaux_prevus || "").trim();
  const commentaireEntreprise = String(
    pv.commentaire_entreprise || ""
  ).trim();

  if (travaux && commentaireEntreprise) {
    return `${travaux}\n\nCompte rendu : ${commentaireEntreprise}`;
  }

  if (travaux) return travaux;
  if (commentaireEntreprise) return commentaireEntreprise;

  return (
    String(fiche.titre || "").trim() ||
    String(fiche.type_intervention || "").trim() ||
    "Intervention réalisée conformément à la fiche de chantier."
  );
}

export function PvFinChantierDocument({
  entreprise,
  fiche,
  pv,
  elements,
  photos,
  equipe,
}: Props) {
  // Conservés dans la signature du composant pour ne casser aucune route
  // existante. Ils ne sont volontairement plus imprimés sur le PV simplifié.
  void elements;
  void photos;
  void equipe;

  const valeurReserves = reservesPv(pv);
  const valeurSignatureClient = signatureClient(pv);
  const valeurSignatureEntreprise = signatureEntreprise(pv);

  const validationPrincipale = !pv.chantier_termine
    ? "Chantier indiqué comme non terminé"
    : valeurReserves
      ? "Chantier réceptionné avec réserves"
      : "Chantier réceptionné et validé";

  const validationTexte = valeurSignatureClient
    ? "Par sa signature, le client confirme avoir pris connaissance du résumé de l’intervention et valide la réception du chantier selon les éléments indiqués sur ce PV."
    : "La validation du chantier sera considérée comme complète après signature du client.";

  return (
    <Document
      title={`PV fin de chantier ${fiche.numero || fiche.id}`}
      author={entreprise?.nom_entreprise || "ArboBoard"}
      subject="Procès-verbal de fin de chantier"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.topBar} />

        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {entreprise?.logo_url ? (
              <Image src={entreprise.logo_url} style={styles.logo} />
            ) : null}

            <Text style={styles.companyName}>
              {texte(entreprise?.nom_entreprise, "Entreprise")}
            </Text>

            {adresseEntreprise(entreprise) ? (
              <Text style={styles.small}>
                {adresseEntreprise(entreprise)}
              </Text>
            ) : null}

            {entreprise?.telephone ? (
              <Text style={styles.small}>
                Tél. {entreprise.telephone}
              </Text>
            ) : null}

            {entreprise?.email ? (
              <Text style={styles.small}>
                {entreprise.email}
              </Text>
            ) : null}

            {entreprise?.siret ? (
              <Text style={styles.small}>
                SIRET : {entreprise.siret}
              </Text>
            ) : null}
          </View>

          <View style={styles.headerRight}>
            <Text style={styles.title}>PV de fin de chantier</Text>
            <Text style={styles.subtitle}>
              Fiche {texte(fiche.numero || fiche.id)}
            </Text>
            <Text style={styles.subtitle}>
              {periodeIntervention(fiche)}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Informations client
          </Text>

          <View style={styles.twoCols}>
            <View style={[styles.col, styles.colLeft]}>
              <Text style={styles.label}>Client</Text>
              <Text style={styles.value}>
                {texte(fiche.client_nom)}
              </Text>

              <Text style={styles.label}>Email</Text>
              <Text style={styles.value}>
                {texte(pv.client_email || pv.envoye_client_email)}
              </Text>
            </View>

            <View style={[styles.col, styles.colRight]}>
              <Text style={styles.label}>Adresse du chantier</Text>
              <Text style={styles.value}>
                {texte(adresseChantier(fiche))}
              </Text>

              <Text style={styles.label}>Période d’intervention</Text>
              <Text style={styles.value}>
                {periodeIntervention(fiche)}
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.section, styles.sectionGreen]}>
          <Text style={styles.summaryTitle}>
            Résumé de l’intervention
          </Text>

          <Text style={styles.summaryMeta}>
            {texte(fiche.titre, "Intervention")}
            {fiche.type_intervention
              ? ` · ${fiche.type_intervention}`
              : ""}
            {adresseChantier(fiche)
              ? ` · ${adresseChantier(fiche)}`
              : ""}
          </Text>

          <Text style={styles.summaryText}>
            {resumeIntervention(fiche, pv)}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Validation du chantier par le client
          </Text>

          <View style={styles.validationBox}>
            <Text style={styles.validationMain}>
              {validationPrincipale}
            </Text>

            <Text style={styles.validationText}>
              {validationTexte}
            </Text>
          </View>

          {valeurReserves ? (
            <View style={styles.reserveBox}>
              <Text style={styles.reserveTitle}>
                Réserves du client
              </Text>
              <Text style={styles.reserveText}>
                {valeurReserves}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.section} wrap={false}>
          <Text style={styles.sectionTitle}>Signatures</Text>

          <View style={styles.signatureRow}>
            <View style={[styles.signatureBox, styles.signatureLeft]}>
              <Text style={styles.signatureTitle}>Client</Text>
              <Text style={styles.small}>
                Nom : {texte(nomSignataireClient(pv))}
              </Text>

              {valeurSignatureClient ? (
                <Image
                  src={valeurSignatureClient}
                  style={styles.signatureImage}
                />
              ) : (
                <Text style={[styles.small, { marginTop: 20, marginBottom: 20 }]}>
                  Signature non renseignée
                </Text>
              )}

              <Text style={styles.small}>
                Signé le {formatDateHeure(dateSignatureClient(pv))}
              </Text>
            </View>

            <View style={styles.signatureBox}>
              <Text style={styles.signatureTitle}>Entreprise</Text>
              <Text style={styles.small}>
                Nom : {texte(nomSignataireEntreprise(pv))}
              </Text>

              {valeurSignatureEntreprise ? (
                <Image
                  src={valeurSignatureEntreprise}
                  style={styles.signatureImage}
                />
              ) : (
                <Text style={[styles.small, { marginTop: 20, marginBottom: 20 }]}>
                  Signature non renseignée
                </Text>
              )}

              <Text style={styles.small}>
                Signé le {formatDateHeure(dateSignatureEntreprise(pv))}
              </Text>
            </View>
          </View>
        </View>

        <Text
          fixed
          style={styles.footer}
          render={({ pageNumber, totalPages }) =>
            `${texte(
              entreprise?.nom_entreprise,
              "Entreprise"
            )} · PV généré par ArboBoard · Page ${pageNumber}/${totalPages}`
          }
        />
      </Page>
    </Document>
  );
}