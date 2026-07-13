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
  devis_id?: string | null;
  client_id: string | null;
  client_nom: string | null;
  titre: string | null;
  type_intervention: string | null;
  date_prevue: string | null;
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
  client_present: boolean | null;
  chantier_termine: boolean | null;

  client_email?: string | null;

  reserves?: string | null;
  reserves_client?: string | null;

  commentaire_client: string | null;
  commentaire_entreprise: string | null;

  signataire_client_nom?: string | null;
  nom_signataire_client?: string | null;

  signature_client?: string | null;
  signature_client_data_url?: string | null;

  signe_client_at?: string | null;

  signataire_entreprise_nom?: string | null;
  nom_signataire_entreprise?: string | null;

  signature_entreprise?: string | null;
  signature_entreprise_data_url?: string | null;

  signe_entreprise_at?: string | null;

  created_at: string | null;
  updated_at?: string | null;
};

export type ElementFichePv = {
  id: string;
  nom: string;
  categorie: string;
  icone: string | null;
  quantite_prevue: number | null;
  unite: string | null;
  commentaire_chef: string | null;
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
    paddingTop: 34,
    paddingRight: 42,
    paddingBottom: 34,
    paddingLeft: 42,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#111827",
    backgroundColor: "#ffffff",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  logo: {
    width: 82,
    height: 54,
    objectFit: "contain",
  },
  companyBlock: {
    flex: 1,
    paddingRight: 18,
  },
  companyName: {
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 3,
  },
  small: {
    fontSize: 8.5,
    lineHeight: 1.35,
    color: "#374151",
  },
  title: {
    marginTop: 4,
    marginBottom: 20,
    textAlign: "center",
    fontSize: 18,
    fontWeight: 700,
    letterSpacing: 0.4,
  },
  infoBlock: {
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 5,
  },
  label: {
    width: 105,
    fontWeight: 700,
  },
  value: {
    flex: 1,
    borderBottomWidth: 0.8,
    borderBottomColor: "#6b7280",
    paddingBottom: 2,
  },
  section: {
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 7,
  },
  textBox: {
    minHeight: 54,
    borderBottomWidth: 0.8,
    borderBottomColor: "#9ca3af",
    paddingBottom: 4,
    lineHeight: 1.45,
  },
  paragraph: {
    lineHeight: 1.45,
    textAlign: "justify",
  },
  receptionBox: {
    marginTop: 8,
    marginBottom: 8,
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 5,
  },
  check: {
    width: 16,
    fontSize: 11,
    fontWeight: 700,
  },
  checkText: {
    flex: 1,
  },
  reservesBox: {
    marginTop: 3,
    marginLeft: 16,
    minHeight: 42,
    borderBottomWidth: 0.8,
    borderBottomColor: "#9ca3af",
    paddingBottom: 4,
    lineHeight: 1.4,
  },
  faitRow: {
    marginTop: 15,
    marginBottom: 16,
  },
  signatureRow: {
    flexDirection: "row",
    gap: 18,
    marginTop: 8,
  },
  signatureBox: {
    flex: 1,
    minHeight: 128,
  },
  signatureTitle: {
    fontSize: 10,
    fontWeight: 700,
    marginBottom: 3,
  },
  signatureMention: {
    fontSize: 8,
    color: "#4b5563",
    marginBottom: 6,
    lineHeight: 1.35,
  },
  signerName: {
    fontSize: 8.5,
    marginBottom: 4,
  },
  signatureImage: {
    width: "100%",
    height: 64,
    objectFit: "contain",
    marginTop: 4,
  },
  signaturePlaceholder: {
    height: 64,
    borderBottomWidth: 0.8,
    borderBottomColor: "#9ca3af",
  },
  footerLine: {
    position: "absolute",
    left: 42,
    right: 42,
    bottom: 24,
    borderTopWidth: 0.7,
    borderTopColor: "#d1d5db",
    paddingTop: 5,
    fontSize: 7.5,
    textAlign: "center",
    color: "#6b7280",
  },
});

function texte(valeur?: string | null, defaut = "—") {
  const propre = String(valeur || "").trim();
  return propre || defaut;
}

function formatDate(date?: string | null) {
  if (!date) return "—";

  try {
    const valeur = date.includes("T") ? date : `${date.slice(0, 10)}T00:00:00`;

    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(valeur));
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
  const codePostal = fiche.code_postal_chantier || fiche.code_postal;
  const ville = fiche.ville_chantier || fiche.ville;

  return [
    adresse,
    [codePostal, ville].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ");
}

function villeChantier(fiche: FichePvPdf) {
  return fiche.ville_chantier || fiche.ville || "";
}

function travauxRealises(
  fiche: FichePvPdf,
  elements: ElementFichePv[]
) {
  const travaux = elements
    .filter((element) => element.categorie === "travaux")
    .map((element) => element.nom.trim())
    .filter(Boolean);

  if (travaux.length > 0) {
    return travaux.join(" • ");
  }

  return (
    texte(fiche.travaux_prevus, "") ||
    texte(fiche.titre, "") ||
    texte(fiche.type_intervention, "Travaux réalisés conformément au devis.")
  );
}

function reservesPv(pv: PvFinChantierPdf) {
  return texte(pv.reserves || pv.reserves_client, "");
}

function nomSignataireClient(pv: PvFinChantierPdf) {
  return texte(
    pv.signataire_client_nom || pv.nom_signataire_client,
    ""
  );
}

function signatureClient(pv: PvFinChantierPdf) {
  return pv.signature_client || pv.signature_client_data_url || null;
}

function nomSignataireEntreprise(pv: PvFinChantierPdf) {
  return texte(
    pv.signataire_entreprise_nom || pv.nom_signataire_entreprise,
    ""
  );
}

function signatureEntreprise(pv: PvFinChantierPdf) {
  return (
    pv.signature_entreprise ||
    pv.signature_entreprise_data_url ||
    null
  );
}

function dateDebutTravaux(fiche: FichePvPdf, pv: PvFinChantierPdf) {
  return formatDate(
    fiche.date_intervention ||
      fiche.date_prevue ||
      pv.created_at
  );
}

function dateFinTravaux(fiche: FichePvPdf, pv: PvFinChantierPdf) {
  return formatDate(
    pv.signe_entreprise_at ||
      pv.signe_client_at ||
      pv.updated_at ||
      pv.created_at ||
      fiche.date_intervention ||
      fiche.date_prevue
  );
}

export function PvFinChantierDocument({
  entreprise,
  fiche,
  pv,
  elements,
}: Props) {
  const reserves = reservesPv(pv);
  const sansReserve = reserves.length === 0;
  const signatureClientUrl = signatureClient(pv);
  const signatureEntrepriseUrl = signatureEntreprise(pv);
  const lieu = villeChantier(fiche) || entreprise?.ville || "";
  const dateDocument =
    pv.signe_client_at ||
    pv.signe_entreprise_at ||
    pv.updated_at ||
    pv.created_at;

  return (
    <Document
      title={`Procès-verbal de fin de chantier ${
        fiche.numero || fiche.id
      }`}
      author={texte(entreprise?.nom_entreprise, "Entreprise")}
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.companyBlock}>
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
                Tél. : {entreprise.telephone}
              </Text>
            ) : null}

            {entreprise?.email ? (
              <Text style={styles.small}>
                Email : {entreprise.email}
              </Text>
            ) : null}

            {entreprise?.siret ? (
              <Text style={styles.small}>
                SIRET : {entreprise.siret}
              </Text>
            ) : null}
          </View>

          {entreprise?.logo_url ? (
            <Image src={entreprise.logo_url} style={styles.logo} />
          ) : null}
        </View>

        <Text style={styles.title}>
          PROCÈS-VERBAL DE FIN DE CHANTIER
        </Text>

        <View style={styles.infoBlock}>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Client :</Text>
            <Text style={styles.value}>
              {texte(fiche.client_nom)}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Adresse chantier :</Text>
            <Text style={styles.value}>
              {texte(adresseChantier(fiche))}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>N° fiche :</Text>
            <Text style={styles.value}>
              {texte(fiche.numero || fiche.id)}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Date de début :</Text>
            <Text style={styles.value}>
              {dateDebutTravaux(fiche, pv)}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Date de fin :</Text>
            <Text style={styles.value}>
              {dateFinTravaux(fiche, pv)}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Travaux réalisés</Text>
          <Text style={styles.textBox}>
            {travauxRealises(fiche, elements)}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Réception des travaux
          </Text>

          <Text style={styles.paragraph}>
            Le client reconnaît que les travaux décrits ci-dessus ont été
            réalisés conformément au devis accepté.
          </Text>

          <View style={styles.receptionBox}>
            <View style={styles.checkRow}>
              <Text style={styles.check}>
                {sansReserve ? "☒" : "☐"}
              </Text>
              <Text style={styles.checkText}>
                Réception sans réserve
              </Text>
            </View>

            <View style={styles.checkRow}>
              <Text style={styles.check}>
                {sansReserve ? "☐" : "☒"}
              </Text>
              <Text style={styles.checkText}>
                Réception avec les réserves suivantes :
              </Text>
            </View>

            <Text style={styles.reservesBox}>
              {reserves || " "}
            </Text>
          </View>

          <Text style={styles.paragraph}>
            Le client reconnaît avoir effectué la visite contradictoire du
            chantier et constate que les végétaux, branches, bois, déchets
            verts et produits de coupe prévus au devis ont été évacués ou
            laissés sur place conformément aux conditions convenues.
          </Text>
        </View>

        <View style={styles.faitRow}>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Fait à :</Text>
            <Text style={styles.value}>{texte(lieu)}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Le :</Text>
            <Text style={styles.value}>
              {formatDate(dateDocument)}
            </Text>
          </View>
        </View>

        <View style={styles.signatureRow}>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureTitle}>
              Signature du client
            </Text>
            <Text style={styles.signatureMention}>
              Précédée de la mention « Bon pour réception des travaux »
            </Text>

            {nomSignataireClient(pv) ? (
              <Text style={styles.signerName}>
                {nomSignataireClient(pv)}
              </Text>
            ) : null}

            {signatureClientUrl ? (
              <Image
                src={signatureClientUrl}
                style={styles.signatureImage}
              />
            ) : (
              <View style={styles.signaturePlaceholder} />
            )}
          </View>

          <View style={styles.signatureBox}>
            <Text style={styles.signatureTitle}>
              Signature de l’entreprise
            </Text>
            <Text style={styles.signatureMention}>
              Pour l’entreprise
            </Text>

            {nomSignataireEntreprise(pv) ? (
              <Text style={styles.signerName}>
                {nomSignataireEntreprise(pv)}
              </Text>
            ) : null}

            {signatureEntrepriseUrl ? (
              <Image
                src={signatureEntrepriseUrl}
                style={styles.signatureImage}
              />
            ) : (
              <View style={styles.signaturePlaceholder} />
            )}
          </View>
        </View>

        <Text style={styles.footerLine}>
          {texte(entreprise?.nom_entreprise, "Entreprise")}
          {entreprise?.siret ? ` · SIRET ${entreprise.siret}` : ""}
        </Text>
      </Page>
    </Document>
  );
}