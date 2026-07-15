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
  client_email?: string | null;
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
   * Colonnes conservées pour les anciens enregistrements.
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

const NOMBRE_MAX_PHOTOS_PDF = 6;

const styles = StyleSheet.create({
  page: {
    paddingTop: 28,
    paddingRight: 32,
    paddingBottom: 52,
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
    marginBottom: 15,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#d1d5db",
    paddingBottom: 14,
    marginBottom: 12,
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
    height: 56,
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
    fontSize: 8.4,
    lineHeight: 1.4,
    color: "#475569",
  },

  titleBlock: {
    textAlign: "right",
    alignItems: "flex-end",
  },

  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#064e3b",
  },

  subtitle: {
    marginTop: 4,
    fontSize: 8.8,
    color: "#64748b",
  },

  statusBadge: {
    marginTop: 9,
    paddingVertical: 6,
    paddingHorizontal: 9,
    borderRadius: 6,
    fontSize: 8.6,
    fontWeight: "bold",
    textAlign: "center",
  },

  badgeOk: {
    backgroundColor: "#dcfce7",
    color: "#166534",
  },

  badgeWarning: {
    backgroundColor: "#fef3c7",
    color: "#92400e",
  },

  badgeDanger: {
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

  sectionHeader: {
    marginBottom: 8,
  },

  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#064e3b",
  },

  sectionSubtitle: {
    marginTop: 2,
    fontSize: 8,
    lineHeight: 1.35,
    color: "#64748b",
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

  infoCard: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 7,
    backgroundColor: "#f8fafc",
    padding: 8,
    marginBottom: 7,
  },

  label: {
    fontSize: 7.3,
    color: "#64748b",
    textTransform: "uppercase",
    marginBottom: 2,
  },

  value: {
    fontSize: 9.4,
    color: "#0f172a",
    lineHeight: 1.35,
  },

  valueSpacing: {
    marginBottom: 7,
  },

  paragraph: {
    fontSize: 9.3,
    lineHeight: 1.45,
    color: "#334155",
  },

  element: {
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingBottom: 6,
    marginBottom: 6,
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
    fontSize: 8.3,
    lineHeight: 1.35,
    color: "#64748b",
  },

  commentBox: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 5,
    backgroundColor: "#f8fafc",
    padding: 6,
  },

  warningBox: {
    marginTop: 7,
    borderWidth: 1,
    borderColor: "#fcd34d",
    borderRadius: 7,
    backgroundColor: "#fffbeb",
    padding: 8,
  },

  warningText: {
    fontSize: 9,
    lineHeight: 1.4,
    color: "#92400e",
  },

  dangerBox: {
    marginTop: 7,
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 7,
    backgroundColor: "#fef2f2",
    padding: 8,
  },

  dangerText: {
    fontSize: 9,
    lineHeight: 1.4,
    color: "#991b1b",
  },

  confirmationBox: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#bbf7d0",
    borderRadius: 7,
    backgroundColor: "#f0fdf4",
    padding: 8,
  },

  confirmationText: {
    fontSize: 8.7,
    lineHeight: 1.45,
    color: "#166534",
  },

  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
  },

  photoCard: {
    width: "48%",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    padding: 6,
    marginRight: "4%",
    marginBottom: 8,
  },

  photoCardRight: {
    marginRight: 0,
  },

  photoImage: {
    width: "100%",
    height: 104,
    objectFit: "cover",
    borderRadius: 5,
    marginBottom: 5,
  },

  photoMeta: {
    marginTop: 2,
    fontSize: 7.6,
    lineHeight: 1.3,
    color: "#64748b",
  },

  signatureRow: {
    flexDirection: "row",
    marginTop: 4,
  },

  signatureBox: {
    width: "48%",
    minHeight: 122,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 9,
    padding: 9,
  },

  signatureBoxLeft: {
    marginRight: "4%",
  },

  signatureBoxFull: {
    width: "100%",
    minHeight: 122,
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

  signatureAbsent: {
    marginTop: 12,
    marginBottom: 12,
    padding: 8,
    borderRadius: 6,
    backgroundColor: "#f1f5f9",
    fontSize: 8.5,
    lineHeight: 1.4,
    color: "#475569",
    textAlign: "center",
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
    fontSize: 7.4,
    color: "#64748b",
    textAlign: "center",
  },
});

function texte(
  valeur?: string | null,
  defaut = "—"
) {
  const propre = String(
    valeur ?? ""
  ).trim();

  return propre || defaut;
}

function formatDate(
  date?: string | null
) {
  if (!date) return "—";

  try {
    const valeur = date.includes("T")
      ? date.slice(0, 10)
      : date;

    return new Intl.DateTimeFormat(
      "fr-FR",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }
    ).format(
      new Date(
        `${valeur}T00:00:00`
      )
    );
  } catch {
    return "—";
  }
}

function formatDateHeure(
  date?: string | null
) {
  if (!date) return "—";

  try {
    return new Intl.DateTimeFormat(
      "fr-FR",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    ).format(new Date(date));
  } catch {
    return "—";
  }
}

function formatHeure(
  heure?: string | null
) {
  if (!heure) return "—";

  return heure.slice(0, 5);
}

function formatQuantite(
  valeur:
    | number
    | null
    | undefined
) {
  const nombre = Number(
    valeur ?? 0
  );

  return new Intl.NumberFormat(
    "fr-FR",
    {
      maximumFractionDigits: 2,
    }
  ).format(nombre);
}

function adresseEntreprise(
  entreprise:
    | ParametresEntreprisePv
    | null
) {
  return [
    entreprise?.adresse,
    [
      entreprise?.code_postal,
      entreprise?.ville,
    ]
      .filter(Boolean)
      .join(" "),
  ]
    .filter(Boolean)
    .join(", ");
}

function adresseChantier(
  fiche: FichePvPdf
) {
  const adresse =
    fiche.adresse_chantier ||
    fiche.adresse;

  const cp =
    fiche.code_postal_chantier ||
    fiche.code_postal;

  const ville =
    fiche.ville_chantier ||
    fiche.ville;

  return [
    adresse,
    [cp, ville]
      .filter(Boolean)
      .join(" "),
  ]
    .filter(Boolean)
    .join(", ");
}

function elementsCategorie(
  elements:
    ElementFichePv[],
  categorie: string
) {
  return elements.filter(
    (element) =>
      element.categorie ===
      categorie
  );
}

function photosCategorieLabel(
  categorie?: string | null
) {
  if (categorie === "avant") {
    return "Avant chantier";
  }

  if (categorie === "pendant") {
    return "Pendant chantier";
  }

  if (categorie === "apres") {
    return "Après chantier";
  }

  if (categorie === "probleme") {
    return "Problème signalé";
  }

  if (categorie === "signature") {
    return "Signature";
  }

  return "Autre";
}

function reservesPv(
  pv: PvFinChantierPdf
) {
  return (
    pv.reserves ||
    pv.reserves_client ||
    null
  );
}

function nomSignataireClient(
  pv: PvFinChantierPdf
) {
  return (
    pv.signataire_client_nom ||
    pv.nom_signataire_client ||
    null
  );
}

function signatureClient(
  pv: PvFinChantierPdf
) {
  return (
    pv.signature_client ||
    pv.signature_client_data_url ||
    null
  );
}

function nomSignataireEntreprise(
  pv: PvFinChantierPdf
) {
  return (
    pv.signataire_entreprise_nom ||
    pv.nom_signataire_entreprise ||
    null
  );
}

function signatureEntreprise(
  pv: PvFinChantierPdf
) {
  return (
    pv.signature_entreprise ||
    pv.signature_entreprise_data_url ||
    null
  );
}

function dateSignatureClient(
  pv: PvFinChantierPdf
) {
  return (
    pv.signe_client_at ||
    pv.updated_at ||
    pv.created_at
  );
}

function dateSignatureEntreprise(
  pv: PvFinChantierPdf
) {
  return (
    pv.signe_entreprise_at ||
    pv.updated_at ||
    pv.created_at
  );
}

function SectionHeader({
  titre,
  description,
}: {
  titre: string;
  description?: string;
}) {
  return (
    <View
      style={styles.sectionHeader}
      minPresenceAhead={40}
    >
      <Text style={styles.sectionTitle}>
        {titre}
      </Text>

      {description ? (
        <Text style={styles.sectionSubtitle}>
          {description}
        </Text>
      ) : null}
    </View>
  );
}

function BlocElements({
  titre,
  description,
  elements,
  fallback,
}: {
  titre: string;
  description: string;
  elements: ElementFichePv[];
  fallback?: string | null;
}) {
  if (
    elements.length === 0 &&
    !fallback
  ) {
    return null;
  }

  return (
    <View style={styles.section}>
      <SectionHeader
        titre={titre}
        description={description}
      />

      {elements.length > 0 ? (
        elements.map(
          (element, index) => {
            const quantitePrevue =
              Number(
                element.quantite_prevue ??
                  1
              );

            const quantiteReelle =
              element.quantite_reelle;

            return (
              <View
                key={element.id}
                style={[
                  styles.element,
                  index ===
                  elements.length - 1
                    ? styles.elementLast
                    : {},
                ]}
                wrap={false}
              >
                <Text
                  style={
                    styles.elementTitle
                  }
                >
                  {element.nom}
                </Text>

                <Text style={styles.muted}>
                  Prévu :{" "}
                  {formatQuantite(
                    quantitePrevue
                  )}{" "}
                  {element.unite || "u"}
                  {quantiteReelle !==
                    null &&
                  quantiteReelle !==
                    undefined
                    ? ` · Réel : ${formatQuantite(
                        quantiteReelle
                      )} ${
                        element.unite ||
                        "u"
                      }`
                    : ""}
                </Text>

                {element.commentaire_chef ? (
                  <View
                    style={
                      styles.commentBox
                    }
                  >
                    <Text
                      style={
                        styles.muted
                      }
                    >
                      Consigne entreprise
                    </Text>
                    <Text
                      style={
                        styles.paragraph
                      }
                    >
                      {
                        element.commentaire_chef
                      }
                    </Text>
                  </View>
                ) : null}

                {element.commentaire_salarie ? (
                  <View
                    style={
                      styles.commentBox
                    }
                  >
                    <Text
                      style={
                        styles.muted
                      }
                    >
                      Retour terrain
                    </Text>
                    <Text
                      style={
                        styles.paragraph
                      }
                    >
                      {
                        element.commentaire_salarie
                      }
                    </Text>
                  </View>
                ) : null}
              </View>
            );
          }
        )
      ) : (
        <Text style={styles.paragraph}>
          {fallback}
        </Text>
      )}
    </View>
  );
}

function BlocSignature({
  titre,
  nom,
  signature,
  date,
  clientAbsent = false,
  pleineLargeur = false,
  gauche = false,
}: {
  titre: string;
  nom?: string | null;
  signature?: string | null;
  date?: string | null;
  clientAbsent?: boolean;
  pleineLargeur?: boolean;
  gauche?: boolean;
}) {
  return (
    <View
      style={[
        styles.signatureBox,
        gauche
          ? styles.signatureBoxLeft
          : {},
        pleineLargeur
          ? styles.signatureBoxFull
          : {},
      ]}
      wrap={false}
    >
      <Text style={styles.signatureTitle}>
        {titre}
      </Text>

      <Text style={styles.muted}>
        Nom : {texte(nom)}
      </Text>

      {clientAbsent ? (
        <Text style={styles.signatureAbsent}>
          Client absent lors de la
          réception. Signature client non
          requise.
        </Text>
      ) : signature ? (
        <Image
          src={signature}
          style={styles.signatureImage}
        />
      ) : (
        <Text style={styles.signatureAbsent}>
          Signature non renseignée
        </Text>
      )}

      <Text style={styles.muted}>
        Enregistrée le :{" "}
        {formatDateHeure(date)}
      </Text>
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
  const dateFiche =
    fiche.date_prevue ||
    fiche.date_intervention;

  const clientPresent =
    pv.client_present !== false;

  const chantierTermine =
    pv.chantier_termine !== false;

  const travaux =
    elementsCategorie(
      elements,
      "travaux"
    );

  const materiel = [
    ...elementsCategorie(
      elements,
      "materiel"
    ),
    ...elementsCategorie(
      elements,
      "materiaux"
    ),
  ];

  const consignes = [
    ...elementsCategorie(
      elements,
      "consigne_securite"
    ),
    ...elementsCategorie(
      elements,
      "consigne_chantier"
    ),
  ];

  const photosAffichables =
    photos
      .filter((photo) =>
        Boolean(photo.signed_url)
      )
      .slice(
        0,
        NOMBRE_MAX_PHOTOS_PDF
      );

  const valeurReserves =
    reservesPv(pv);

  const receptionAvecReserves =
    Boolean(
      texte(
        valeurReserves,
        ""
      )
    );

  const valeurSignatureClient =
    signatureClient(pv);

  const valeurSignatureEntreprise =
    signatureEntreprise(pv);

  const statutReception =
    !chantierTermine
      ? "CHANTIER NON TERMINÉ — RÉSERVES À LEVER"
      : receptionAvecReserves
        ? "CHANTIER TERMINÉ AVEC RÉSERVES"
        : "CHANTIER TERMINÉ SANS RÉSERVE";

  const styleStatut =
    !chantierTermine
      ? styles.badgeDanger
      : receptionAvecReserves
        ? styles.badgeWarning
        : styles.badgeOk;

  return (
    <Document
      title={`PV de fin de chantier ${texte(
        fiche.numero ||
          fiche.id,
        ""
      )}`}
      author={texte(
        entreprise?.nom_entreprise,
        "Arboboard"
      )}
      subject={texte(
        fiche.titre,
        "PV de fin de chantier"
      )}
      creator="Arboboard"
      producer="Arboboard"
    >
      <Page
        size="A4"
        style={styles.page}
        wrap
      >
        <View style={styles.topBar} />

        <View
          style={styles.header}
          wrap={false}
        >
          <View
            style={
              styles.companyColumn
            }
          >
            {entreprise?.logo_url ? (
              <Image
                src={
                  entreprise.logo_url
                }
                style={styles.logo}
              />
            ) : null}

            <Text
              style={
                styles.companyName
              }
            >
              {texte(
                entreprise?.nom_entreprise,
                "Entreprise"
              )}
            </Text>

            {adresseEntreprise(
              entreprise
            ) ? (
              <Text
                style={
                  styles.companyLine
                }
              >
                {adresseEntreprise(
                  entreprise
                )}
              </Text>
            ) : null}

            {entreprise?.telephone ||
            entreprise?.email ? (
              <Text
                style={
                  styles.companyLine
                }
              >
                {entreprise?.telephone
                  ? `Tél. : ${entreprise.telephone}`
                  : ""}
                {entreprise?.telephone &&
                entreprise?.email
                  ? " · "
                  : ""}
                {entreprise?.email
                  ? `Email : ${entreprise.email}`
                  : ""}
              </Text>
            ) : null}

            {entreprise?.siret ? (
              <Text
                style={
                  styles.companyLine
                }
              >
                SIRET :{" "}
                {entreprise.siret}
              </Text>
            ) : null}

            {entreprise?.forme_juridique ? (
              <Text
                style={
                  styles.companyLine
                }
              >
                Forme juridique :{" "}
                {
                  entreprise.forme_juridique
                }
              </Text>
            ) : null}
          </View>

          <View
            style={[
              styles.documentColumn,
              styles.titleBlock,
            ]}
          >
            <Text style={styles.title}>
              PV de fin de chantier
            </Text>

            <Text
              style={styles.subtitle}
            >
              Fiche :{" "}
              {texte(
                fiche.numero ||
                  fiche.id
              )}
            </Text>

            <Text
              style={styles.subtitle}
            >
              Date d’intervention :{" "}
              {formatDate(dateFiche)}
            </Text>

            <Text
              style={[
                styles.statusBadge,
                styleStatut,
              ]}
            >
              {statutReception}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <SectionHeader
            titre="Informations chantier"
            description="Identification du client, du lieu et des horaires de l’intervention."
          />

          <View style={styles.row}>
            <View
              style={[
                styles.col,
                styles.colLeft,
              ]}
            >
              <View
                style={styles.infoCard}
                wrap={false}
              >
                <Text
                  style={styles.label}
                >
                  Client
                </Text>
                <Text
                  style={styles.value}
                >
                  {texte(
                    fiche.client_nom
                  )}
                </Text>

                {pv.client_email ? (
                  <>
                    <Text
                      style={[
                        styles.label,
                        {
                          marginTop: 6,
                        },
                      ]}
                    >
                      Email client
                    </Text>
                    <Text
                      style={styles.value}
                    >
                      {pv.client_email}
                    </Text>
                  </>
                ) : null}
              </View>

              <Text style={styles.label}>
                Titre intervention
              </Text>
              <Text
                style={[
                  styles.value,
                  styles.valueSpacing,
                ]}
              >
                {texte(fiche.titre)}
              </Text>

              <Text style={styles.label}>
                Type d’intervention
              </Text>
              <Text style={styles.value}>
                {texte(
                  fiche.type_intervention
                )}
              </Text>
            </View>

            <View
              style={[
                styles.col,
                styles.colRight,
              ]}
            >
              <Text style={styles.label}>
                Adresse chantier
              </Text>
              <Text
                style={[
                  styles.value,
                  styles.valueSpacing,
                ]}
              >
                {texte(
                  adresseChantier(fiche)
                )}
              </Text>

              <Text style={styles.label}>
                Horaires prévus
              </Text>
              <Text
                style={[
                  styles.value,
                  styles.valueSpacing,
                ]}
              >
                {formatHeure(
                  fiche.heure_debut_prevue
                )}{" "}
                →{" "}
                {formatHeure(
                  fiche.heure_fin_prevue
                )}
              </Text>

              <Text style={styles.label}>
                Horaires réels
              </Text>
              <Text style={styles.value}>
                {formatHeure(
                  fiche.heure_debut_reelle
                )}{" "}
                →{" "}
                {formatHeure(
                  fiche.heure_fin_reelle
                )}
              </Text>
            </View>
          </View>

          {fiche.notes_chantier ? (
            <View
              style={{
                marginTop: 7,
              }}
              wrap={false}
            >
              <Text style={styles.label}>
                Notes chantier
              </Text>
              <Text
                style={styles.paragraph}
              >
                {fiche.notes_chantier}
              </Text>
            </View>
          ) : null}
        </View>

        {equipe.length > 0 ? (
          <View style={styles.section}>
            <SectionHeader
              titre="Équipe affectée"
              description={`${equipe.length} intervenant(s) enregistré(s) sur la fiche.`}
            />

            {equipe.map(
              (item, index) => (
                <View
                  key={item.id}
                  style={[
                    styles.element,
                    index ===
                    equipe.length - 1
                      ? styles.elementLast
                      : {},
                  ]}
                  wrap={false}
                >
                  <Text
                    style={
                      styles.elementTitle
                    }
                  >
                    {texte(
                      item.salarie_nom,
                      "Salarié"
                    )}
                  </Text>

                  <Text
                    style={styles.muted}
                  >
                    Rôle :{" "}
                    {texte(
                      item.role_chantier
                    )}{" "}
                    · Prévu :{" "}
                    {formatHeure(
                      item.heure_arrivee_prevue
                    )}{" "}
                    →{" "}
                    {formatHeure(
                      item.heure_depart_prevue
                    )}{" "}
                    · Réel :{" "}
                    {formatHeure(
                      item.heure_arrivee_reelle
                    )}{" "}
                    →{" "}
                    {formatHeure(
                      item.heure_depart_reelle
                    )}
                  </Text>
                </View>
              )
            )}
          </View>
        ) : null}

        <BlocElements
          titre="Travaux réalisés ou prévus"
          description="Prestations et tâches rattachées à la fiche d’intervention."
          elements={travaux}
          fallback={
            fiche.travaux_prevus
          }
        />

        <BlocElements
          titre="Matériel et matériaux"
          description="Machines, outils, équipements et fournitures prévus pour le chantier."
          elements={materiel}
          fallback={
            fiche.materiel_prevu
          }
        />

        <BlocElements
          titre="Consignes chantier et sécurité"
          description="Consignes internes, accès, balisage et mesures de sécurité."
          elements={consignes}
          fallback={
            fiche.consignes_securite
          }
        />

        <View style={styles.section}>
          <SectionHeader
            titre="Réception des travaux"
            description="État déclaré du chantier, réserves et observations des parties."
          />

          <View style={styles.row}>
            <View
              style={[
                styles.col,
                styles.colLeft,
              ]}
            >
              <Text style={styles.label}>
                Client présent
              </Text>
              <Text
                style={[
                  styles.value,
                  styles.valueSpacing,
                ]}
              >
                {clientPresent
                  ? "Oui"
                  : "Non"}
              </Text>

              <Text style={styles.label}>
                Chantier terminé
              </Text>
              <Text style={styles.value}>
                {chantierTermine
                  ? "Oui"
                  : "Non"}
              </Text>
            </View>

            <View
              style={[
                styles.col,
                styles.colRight,
              ]}
            >
              <Text style={styles.label}>
                Réception
              </Text>
              <Text
                style={[
                  styles.value,
                  styles.valueSpacing,
                ]}
              >
                {receptionAvecReserves
                  ? "Avec réserves"
                  : "Sans réserve"}
              </Text>

              <Text style={styles.label}>
                Dernière mise à jour
              </Text>
              <Text style={styles.value}>
                {formatDateHeure(
                  pv.updated_at ||
                    pv.created_at
                )}
              </Text>
            </View>
          </View>

          {receptionAvecReserves ? (
            <View
              style={
                chantierTermine
                  ? styles.warningBox
                  : styles.dangerBox
              }
              wrap={false}
            >
              <Text
                style={
                  chantierTermine
                    ? styles.warningText
                    : styles.dangerText
                }
              >
                Réserves :{" "}
                {texte(
                  valeurReserves
                )}
              </Text>
            </View>
          ) : (
            <View
              style={
                styles.confirmationBox
              }
              wrap={false}
            >
              <Text
                style={
                  styles.confirmationText
                }
              >
                Le chantier est déclaré
                réceptionné sans réserve.
              </Text>
            </View>
          )}

          {pv.commentaire_client ? (
            <View
              style={{
                marginTop: 8,
              }}
              wrap={false}
            >
              <Text style={styles.label}>
                Commentaire client
              </Text>
              <Text
                style={styles.paragraph}
              >
                {
                  pv.commentaire_client
                }
              </Text>
            </View>
          ) : null}

          {pv.commentaire_entreprise ? (
            <View
              style={{
                marginTop: 8,
              }}
              wrap={false}
            >
              <Text style={styles.label}>
                Commentaire entreprise
              </Text>
              <Text
                style={styles.paragraph}
              >
                {
                  pv.commentaire_entreprise
                }
              </Text>
            </View>
          ) : null}

          {!clientPresent ? (
            <View
              style={styles.warningBox}
              wrap={false}
            >
              <Text
                style={
                  styles.warningText
                }
              >
                Le client était absent
                lors de la réception. Le
                document est établi par
                l’entreprise et peut être
                transmis au client par
                voie électronique.
              </Text>
            </View>
          ) : (
            <View
              style={
                styles.confirmationBox
              }
              wrap={false}
            >
              <Text
                style={
                  styles.confirmationText
                }
              >
                La signature du client
                atteste de la réception
                du chantier sous réserve
                des éventuelles
                observations indiquées
                dans le présent document.
              </Text>
            </View>
          )}
        </View>

        {photos.length > 0 ? (
          <View style={styles.section}>
            <SectionHeader
              titre="Photos du chantier"
              description={`${photos.length} photo(s) enregistrée(s). Le PDF affiche au maximum ${NOMBRE_MAX_PHOTOS_PDF} aperçus pour limiter la taille du document.`}
            />

            {photosAffichables.length >
            0 ? (
              <View
                style={
                  styles.photoGrid
                }
              >
                {photosAffichables.map(
                  (
                    photo,
                    index
                  ) => (
                    <View
                      key={photo.id}
                      style={[
                        styles.photoCard,
                        index % 2 === 1
                          ? styles.photoCardRight
                          : {},
                      ]}
                      wrap={false}
                    >
                      {photo.signed_url ? (
                        <Image
                          src={
                            photo.signed_url
                          }
                          style={
                            styles.photoImage
                          }
                        />
                      ) : null}

                      <Text
                        style={
                          styles.elementTitle
                        }
                      >
                        {photosCategorieLabel(
                          photo.categorie
                        )}
                      </Text>

                      {photo.commentaire ? (
                        <Text
                          style={
                            styles.muted
                          }
                        >
                          {
                            photo.commentaire
                          }
                        </Text>
                      ) : null}

                      {photo.created_at ? (
                        <Text
                          style={
                            styles.photoMeta
                          }
                        >
                          Ajoutée le{" "}
                          {formatDateHeure(
                            photo.created_at
                          )}
                        </Text>
                      ) : null}
                    </View>
                  )
                )}
              </View>
            ) : (
              <Text
                style={styles.muted}
              >
                Les photos sont
                enregistrées, mais aucun
                aperçu temporaire n’était
                disponible lors de la
                génération du PDF.
              </Text>
            )}

            {photos.length >
            photosAffichables.length ? (
              <Text
                style={[
                  styles.muted,
                  {
                    marginTop: 3,
                  },
                ]}
              >
                {photos.length -
                  photosAffichables.length}{" "}
                photo(s) supplémentaire(s)
                restent consultables dans
                la fiche d’intervention
                Arboboard.
              </Text>
            ) : null}
          </View>
        ) : null}

        <View
          style={styles.section}
          wrap={false}
        >
          <SectionHeader
            titre="Signatures"
            description="Signatures enregistrées lors de la réception du chantier."
          />

          {clientPresent ? (
            <View
              style={
                styles.signatureRow
              }
            >
              <BlocSignature
                titre="Client"
                nom={nomSignataireClient(
                  pv
                )}
                signature={
                  valeurSignatureClient
                }
                date={dateSignatureClient(
                  pv
                )}
                gauche
              />

              <BlocSignature
                titre="Entreprise"
                nom={nomSignataireEntreprise(
                  pv
                )}
                signature={
                  valeurSignatureEntreprise
                }
                date={dateSignatureEntreprise(
                  pv
                )}
              />
            </View>
          ) : (
            <View
              style={
                styles.signatureRow
              }
            >
              <BlocSignature
                titre="Entreprise"
                nom={nomSignataireEntreprise(
                  pv
                )}
                signature={
                  valeurSignatureEntreprise
                }
                date={dateSignatureEntreprise(
                  pv
                )}
                pleineLargeur
              />
            </View>
          )}
        </View>

        {!clientPresent ? (
          <View
            style={styles.section}
            wrap={false}
          >
            <SectionHeader
              titre="Constat d’absence du client"
              description="Information conservée dans le procès-verbal."
            />

            <Text
              style={styles.paragraph}
            >
              Le client n’était pas présent
              lors de la réception du
              chantier. Aucune signature
              client n’était donc requise au
              moment de l’établissement du
              présent document.
            </Text>
          </View>
        ) : null}

        {entreprise
          ?.mentions_legales ||
        entreprise
          ?.assurance_professionnelle ? (
          <View
            style={styles.legalBlock}
          >
            {entreprise
              ?.assurance_professionnelle ? (
              <Text
                style={styles.muted}
              >
                Assurance professionnelle :{" "}
                {
                  entreprise.assurance_professionnelle
                }
              </Text>
            ) : null}

            {entreprise
              ?.mentions_legales ? (
              <Text
                style={[
                  styles.muted,
                  {
                    marginTop: 3,
                  },
                ]}
              >
                {
                  entreprise.mentions_legales
                }
              </Text>
            ) : null}
          </View>
        ) : null}

        <Text
          fixed
          style={styles.footer}
          render={({
            pageNumber,
            totalPages,
          }) =>
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