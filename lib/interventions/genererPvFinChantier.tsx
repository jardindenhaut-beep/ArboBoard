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
  reserves_client: string | null;
  commentaire_client: string | null;
  commentaire_entreprise: string | null;
  nom_signataire_client: string | null;
  signature_client_data_url: string | null;
  signe_client_at: string | null;
  nom_signataire_entreprise: string | null;
  signature_entreprise_data_url: string | null;
  signe_entreprise_at: string | null;
  created_at: string | null;
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
    padding: 32,
    fontSize: 10,
    color: "#0f172a",
    backgroundColor: "#ffffff",
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: "#d1d5db",
    paddingBottom: 14,
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  logo: {
    width: 90,
    maxHeight: 70,
    objectFit: "contain",
    marginBottom: 8,
  },
  companyName: {
    fontSize: 16,
    fontWeight: 700,
    color: "#064e3b",
  },
  muted: {
    color: "#64748b",
  },
  titleBlock: {
    textAlign: "right",
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    color: "#064e3b",
  },
  subtitle: {
    marginTop: 4,
    fontSize: 10,
    color: "#64748b",
  },
  badgeOk: {
    marginTop: 8,
    padding: 6,
    borderRadius: 6,
    backgroundColor: "#dcfce7",
    color: "#166534",
    fontWeight: 700,
  },
  badgeWarning: {
    marginTop: 8,
    padding: 6,
    borderRadius: 6,
    backgroundColor: "#fee2e2",
    color: "#991b1b",
    fontWeight: 700,
  },
  section: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    padding: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 700,
    marginBottom: 8,
    color: "#064e3b",
  },
  row: {
    flexDirection: "row",
    gap: 10,
  },
  col: {
    flex: 1,
  },
  label: {
    fontSize: 8,
    color: "#64748b",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  value: {
    fontSize: 10,
    color: "#0f172a",
    marginBottom: 6,
  },
  paragraph: {
    fontSize: 10,
    lineHeight: 1.45,
    color: "#334155",
  },
  element: {
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingBottom: 5,
    marginBottom: 5,
  },
  elementTitle: {
    fontWeight: 700,
    color: "#0f172a",
  },
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  photoCard: {
    width: "48%",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    padding: 6,
    marginBottom: 8,
  },
  photoImage: {
    width: "100%",
    height: 115,
    objectFit: "cover",
    borderRadius: 6,
    marginBottom: 5,
  },
  signatureRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },
  signatureBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    padding: 10,
    minHeight: 120,
  },
  signatureTitle: {
    fontSize: 11,
    fontWeight: 700,
    marginBottom: 6,
  },
  signatureImage: {
    width: "100%",
    height: 60,
    objectFit: "contain",
    marginVertical: 6,
  },
  footer: {
    position: "absolute",
    left: 32,
    right: 32,
    bottom: 20,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 8,
    fontSize: 8,
    color: "#64748b",
    textAlign: "center",
  },
});

function texte(valeur?: string | null, defaut = "—") {
  const propre = String(valeur || "").trim();
  return propre || defaut;
}

function formatDate(date?: string | null) {
  if (!date) return "—";

  try {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(`${date.slice(0, 10)}T00:00:00`));
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
        elements.map((element) => (
          <View key={element.id} style={styles.element}>
            <Text style={styles.elementTitle}>
              {texte(element.icone, "")} {element.nom}
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

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.col}>
            {entreprise?.logo_url ? (
              <Image src={entreprise.logo_url} style={styles.logo} />
            ) : null}

            <Text style={styles.companyName}>
              {texte(entreprise?.nom_entreprise, "Entreprise")}
            </Text>

            <Text style={styles.muted}>{texte(adresseEntreprise(entreprise))}</Text>
            <Text style={styles.muted}>
              Tél : {texte(entreprise?.telephone)} · Email :{" "}
              {texte(entreprise?.email)}
            </Text>

            {entreprise?.siret ? (
              <Text style={styles.muted}>SIRET : {entreprise.siret}</Text>
            ) : null}
          </View>

          <View style={styles.titleBlock}>
            <Text style={styles.title}>PV de fin de chantier</Text>
            <Text style={styles.subtitle}>
              Fiche : {texte(fiche.numero || fiche.id)}
            </Text>
            <Text style={styles.subtitle}>Date : {formatDate(dateFiche)}</Text>

            <Text style={pv.chantier_termine ? styles.badgeOk : styles.badgeWarning}>
              {pv.chantier_termine ? "CHANTIER TERMINÉ" : "CHANTIER NON TERMINÉ"}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations chantier</Text>

          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>Client</Text>
              <Text style={styles.value}>{texte(fiche.client_nom)}</Text>

              <Text style={styles.label}>Titre intervention</Text>
              <Text style={styles.value}>{texte(fiche.titre)}</Text>

              <Text style={styles.label}>Type intervention</Text>
              <Text style={styles.value}>{texte(fiche.type_intervention)}</Text>
            </View>

            <View style={styles.col}>
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
            <>
              <Text style={styles.label}>Notes chantier</Text>
              <Text style={styles.paragraph}>{fiche.notes_chantier}</Text>
            </>
          ) : null}
        </View>

        {equipe.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Équipe affectée</Text>
            {equipe.map((item) => (
              <View key={item.id} style={styles.element}>
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
          <Text style={styles.value}>{pv.client_present ? "Oui" : "Non"}</Text>

          <Text style={styles.label}>Réserves client</Text>
          <Text style={styles.paragraph}>{texte(pv.reserves_client)}</Text>

          <Text style={styles.label}>Commentaire client</Text>
          <Text style={styles.paragraph}>{texte(pv.commentaire_client)}</Text>

          <Text style={styles.label}>Commentaire entreprise</Text>
          <Text style={styles.paragraph}>
            {texte(pv.commentaire_entreprise)}
          </Text>
        </View>

        {photos.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Photos chantier</Text>

            <Text style={styles.paragraph}>
              {photos.length} photo(s) enregistrée(s) sur la fiche.
            </Text>

            {photosAffichables.length > 0 ? (
              <View style={styles.photoGrid}>
                {photosAffichables.map((photo) => (
                  <View key={photo.id} style={styles.photoCard}>
                    {photo.signed_url ? (
                      <Image src={photo.signed_url} style={styles.photoImage} />
                    ) : null}

                    <Text style={styles.elementTitle}>
                      {photosCategorieLabel(photo.categorie)}
                    </Text>

                    {photo.commentaire ? (
                      <Text style={styles.muted}>{photo.commentaire}</Text>
                    ) : null}
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Signatures</Text>

          <View style={styles.signatureRow}>
            <View style={styles.signatureBox}>
              <Text style={styles.signatureTitle}>Client</Text>
              <Text style={styles.muted}>
                Nom : {texte(pv.nom_signataire_client)}
              </Text>

              {pv.signature_client_data_url ? (
                <Image
                  src={pv.signature_client_data_url}
                  style={styles.signatureImage}
                />
              ) : (
                <Text style={styles.muted}>Signature non renseignée</Text>
              )}

              <Text style={styles.muted}>
                Signé le : {formatDateHeure(pv.signe_client_at)}
              </Text>
            </View>

            <View style={styles.signatureBox}>
              <Text style={styles.signatureTitle}>Entreprise</Text>
              <Text style={styles.muted}>
                Nom : {texte(pv.nom_signataire_entreprise)}
              </Text>

              {pv.signature_entreprise_data_url ? (
                <Image
                  src={pv.signature_entreprise_data_url}
                  style={styles.signatureImage}
                />
              ) : (
                <Text style={styles.muted}>Signature non renseignée</Text>
              )}

              <Text style={styles.muted}>
                Signé le : {formatDateHeure(pv.signe_entreprise_at)}
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.footer}>
          {texte(entreprise?.nom_entreprise, "Entreprise")} · PV généré par
          Arboboard
          {entreprise?.assurance_professionnelle
            ? ` · Assurance : ${entreprise.assurance_professionnelle}`
            : ""}
        </Text>
      </Page>
    </Document>
  );
}