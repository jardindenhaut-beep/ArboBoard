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

  /**
   * Colonnes actuelles de la table pv_fin_chantier.
   */
  reserves?: string | null;
  commentaire_client: string | null;
  commentaire_entreprise: string | null;
  signataire_client_nom?: string | null;
  signature_client?: string | null;
  signataire_entreprise_nom?: string | null;
  signature_entreprise?: string | null;

  /**
   * Colonnes conservées uniquement pour la compatibilité avec d’anciens
   * enregistrements ou une ancienne route API.
   */
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
    paddingTop: 30,
    paddingRight: 32,
    paddingBottom: 46,
    paddingLeft: 32,
    fontSize: 9.5,
    fontFamily: "Helvetica",
    color: "#0f172a",
    backgroundColor: "#ffffff",
  },
  topBar: {
    height: 5,
    borderRadius: 999,
    backgroundColor: "#059669",
    marginBottom: 16,
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: "#d1d5db",
    paddingBottom: 14,
    marginBottom: 14,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  companyColumn: {
    width: "56%",
    paddingRight: 14,
  },
  documentColumn: {
    width: "40%",
  },
  logo: {
    width: 82,
    height: 58,
    objectFit: "contain",
    marginBottom: 7,
  },
  companyName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#064e3b",
    marginBottom: 4,
  },
  companyLine: {
    fontSize: 8.5,
    lineHeight: 1.4,
    color: "#475569",
  },
  titleBlock: {
    textAlign: "right",
    alignItems: "flex-end",
  },
  title: {
    fontSize: 21,
    fontWeight: "bold",
    color: "#064e3b",
  },
  subtitle: {
    marginTop: 4,
    fontSize: 9,
    color: "#64748b",
  },
  statusBadge: {
    marginTop: 9,
    paddingVertical: 6,
    paddingHorizontal: 9,
    borderRadius: 6,
    fontSize: 9,
    fontWeight: "bold",
  },
  badgeOk: {
    backgroundColor: "#dcfce7",
    color: "#166534",
  },
  badgeWarning: {
    backgroundColor: "#fee2e2",
    color: "#991b1b",
  },
  section: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 9,
    padding: 11,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#064e3b",
  },
  row: {
    flexDirection: "row",
  },
  col: {
    flex: 1,
  },
  colLeft: {
    paddingRight: 8,
  },
  colRight: {
    paddingLeft: 8,
  },
  label: {
    fontSize: 7.5,
    color: "#64748b",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  value: {
    fontSize: 9.5,
    color: "#0f172a",
    marginBottom: 7,
    lineHeight: 1.35,
  },
  paragraph: {
    fontSize: 9.5,
    lineHeight: 1.45,
    color: "#334155",
  },
  element: {
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingBottom: 5,
    marginBottom: 5,
  },
  elementLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
    marginBottom: 0,
  },
  elementTitle: {
    fontSize: 9.5,
    fontWeight: "bold",
    color: "#0f172a",
  },
  muted: {
    fontSize: 8.5,
    lineHeight: 1.35,
    color: "#64748b",
  },
  alertBox: {
    marginTop: 7,
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 7,
    backgroundColor: "#fef2f2",
    padding: 8,
  },
  alertText: {
    fontSize: 9,
    lineHeight: 1.4,
    color: "#991b1b",
  },
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  photoCard: {
    width: "48%",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    padding: 6,
    marginRight: "2%",
    marginBottom: 8,
  },
  photoImage: {
    width: "100%",
    height: 108,
    objectFit: "cover",
    borderRadius: 5,
    marginBottom: 5,
  },
  signatureRow: {
    flexDirection: "row",
    marginTop: 4,
  },
  signatureBox: {
    width: "48%",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 9,
    padding: 9,
    minHeight: 118,
  },
  signatureBoxLeft: {
    marginRight: "4%",
  },
  signatureTitle: {
    fontSize: 10.5,
    fontWeight: "bold",
    marginBottom: 6,
    color: "#0f172a",
  },
  signatureImage: {
    width: "100%",
    height: 58,
    objectFit: "contain",
    marginVertical: 5,
  },
  legalBlock: {
    marginTop: 10,
    paddingTop: 7,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  footer: {
    position: "absolute",
    left: 32,
    right: 32,
    bottom: 18,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 7,
    fontSize: 7.5,
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

function formatHeure(heure?: string | null) {
  if (!heure) return "—";
  return heure.slice(0, 5);
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

function elementsCategorie(elements: ElementFichePv[], categorie: string) {
  return elements.filter((element) => element.categorie === categorie);
}

function photosCategorieLabel(categorie?: string | null) {
  if (categorie === "avant") return "Avant chantier";
  if (categorie === "pendant") return "Pendant chantier";
  if (categorie === "apres") return "Après chantier";
  if (categorie === "probleme") return "Problème";
  if (categorie === "signature") return "Signature";
  return "Autre";
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

function BlocElements({
  titre,
  elements,
  fallback,
}: {
  titre: string;
  elements: ElementFichePv[];
  fallback?: string | null;
}) {
  if (elements.length === 0 && !fallback) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{titre}</Text>

      {elements.length > 0 ? (
        elements.map((element, index) => (
          <View
            key={element.id}
            style={[
              styles.element,
              index === elements.length - 1 ? styles.elementLast : {},
            ]}
            wrap={false}
          >
            <Text style={styles.elementTitle}>
              {element.nom}
            </Text>

            <Text style={styles.muted}>
              Quantité prévue : {Number(element.quantite_prevue || 1)}{" "}
              {element.unite || "u"}
            </Text>

            {element.commentaire_chef ? (
              <Text style={styles.paragraph}>{element.commentaire_chef}</Text>
            ) : null}
          </View>
        ))
      ) : (
        <Text style={styles.paragraph}>{fallback}</Text>
      )}
    </View>
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
  const dateFiche = fiche.date_prevue || fiche.date_intervention;

  const travaux = elementsCategorie(elements, "travaux");

  const materiel = [
    ...elementsCategorie(elements, "materiel"),
    ...elementsCategorie(elements, "materiaux"),
  ];

  const consignes = [
    ...elementsCategorie(elements, "consigne_securite"),
    ...elementsCategorie(elements, "consigne_chantier"),
  ];

  const photosAffichables = photos
    .filter((photo) => Boolean(photo.signed_url))
    .slice(0, 8);

  const valeurReserves = reservesPv(pv);
  const valeurSignatureClient = signatureClient(pv);
  const valeurSignatureEntreprise = signatureEntreprise(pv);

  return (
    <Document
      title={`PV de fin de chantier ${texte(fiche.numero || fiche.id, "")}`}
      author={texte(entreprise?.nom_entreprise, "Arboboard")}
      subject={texte(fiche.titre, "PV de fin de chantier")}
      creator="Arboboard"
      producer="Arboboard"
    >
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.topBar} />

        <View style={styles.header}>
          <View style={styles.companyColumn}>
            {entreprise?.logo_url ? (
              <Image src={entreprise.logo_url} style={styles.logo} />
            ) : null}

            <Text style={styles.companyName}>
              {texte(entreprise?.nom_entreprise, "Entreprise")}
            </Text>

            {adresseEntreprise(entreprise) ? (
              <Text style={styles.companyLine}>
                {adresseEntreprise(entreprise)}
              </Text>
            ) : null}

            {(entreprise?.telephone || entreprise?.email) ? (
              <Text style={styles.companyLine}>
                {entreprise?.telephone
                  ? `Tél. : ${entreprise.telephone}`
                  : ""}
                {entreprise?.telephone && entreprise?.email ? " · " : ""}
                {entreprise?.email
                  ? `Email : ${entreprise.email}`
                  : ""}
              </Text>
            ) : null}

            {entreprise?.siret ? (
              <Text style={styles.companyLine}>SIRET : {entreprise.siret}</Text>
            ) : null}

            {entreprise?.forme_juridique ? (
              <Text style={styles.companyLine}>
                Forme juridique : {entreprise.forme_juridique}
              </Text>
            ) : null}
          </View>

          <View style={[styles.documentColumn, styles.titleBlock]}>
            <Text style={styles.title}>PV de fin de chantier</Text>

            <Text style={styles.subtitle}>
              Fiche : {texte(fiche.numero || fiche.id)}
            </Text>

            <Text style={styles.subtitle}>
              Date d’intervention : {formatDate(dateFiche)}
            </Text>

            <Text
              style={[
                styles.statusBadge,
                pv.chantier_termine
                  ? styles.badgeOk
                  : styles.badgeWarning,
              ]}
            >
              {pv.chantier_termine
                ? "CHANTIER TERMINÉ"
                : "CHANTIER NON TERMINÉ"}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations chantier</Text>

          <View style={styles.row}>
            <View style={[styles.col, styles.colLeft]}>
              <Text style={styles.label}>Client</Text>
              <Text style={styles.value}>{texte(fiche.client_nom)}</Text>

              <Text style={styles.label}>Titre intervention</Text>
              <Text style={styles.value}>{texte(fiche.titre)}</Text>

              <Text style={styles.label}>Type d’intervention</Text>
              <Text style={styles.value}>
                {texte(fiche.type_intervention)}
              </Text>
            </View>

            <View style={[styles.col, styles.colRight]}>
              <Text style={styles.label}>Adresse chantier</Text>
              <Text style={styles.value}>{texte(adresseChantier(fiche))}</Text>

              <Text style={styles.label}>Horaires prévus</Text>
              <Text style={styles.value}>
                {formatHeure(fiche.heure_debut_prevue)} →{" "}
                {formatHeure(fiche.heure_fin_prevue)}
              </Text>

              <Text style={styles.label}>Horaires réels</Text>
              <Text style={styles.value}>
                {formatHeure(fiche.heure_debut_reelle)} →{" "}
                {formatHeure(fiche.heure_fin_reelle)}
              </Text>
            </View>
          </View>

          {fiche.notes_chantier ? (
            <View wrap={false}>
              <Text style={styles.label}>Notes chantier</Text>
              <Text style={styles.paragraph}>{fiche.notes_chantier}</Text>
            </View>
          ) : null}
        </View>

        {equipe.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Équipe affectée</Text>

            {equipe.map((item, index) => (
              <View
                key={item.id}
                style={[
                  styles.element,
                  index === equipe.length - 1 ? styles.elementLast : {},
                ]}
                wrap={false}
              >
                <Text style={styles.elementTitle}>
                  {texte(item.salarie_nom, "Salarié")}
                </Text>

                <Text style={styles.muted}>
                  Rôle : {texte(item.role_chantier)} · Prévu :{" "}
                  {formatHeure(item.heure_arrivee_prevue)} →{" "}
                  {formatHeure(item.heure_depart_prevue)} · Réel :{" "}
                  {formatHeure(item.heure_arrivee_reelle)} →{" "}
                  {formatHeure(item.heure_depart_reelle)}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        <BlocElements
          titre="Travaux réalisés / prévus"
          elements={travaux}
          fallback={fiche.travaux_prevus}
        />

        <BlocElements
          titre="Matériel / matériaux prévus"
          elements={materiel}
          fallback={fiche.materiel_prevu}
        />

        <BlocElements
          titre="Consignes chantier / sécurité"
          elements={consignes}
          fallback={fiche.consignes_securite}
        />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Réserves et commentaires</Text>

          <Text style={styles.label}>Client présent</Text>
          <Text style={styles.value}>
            {pv.client_present ? "Oui" : "Non"}
          </Text>

          <Text style={styles.label}>Réserves</Text>
          <Text style={styles.paragraph}>{texte(valeurReserves)}</Text>

          <Text style={[styles.label, { marginTop: 7 }]}>
            Commentaire client
          </Text>
          <Text style={styles.paragraph}>
            {texte(pv.commentaire_client)}
          </Text>

          <Text style={[styles.label, { marginTop: 7 }]}>
            Commentaire entreprise
          </Text>
          <Text style={styles.paragraph}>
            {texte(pv.commentaire_entreprise)}
          </Text>

          {!pv.chantier_termine && valeurReserves ? (
            <View style={styles.alertBox} wrap={false}>
              <Text style={styles.alertText}>
                Le chantier est indiqué comme non terminé. Les réserves
                renseignées doivent être prises en compte avant clôture
                définitive.
              </Text>
            </View>
          ) : null}
        </View>

        {photos.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Photos chantier</Text>

            <Text style={styles.paragraph}>
              {photos.length} photo(s) enregistrée(s) sur la fiche.
              {photos.length > photosAffichables.length
                ? ` Les ${photosAffichables.length} premières photos disponibles sont affichées dans ce document.`
                : ""}
            </Text>

            {photosAffichables.length > 0 ? (
              <View style={[styles.photoGrid, { marginTop: 8 }]}>
                {photosAffichables.map((photo) => (
                  <View key={photo.id} style={styles.photoCard} wrap={false}>
                    {photo.signed_url ? (
                      <Image src={photo.signed_url} style={styles.photoImage} />
                    ) : null}

                    <Text style={styles.elementTitle}>
                      {photosCategorieLabel(photo.categorie)}
                    </Text>

                    {photo.commentaire ? (
                      <Text style={styles.muted}>{photo.commentaire}</Text>
                    ) : null}

                    {photo.created_at ? (
                      <Text style={[styles.muted, { marginTop: 3 }]}>
                        Ajoutée le {formatDateHeure(photo.created_at)}
                      </Text>
                    ) : null}
                  </View>
                ))}
              </View>
            ) : (
              <Text style={[styles.muted, { marginTop: 6 }]}>
                Les photos sont enregistrées, mais aucun aperçu temporaire
                n’était disponible lors de la génération du PDF.
              </Text>
            )}
          </View>
        ) : null}

        <View style={styles.section} wrap={false}>
          <Text style={styles.sectionTitle}>Signatures</Text>

          <View style={styles.signatureRow}>
            <View style={[styles.signatureBox, styles.signatureBoxLeft]}>
              <Text style={styles.signatureTitle}>Client</Text>

              <Text style={styles.muted}>
                Nom : {texte(nomSignataireClient(pv))}
              </Text>

              {valeurSignatureClient ? (
                <Image
                  src={valeurSignatureClient}
                  style={styles.signatureImage}
                />
              ) : (
                <Text style={[styles.muted, { marginTop: 12 }]}>
                  Signature non renseignée
                </Text>
              )}

              <Text style={styles.muted}>
                Enregistrée le : {formatDateHeure(dateSignatureClient(pv))}
              </Text>
            </View>

            <View style={styles.signatureBox}>
              <Text style={styles.signatureTitle}>Entreprise</Text>

              <Text style={styles.muted}>
                Nom : {texte(nomSignataireEntreprise(pv))}
              </Text>

              {valeurSignatureEntreprise ? (
                <Image
                  src={valeurSignatureEntreprise}
                  style={styles.signatureImage}
                />
              ) : (
                <Text style={[styles.muted, { marginTop: 12 }]}>
                  Signature non renseignée
                </Text>
              )}

              <Text style={styles.muted}>
                Enregistrée le :{" "}
                {formatDateHeure(dateSignatureEntreprise(pv))}
              </Text>
            </View>
          </View>
        </View>

        {entreprise?.mentions_legales ||
        entreprise?.assurance_professionnelle ? (
          <View style={styles.legalBlock}>
            {entreprise?.assurance_professionnelle ? (
              <Text style={styles.muted}>
                Assurance professionnelle :{" "}
                {entreprise.assurance_professionnelle}
              </Text>
            ) : null}

            {entreprise?.mentions_legales ? (
              <Text style={[styles.muted, { marginTop: 3 }]}>
                {entreprise.mentions_legales}
              </Text>
            ) : null}
          </View>
        ) : null}

        <Text
          fixed
          style={styles.footer}
          render={({ pageNumber, totalPages }) =>
            `${texte(
              entreprise?.nom_entreprise,
              "Entreprise"
            )} · PV généré par Arboboard · Page ${pageNumber}/${totalPages}`
          }
        />
      </Page>
    </Document>
  );
}