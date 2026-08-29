import {
  PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  supabase,
} from "../lib/supabase";

import "./PvFinChantierMobile.css";

/* =========================================================
   CONFIGURATION API
   ========================================================= */

const API_ARBOBOARD =
  String(
    import.meta.env
      .VITE_ARBOBOARD_API_URL ||
      "https://arboboard.fr"
  )
    .trim()
    .replace(
      /\/+$/,
      ""
    );

/* =========================================================
   TYPES
   ========================================================= */

export type PvFinChantierMobileData = {
  id: string;

  entreprise_id:
    string;

  fiche_id:
    string;

  client_id:
    string | null;

  client_nom:
    string | null;

  client_email:
    string | null;

  client_present:
    boolean | null;

  chantier_termine:
    boolean | null;

  reserves:
    string | null;

  commentaire_client:
    string | null;

  commentaire_entreprise:
    string | null;

  signature_client:
    string | null;

  signature_entreprise:
    string | null;

  signataire_client_nom:
    string | null;

  signataire_entreprise_nom:
    string | null;

  envoye_client_at?:
    string | null;

  envoye_client_email?:
    string | null;

  created_at?:
    string | null;

  updated_at?:
    string | null;
};

type Props = {
  entrepriseId:
    string;

  ficheId:
    string;

  clientId?:
    string | null;

  clientNom?:
    string | null;

  clientEmail?:
    string | null;

  signataireEntrepriseNom?:
    string | null;

  lectureSeule?:
    boolean;

  onPvEnregistre?: (
    pv:
      PvFinChantierMobileData
  ) => void;

  salarieId?:
    string | null;

  onFermer?:
    () => void;

  onEnregistre?:
    () => void;
};

type FicheIntervention = {
  id: string;

  numero:
    string | null;

  client_id:
    string | null;

  client_nom:
    string | null;

  titre:
    string | null;

  type_intervention:
    string | null;

  date_prevue:
    string | null;

  date_intervention:
    string | null;

  adresse_chantier:
    string | null;

  code_postal_chantier:
    string | null;

  ville_chantier:
    string | null;

  statut:
    string | null;

  pv_fin_chantier_id:
    string | null;
};

type Salarie = {
  id: string;

  nom:
    string | null;

  prenom:
    string | null;

  email:
    string | null;
};

type SignaturePadProps = {
  titre:
    string;

  sousTitre:
    string;

  valeur:
    string;

  onChange: (
    valeur:
      string
  ) => void;

  disabled?:
    boolean;
};

/* =========================================================
   OUTILS
   ========================================================= */

function messageErreur(
  erreur:
    unknown,
  fallback:
    string
) {
  if (
    erreur instanceof
      Error &&
    erreur.message
  ) {
    return erreur.message;
  }

  if (
    erreur &&
    typeof erreur ===
      "object" &&
    "message" in erreur
  ) {
    const message =
      (
        erreur as {
          message?:
            unknown;
        }
      ).message;

    if (
      typeof message ===
        "string" &&
      message.trim()
    ) {
      return message;
    }
  }

  return fallback;
}

function normaliser(
  valeur:
    string | null | undefined
) {
  return String(
    valeur || ""
  )
    .normalize(
      "NFD"
    )
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .trim()
    .toLowerCase();
}

function interventionTerminee(
  statut:
    string | null | undefined
) {
  const valeur =
    normaliser(
      statut
    );

  return (
    valeur ===
      "terminee" ||
    valeur.includes(
      "termine"
    )
  );
}

function formatDate(
  valeur:
    string | null | undefined
) {
  if (
    !valeur
  ) {
    return "—";
  }

  try {
    return new Intl.DateTimeFormat(
      "fr-FR",
      {
        day:
          "2-digit",

        month:
          "2-digit",

        year:
          "numeric",
      }
    ).format(
      new Date(
        `${valeur.slice(
          0,
          10
        )}T12:00:00`
      )
    );
  } catch {
    return valeur;
  }
}

function formatDateHeure(
  valeur:
    string | null | undefined
) {
  if (
    !valeur
  ) {
    return "—";
  }

  try {
    return new Intl.DateTimeFormat(
      "fr-FR",
      {
        day:
          "2-digit",

        month:
          "2-digit",

        year:
          "numeric",

        hour:
          "2-digit",

        minute:
          "2-digit",
      }
    ).format(
      new Date(
        valeur
      )
    );
  } catch {
    return valeur;
  }
}

function nomSalarie(
  salarie:
    Salarie | null
) {
  if (
    !salarie
  ) {
    return "";
  }

  return (
    `${salarie.prenom || ""} ${
      salarie.nom || ""
    }`.trim() ||
    salarie.email ||
    ""
  );
}

function adresseFiche(
  fiche:
    FicheIntervention | null
) {
  if (
    !fiche
  ) {
    return "—";
  }

  return (
    [
      fiche.adresse_chantier,
      fiche.code_postal_chantier,
      fiche.ville_chantier,
    ]
      .filter(
        Boolean
      )
      .join(
        " "
      ) ||
    "Adresse non renseignée"
  );
}

async function lireErreurResponse(
  response:
    Response
) {
  const typeContenu =
    response.headers.get(
      "content-type"
    ) ||
    "";

  if (
    typeContenu.includes(
      "application/json"
    )
  ) {
    try {
      const resultat =
        await response.json();

      return (
        resultat?.erreur ||
        resultat?.error ||
        resultat?.message ||
        "Impossible de générer le PDF."
      );
    } catch {
      return "Impossible de générer le PDF.";
    }
  }

  try {
    const texte =
      await response.text();

    return (
      texte.trim() ||
      "Impossible de générer le PDF."
    );
  } catch {
    return "Impossible de générer le PDF.";
  }
}

function extraireNomFichier(
  disposition:
    string | null,
  ficheId:
    string
) {
  const nomParDefaut =
    `pv-fin-chantier-${ficheId}.pdf`;

  if (
    !disposition
  ) {
    return nomParDefaut;
  }

  const utf8 =
    disposition.match(
      /filename\*=UTF-8''([^;]+)/i
    )?.[1];

  if (
    utf8
  ) {
    try {
      return decodeURIComponent(
        utf8.replace(
          /["']/g,
          ""
        )
      );
    } catch {
      return utf8.replace(
        /["']/g,
        ""
      );
    }
  }

  const simple =
    disposition.match(
      /filename="([^"]+)"/i
    )?.[1] ||
    disposition.match(
      /filename=([^;]+)/i
    )?.[1];

  return (
    simple
      ?.trim()
      .replace(
        /^["']|["']$/g,
        ""
      ) ||
    nomParDefaut
  );
}

function declencherTelechargement(
  blob:
    Blob,
  nomFichier:
    string
) {
  const url =
    URL.createObjectURL(
      blob
    );

  const lien =
    document.createElement(
      "a"
    );

  lien.href =
    url;

  lien.download =
    nomFichier;

  lien.rel =
    "noopener";

  lien.style.display =
    "none";

  document.body.appendChild(
    lien
  );

  lien.click();

  lien.remove();

  window.setTimeout(
    () => {
      URL.revokeObjectURL(
        url
      );
    },
    10_000
  );
}

/* =========================================================
   SIGNATURE
   ========================================================= */

function SignaturePad({
  titre,
  sousTitre,
  valeur,
  onChange,
  disabled = false,
}: SignaturePadProps) {
  const canvasRef =
    useRef<HTMLCanvasElement | null>(
      null
    );

  const dessinEnCours =
    useRef(
      false
    );

  const dernierPoint =
    useRef<{
      x: number;
      y: number;
    } | null>(
      null
    );

  const preparerCanvas =
    useCallback(
      () => {
        const canvas =
          canvasRef.current;

        if (
          !canvas
        ) {
          return;
        }

        const rect =
          canvas.getBoundingClientRect();

        const ratio =
          Math.max(
            1,
            Math.min(
              window.devicePixelRatio ||
                1,
              3
            )
          );

        const largeur =
          Math.max(
            1,
            Math.floor(
              rect.width *
                ratio
            )
          );

        const hauteur =
          Math.max(
            1,
            Math.floor(
              rect.height *
                ratio
            )
          );

        if (
          canvas.width !==
            largeur ||
          canvas.height !==
            hauteur
        ) {
          canvas.width =
            largeur;

          canvas.height =
            hauteur;
        }

        const contexte =
          canvas.getContext(
            "2d"
          );

        if (
          !contexte
        ) {
          return;
        }

        contexte.setTransform(
          ratio,
          0,
          0,
          ratio,
          0,
          0
        );

        contexte.clearRect(
          0,
          0,
          rect.width,
          rect.height
        );

        contexte.fillStyle =
          "#ffffff";

        contexte.fillRect(
          0,
          0,
          rect.width,
          rect.height
        );

        contexte.lineCap =
          "round";

        contexte.lineJoin =
          "round";

        contexte.lineWidth =
          2.4;

        contexte.strokeStyle =
          "#173b31";

        if (
          valeur
        ) {
          const image =
            new Image();

          image.onload =
            () => {
              const contexteActuel =
                canvas.getContext(
                  "2d"
                );

              if (
                !contexteActuel
              ) {
                return;
              }

              contexteActuel.drawImage(
                image,
                0,
                0,
                rect.width,
                rect.height
              );
            };

          image.src =
            valeur;
        }
      },
      [
        valeur,
      ]
    );

  useEffect(() => {
    preparerCanvas();

    window.addEventListener(
      "resize",
      preparerCanvas
    );

    return () => {
      window.removeEventListener(
        "resize",
        preparerCanvas
      );
    };
  }, [
    preparerCanvas,
  ]);

  function pointDepuisEvenement(
    evenement:
      ReactPointerEvent<HTMLCanvasElement>
  ) {
    const canvas =
      canvasRef.current;

    if (
      !canvas
    ) {
      return {
        x: 0,
        y: 0,
      };
    }

    const rect =
      canvas.getBoundingClientRect();

    return {
      x:
        evenement.clientX -
        rect.left,

      y:
        evenement.clientY -
        rect.top,
    };
  }

  function commencer(
    evenement:
      ReactPointerEvent<HTMLCanvasElement>
  ) {
    if (
      disabled
    ) {
      return;
    }

    evenement.preventDefault();

    evenement.currentTarget.setPointerCapture(
      evenement.pointerId
    );

    dessinEnCours.current =
      true;

    dernierPoint.current =
      pointDepuisEvenement(
        evenement
      );
  }

  function dessiner(
    evenement:
      ReactPointerEvent<HTMLCanvasElement>
  ) {
    if (
      disabled ||
      !dessinEnCours.current
    ) {
      return;
    }

    evenement.preventDefault();

    const canvas =
      canvasRef.current;

    const precedent =
      dernierPoint.current;

    if (
      !canvas ||
      !precedent
    ) {
      return;
    }

    const contexte =
      canvas.getContext(
        "2d"
      );

    if (
      !contexte
    ) {
      return;
    }

    const courant =
      pointDepuisEvenement(
        evenement
      );

    contexte.beginPath();

    contexte.moveTo(
      precedent.x,
      precedent.y
    );

    contexte.lineTo(
      courant.x,
      courant.y
    );

    contexte.stroke();

    dernierPoint.current =
      courant;
  }

  function terminer(
    evenement:
      ReactPointerEvent<HTMLCanvasElement>
  ) {
    if (
      disabled ||
      !dessinEnCours.current
    ) {
      return;
    }

    evenement.preventDefault();

    dessinEnCours.current =
      false;

    dernierPoint.current =
      null;

    const canvas =
      canvasRef.current;

    if (
      !canvas
    ) {
      return;
    }

    onChange(
      canvas.toDataURL(
        "image/png"
      )
    );
  }

  function effacer() {
    if (
      disabled
    ) {
      return;
    }

    onChange(
      ""
    );
  }

  return (
    <section className="pv-mobile-signature">
      <div className="pv-mobile-signature-heading">
        <div>
          <strong>
            {titre}
          </strong>

          <small>
            {sousTitre}
          </small>
        </div>

        {valeur ? (
          <span>
            ✓ Signée
          </span>
        ) : (
          <span className="waiting">
            À signer
          </span>
        )}
      </div>

      <div className="pv-mobile-canvas-wrap">
        <canvas
          ref={
            canvasRef
          }
          className="pv-mobile-canvas"
          onPointerDown={
            commencer
          }
          onPointerMove={
            dessiner
          }
          onPointerUp={
            terminer
          }
          onPointerCancel={
            terminer
          }
          onPointerLeave={(
            evenement
          ) => {
            if (
              dessinEnCours.current
            ) {
              terminer(
                evenement
              );
            }
          }}
        />

        {!valeur ? (
          <span className="pv-mobile-sign-hint">
            Signez ici avec le doigt
          </span>
        ) : null}
      </div>

      <button
        type="button"
        className="pv-mobile-clear"
        onClick={
          effacer
        }
        disabled={
          disabled ||
          !valeur
        }
      >
        Effacer la signature
      </button>
    </section>
  );
}

/* =========================================================
   COMPOSANT PRINCIPAL
   ========================================================= */

export default function PvFinChantierMobile({
  entrepriseId,
  ficheId,

  clientId = null,
  clientNom = null,
  clientEmail = null,
  signataireEntrepriseNom = null,

  lectureSeule = false,

  salarieId = null,

  onFermer,

  onEnregistre,

  onPvEnregistre,
}: Props) {
  const [
    fiche,
    setFiche,
  ] =
    useState<FicheIntervention | null>(
      null
    );

  const [
    pv,
    setPv,
  ] =
    useState<PvFinChantierMobileData | null>(
      null
    );

  const [
    clientEmailCharge,
    setClientEmailCharge,
  ] =
    useState(
      clientEmail ||
        ""
    );

  const [
    clientPresent,
    setClientPresent,
  ] =
    useState(
      true
    );

  const [
    chantierTermine,
    setChantierTermine,
  ] =
    useState(
      true
    );

  const [
    reserves,
    setReserves,
  ] =
    useState(
      ""
    );

  const [
    commentaireClient,
    setCommentaireClient,
  ] =
    useState(
      ""
    );

  const [
    commentaireEntreprise,
    setCommentaireEntreprise,
  ] =
    useState(
      ""
    );

  const [
    signataireClient,
    setSignataireClient,
  ] =
    useState(
      clientNom ||
        ""
    );

  const [
    signataireEntreprise,
    setSignataireEntreprise,
  ] =
    useState(
      signataireEntrepriseNom ||
        ""
    );

  const [
    signatureClient,
    setSignatureClient,
  ] =
    useState(
      ""
    );

  const [
    signatureEntreprise,
    setSignatureEntreprise,
  ] =
    useState(
      ""
    );

  const [
    chargement,
    setChargement,
  ] =
    useState(
      true
    );

  const [
    enregistrement,
    setEnregistrement,
  ] =
    useState(
      false
    );

  const [
    telechargementPdf,
    setTelechargementPdf,
  ] =
    useState(
      false
    );

  const [
    erreur,
    setErreur,
  ] =
    useState(
      ""
    );

  const [
    succes,
    setSucces,
  ] =
    useState(
      ""
    );

  useEffect(() => {
    void initialiser();
  }, [
    entrepriseId,
    ficheId,
    clientId,
    clientNom,
    clientEmail,
    signataireEntrepriseNom,
    salarieId,
  ]);

  async function recupererEmailClient(
    ficheChargee:
      FicheIntervention
  ) {
    if (
      clientEmail?.trim()
    ) {
      return clientEmail.trim();
    }

    const idClient =
      clientId ||
      ficheChargee.client_id;

    if (
      !idClient
    ) {
      return "";
    }

    try {
      const {
        data,
        error,
      } =
        await supabase
          .from(
            "clients"
          )
          .select(
            "email"
          )
          .eq(
            "entreprise_id",
            entrepriseId
          )
          .eq(
            "id",
            idClient
          )
          .maybeSingle();

      if (
        error
      ) {
        console.warn(
          "Chargement email client PV :",
          error
        );

        return "";
      }

      return String(
        data?.email ||
          ""
      ).trim();
    } catch (
      error
    ) {
      console.warn(
        "Chargement email client PV :",
        error
      );

      return "";
    }
  }

  async function recupererNomIntervenant() {
    if (
      signataireEntrepriseNom
        ?.trim()
    ) {
      return signataireEntrepriseNom.trim();
    }

    if (
      !salarieId
    ) {
      return "";
    }

    try {
      const {
        data,
        error,
      } =
        await supabase
          .from(
            "salaries"
          )
          .select(
            `
              id,
              nom,
              prenom,
              email
            `
          )
          .eq(
            "entreprise_id",
            entrepriseId
          )
          .eq(
            "id",
            salarieId
          )
          .maybeSingle();

      if (
        error
      ) {
        console.warn(
          "Chargement salarié PV :",
          error
        );

        return "";
      }

      return nomSalarie(
        data as Salarie | null
      );
    } catch (
      error
    ) {
      console.warn(
        "Chargement salarié PV :",
        error
      );

      return "";
    }
  }

  async function initialiser() {
    if (
      !entrepriseId ||
      !ficheId
    ) {
      setErreur(
        "Intervention introuvable."
      );

      setChargement(
        false
      );

      return;
    }

    try {
      setChargement(
        true
      );

      setErreur(
        ""
      );

      setSucces(
        ""
      );

      const {
        data:
          ficheData,
        error:
          ficheError,
      } =
        await supabase
          .from(
            "fiches_intervention"
          )
          .select(
            `
              id,
              numero,
              client_id,
              client_nom,
              titre,
              type_intervention,
              date_prevue,
              date_intervention,
              adresse_chantier,
              code_postal_chantier,
              ville_chantier,
              statut,
              pv_fin_chantier_id
            `
          )
          .eq(
            "entreprise_id",
            entrepriseId
          )
          .eq(
            "id",
            ficheId
          )
          .maybeSingle();

      if (
        ficheError
      ) {
        throw ficheError;
      }

      if (
        !ficheData
      ) {
        throw new Error(
          "Cette intervention est introuvable."
        );
      }

      const ficheChargee =
        ficheData as FicheIntervention;

      setFiche(
        ficheChargee
      );

      const [
        emailRecupere,
        nomIntervenant,
      ] =
        await Promise.all([
          recupererEmailClient(
            ficheChargee
          ),

          recupererNomIntervenant(),
        ]);

      const {
        data:
          pvData,
        error:
          pvError,
      } =
        await supabase
          .from(
            "pv_fin_chantier"
          )
          .select(
            "*"
          )
          .eq(
            "entreprise_id",
            entrepriseId
          )
          .eq(
            "fiche_id",
            ficheId
          )
          .order(
            "created_at",
            {
              ascending:
                false,
            }
          )
          .limit(
            1
          )
          .maybeSingle();

      if (
        pvError
      ) {
        throw pvError;
      }

      const clientNomSource =
        clientNom?.trim() ||
        ficheChargee.client_nom ||
        "";

      if (
        pvData
      ) {
        const pvCharge =
          pvData as PvFinChantierMobileData;

        setPv(
          pvCharge
        );

        setClientEmailCharge(
          pvCharge.client_email ||
            emailRecupere
        );

        setClientPresent(
          pvCharge.client_present !==
            false
        );

        setChantierTermine(
          pvCharge.chantier_termine !==
            false
        );

        setReserves(
          pvCharge.reserves ||
            ""
        );

        setCommentaireClient(
          pvCharge.commentaire_client ||
            ""
        );

        setCommentaireEntreprise(
          pvCharge.commentaire_entreprise ||
            ""
        );

        setSignataireClient(
          pvCharge.signataire_client_nom ||
            clientNomSource
        );

        setSignataireEntreprise(
          pvCharge.signataire_entreprise_nom ||
            nomIntervenant
        );

        setSignatureClient(
          pvCharge.signature_client ||
            ""
        );

        setSignatureEntreprise(
          pvCharge.signature_entreprise ||
            ""
        );
      } else {
        setPv(
          null
        );

        setClientEmailCharge(
          emailRecupere
        );

        setClientPresent(
          true
        );

        setChantierTermine(
          true
        );

        setReserves(
          ""
        );

        setCommentaireClient(
          ""
        );

        setCommentaireEntreprise(
          ""
        );

        setSignataireClient(
          clientNomSource
        );

        setSignataireEntreprise(
          nomIntervenant
        );

        setSignatureClient(
          ""
        );

        setSignatureEntreprise(
          ""
        );
      }
    } catch (
      error
    ) {
      console.error(
        "Chargement PV mobile :",
        error
      );

      setErreur(
        messageErreur(
          error,
          "Impossible de charger le PV."
        )
      );
    } finally {
      setChargement(
        false
      );
    }
  }

  function verifierPv() {
    if (
      lectureSeule
    ) {
      return "Ce PV est en lecture seule.";
    }

    if (
      !fiche
    ) {
      return "Intervention introuvable.";
    }

    if (
      !interventionTerminee(
        fiche.statut
      )
    ) {
      return "Terminez d’abord l’intervention avant de faire signer le PV.";
    }

    if (
      !signataireEntreprise.trim()
    ) {
      return "Renseignez le nom du représentant de l’entreprise.";
    }

    if (
      !signatureEntreprise
    ) {
      return "La signature du représentant de l’entreprise est obligatoire.";
    }

    if (
      clientPresent &&
      !signataireClient.trim()
    ) {
      return "Renseignez le nom du client ou du signataire.";
    }

    if (
      clientPresent &&
      !signatureClient
    ) {
      return "La signature du client est obligatoire lorsqu’il est présent.";
    }

    if (
      !chantierTermine &&
      !reserves.trim()
    ) {
      return "Indiquez les réserves ou travaux restant à réaliser.";
    }

    return "";
  }

  async function enregistrerPv() {
    if (
      enregistrement ||
      lectureSeule
    ) {
      return;
    }

    const erreurValidation =
      verifierPv();

    if (
      erreurValidation
    ) {
      setErreur(
        erreurValidation
      );

      return;
    }

    if (
      !fiche
    ) {
      return;
    }

    try {
      setEnregistrement(
        true
      );

      setErreur(
        ""
      );

      setSucces(
        ""
      );

      const maintenant =
        new Date()
          .toISOString();

      const idClient =
        clientId ||
        fiche.client_id ||
        null;

      const nomClient =
        clientNom?.trim() ||
        fiche.client_nom ||
        null;

      const payload = {
        entreprise_id:
          entrepriseId,

        fiche_id:
          ficheId,

        client_id:
          idClient,

        client_nom:
          nomClient,

        client_email:
          clientEmailCharge
            .trim()
            .toLowerCase() ||
          null,

        client_present:
          clientPresent,

        chantier_termine:
          chantierTermine,

        reserves:
          reserves.trim() ||
          null,

        commentaire_client:
          commentaireClient.trim() ||
          null,

        commentaire_entreprise:
          commentaireEntreprise.trim() ||
          null,

        signataire_client_nom:
          clientPresent
            ? signataireClient.trim() ||
              null
            : null,

        signature_client:
          clientPresent
            ? signatureClient ||
              null
            : null,

        signataire_entreprise_nom:
          signataireEntreprise.trim() ||
          null,

        signature_entreprise:
          signatureEntreprise ||
          null,

        updated_at:
          maintenant,
      };

      let pvEnregistre:
        PvFinChantierMobileData | null =
        null;

      if (
        pv?.id
      ) {
        const {
          data,
          error,
        } =
          await supabase
            .from(
              "pv_fin_chantier"
            )
            .update(
              payload
            )
            .eq(
              "entreprise_id",
              entrepriseId
            )
            .eq(
              "id",
              pv.id
            )
            .select(
              "*"
            )
            .single();

        if (
          error
        ) {
          throw error;
        }

        pvEnregistre =
          data as PvFinChantierMobileData;
      } else {
        const {
          data,
          error,
        } =
          await supabase
            .from(
              "pv_fin_chantier"
            )
            .insert({
              ...payload,

              created_at:
                maintenant,
            })
            .select(
              "*"
            )
            .single();

        if (
          error
        ) {
          throw error;
        }

        pvEnregistre =
          data as PvFinChantierMobileData;
      }

      if (
        !pvEnregistre?.id
      ) {
        throw new Error(
          "Le PV a été créé mais son identifiant est introuvable."
        );
      }

      const {
        error:
          ficheUpdateError,
      } =
        await supabase
          .from(
            "fiches_intervention"
          )
          .update({
            pv_fin_chantier_id:
              pvEnregistre.id,

            etape_fin_statut:
              chantierTermine
                ? "valide"
                : "probleme",

            updated_at:
              maintenant,
          })
          .eq(
            "entreprise_id",
            entrepriseId
          )
          .eq(
            "id",
            ficheId
          );

      if (
        ficheUpdateError
      ) {
        throw ficheUpdateError;
      }

      setPv(
        pvEnregistre
      );

      setFiche(
        (
          ancienne
        ) =>
          ancienne
            ? {
                ...ancienne,

                pv_fin_chantier_id:
                  pvEnregistre.id,
              }
            : ancienne
      );

      setSucces(
        "PV de fin de chantier enregistré avec succès."
      );

      onPvEnregistre?.(
        pvEnregistre
      );

      onEnregistre?.();
    } catch (
      error
    ) {
      console.error(
        "Enregistrement PV mobile :",
        error
      );

      setErreur(
        messageErreur(
          error,
          "Impossible d’enregistrer le PV."
        )
      );
    } finally {
      setEnregistrement(
        false
      );
    }
  }

  /* =======================================================
     PDF
     ======================================================= */

  async function telechargerPdf() {
    if (
      !pv?.id ||
      telechargementPdf
    ) {
      return;
    }

    try {
      setTelechargementPdf(
        true
      );

      setErreur(
        ""
      );

      setSucces(
        ""
      );

      const {
        data: {
          session,
        },
        error:
          erreurSession,
      } =
        await supabase
          .auth
          .getSession();

      if (
        erreurSession
      ) {
        throw erreurSession;
      }

      const jeton =
        session?.access_token;

      if (
        !jeton
      ) {
        throw new Error(
          "Votre session a expiré. Reconnectez-vous à Arboboard."
        );
      }

      const response =
        await fetch(
          `${API_ARBOBOARD}/api/interventions/pv-fin-chantier/pdf`,
          {
            method:
              "POST",

            headers: {
              Authorization:
                `Bearer ${jeton}`,

              "Content-Type":
                "application/json",

              "X-Arboboard-Client":
                "mobile",
            },

            cache:
              "no-store",

            body:
              JSON.stringify({
                ficheId,

                pvId:
                  pv.id,
              }),
          }
        );

      if (
        !response.ok
      ) {
        throw new Error(
          await lireErreurResponse(
            response
          )
        );
      }

      const typeContenu =
        response.headers.get(
          "content-type"
        ) ||
        "";

      if (
        typeContenu &&
        !typeContenu.includes(
          "application/pdf"
        ) &&
        !typeContenu.includes(
          "application/octet-stream"
        )
      ) {
        throw new Error(
          "Le serveur n’a pas renvoyé un PDF valide."
        );
      }

      const blob =
        await response.blob();

      if (
        blob.size ===
        0
      ) {
        throw new Error(
          "Le fichier PDF généré est vide."
        );
      }

      const nomFichier =
        extraireNomFichier(
          response.headers.get(
            "content-disposition"
          ),
          ficheId
        );

      declencherTelechargement(
        blob,
        nomFichier
      );

      setSucces(
        "Le PDF du PV a été généré."
      );
    } catch (
      error
    ) {
      console.error(
        "Téléchargement PDF PV mobile :",
        error
      );

      setErreur(
        messageErreur(
          error,
          "Impossible de générer le PDF du PV."
        )
      );
    } finally {
      setTelechargementPdf(
        false
      );
    }
  }

  /* =======================================================
     CHARGEMENT
     ======================================================= */

  if (
    chargement
  ) {
    return (
      <main className="pv-mobile">
        <header className="pv-mobile-header">
          {onFermer ? (
            <button
              type="button"
              onClick={
                onFermer
              }
              aria-label="Retour"
            >
              ‹
            </button>
          ) : (
            <div />
          )}

          <div>
            <small>
              FIN DE CHANTIER
            </small>

            <h1>
              PV
            </h1>
          </div>

          <div />
        </header>

        <section className="pv-mobile-loading">
          <div className="pv-mobile-spinner" />

          <strong>
            Chargement du PV…
          </strong>
        </section>
      </main>
    );
  }

  const statutTermine =
    Boolean(
      fiche &&
      interventionTerminee(
        fiche.statut
      )
    );

  const peutModifier =
    statutTermine &&
    !lectureSeule;

  return (
    <main className="pv-mobile">
      <header className="pv-mobile-header">
        {onFermer ? (
          <button
            type="button"
            className="pv-mobile-back"
            onClick={
              onFermer
            }
            aria-label="Retour"
          >
            ‹
          </button>
        ) : (
          <div />
        )}

        <div>
          <small>
            FIN DE CHANTIER
          </small>

          <h1>
            PV
          </h1>
        </div>

        <button
          type="button"
          className="pv-mobile-refresh"
          onClick={() =>
            void initialiser()
          }
          disabled={
            chargement ||
            enregistrement ||
            telechargementPdf
          }
          aria-label="Actualiser"
        >
          ↻
        </button>
      </header>

      <section className="pv-mobile-content">
        {erreur ? (
          <div
            className="pv-mobile-error"
            role="alert"
          >
            {erreur}
          </div>
        ) : null}

        {succes ? (
          <div
            className="pv-mobile-success"
            role="status"
          >
            ✓ {succes}
          </div>
        ) : null}

        {lectureSeule ? (
          <section className="pv-mobile-warning">
            <span>
              👁
            </span>

            <div>
              <strong>
                Lecture seule
              </strong>

              <p>
                Ce PV peut être consulté mais ne peut plus être modifié depuis cet écran.
              </p>
            </div>
          </section>
        ) : null}

        {!statutTermine ? (
          <section className="pv-mobile-warning">
            <span>
              ⚠️
            </span>

            <div>
              <strong>
                Intervention non terminée
              </strong>

              <p>
                Validez d’abord la fin du chantier. Le PV pourra ensuite être signé.
              </p>
            </div>
          </section>
        ) : null}

        {pv?.id ? (
          <section className="pv-mobile-existing">
            <span>
              ✓
            </span>

            <div>
              <strong>
                PV enregistré
              </strong>

              <p>
                Dernière mise à jour :{" "}
                {formatDateHeure(
                  pv.updated_at ||
                    pv.created_at
                )}
              </p>
            </div>
          </section>
        ) : null}

        <section className="pv-mobile-summary">
          <div className="pv-mobile-summary-icon">
            🌳
          </div>

          <div className="pv-mobile-summary-main">
            <small>
              INTERVENTION
            </small>

            <h2>
              {fiche?.titre ||
                fiche?.type_intervention ||
                fiche?.numero ||
                "Intervention"}
            </h2>

            <p>
              {clientNom ||
                fiche?.client_nom ||
                "Client non renseigné"}
            </p>
          </div>

          <span>
            {fiche?.numero ||
              "PV"}
          </span>

          <div className="pv-mobile-summary-grid">
            <div>
              <small>
                DATE
              </small>

              <strong>
                {formatDate(
                  fiche?.date_intervention ||
                    fiche?.date_prevue
                )}
              </strong>
            </div>

            <div>
              <small>
                LIEU
              </small>

              <strong>
                {adresseFiche(
                  fiche
                )}
              </strong>
            </div>
          </div>
        </section>

        <section className="pv-mobile-section">
          <div className="pv-mobile-section-title">
            <span>
              1
            </span>

            <div>
              <small>
                RÉCEPTION
              </small>

              <h2>
                Le chantier est-il terminé ?
              </h2>
            </div>
          </div>

          <div className="pv-mobile-choice-grid">
            <button
              type="button"
              className={
                chantierTermine
                  ? "active success"
                  : ""
              }
              onClick={() =>
                setChantierTermine(
                  true
                )
              }
              disabled={
                !peutModifier ||
                enregistrement
              }
            >
              <span>
                ✓
              </span>

              <strong>
                Oui
              </strong>

              <small>
                Travaux terminés
              </small>
            </button>

            <button
              type="button"
              className={
                !chantierTermine
                  ? "active warning"
                  : ""
              }
              onClick={() =>
                setChantierTermine(
                  false
                )
              }
              disabled={
                !peutModifier ||
                enregistrement
              }
            >
              <span>
                !
              </span>

              <strong>
                Avec réserves
              </strong>

              <small>
                Reste à signaler
              </small>
            </button>
          </div>

          {!chantierTermine ? (
            <label className="pv-mobile-field">
              <span>
                Réserves *
              </span>

              <textarea
                rows={4}
                value={
                  reserves
                }
                onChange={(
                  event
                ) =>
                  setReserves(
                    event.target.value
                  )
                }
                placeholder="Décrivez précisément les réserves ou travaux restant à réaliser."
                disabled={
                  !peutModifier ||
                  enregistrement
                }
              />
            </label>
          ) : (
            <label className="pv-mobile-toggle">
              <input
                type="checkbox"
                checked={
                  Boolean(
                    reserves.trim()
                  )
                }
                onChange={(
                  event
                ) => {
                  if (
                    !event.target.checked
                  ) {
                    setReserves(
                      ""
                    );
                  } else if (
                    !reserves
                  ) {
                    setReserves(
                      "Réserve signalée : "
                    );
                  }
                }}
                disabled={
                  !peutModifier ||
                  enregistrement
                }
              />

              <span>
                Ajouter une réserve ou observation
              </span>
            </label>
          )}

          {chantierTermine &&
          reserves ? (
            <label className="pv-mobile-field">
              <span>
                Réserves / observations
              </span>

              <textarea
                rows={4}
                value={
                  reserves
                }
                onChange={(
                  event
                ) =>
                  setReserves(
                    event.target.value
                  )
                }
                disabled={
                  !peutModifier ||
                  enregistrement
                }
              />
            </label>
          ) : null}
        </section>

        <section className="pv-mobile-section">
          <div className="pv-mobile-section-title">
            <span>
              2
            </span>

            <div>
              <small>
                CLIENT
              </small>

              <h2>
                Le client est-il présent ?
              </h2>
            </div>
          </div>

          <div className="pv-mobile-choice-grid">
            <button
              type="button"
              className={
                clientPresent
                  ? "active success"
                  : ""
              }
              onClick={() =>
                setClientPresent(
                  true
                )
              }
              disabled={
                !peutModifier ||
                enregistrement
              }
            >
              <span>
                👤
              </span>

              <strong>
                Présent
              </strong>

              <small>
                Signature sur place
              </small>
            </button>

            <button
              type="button"
              className={
                !clientPresent
                  ? "active neutral"
                  : ""
              }
              onClick={() =>
                setClientPresent(
                  false
                )
              }
              disabled={
                !peutModifier ||
                enregistrement
              }
            >
              <span>
                —
              </span>

              <strong>
                Absent
              </strong>

              <small>
                Pas de signature client
              </small>
            </button>
          </div>

          <label className="pv-mobile-field">
            <span>
              Email client
            </span>

            <input
              type="email"
              inputMode="email"
              value={
                clientEmailCharge
              }
              onChange={(
                event
              ) =>
                setClientEmailCharge(
                  event.target.value
                )
              }
              placeholder="client@email.fr"
              disabled={
                !peutModifier ||
                enregistrement
              }
            />

            <small>
              L’envoi du PV au client reste géré depuis l’espace Chef.
            </small>
          </label>
        </section>

        <section className="pv-mobile-section">
          <div className="pv-mobile-section-title">
            <span>
              3
            </span>

            <div>
              <small>
                OBSERVATIONS
              </small>

              <h2>
                Derniers commentaires
              </h2>
            </div>
          </div>

          <label className="pv-mobile-field">
            <span>
              Commentaire de l’entreprise
            </span>

            <textarea
              rows={4}
              value={
                commentaireEntreprise
              }
              onChange={(
                event
              ) =>
                setCommentaireEntreprise(
                  event.target.value
                )
              }
              placeholder="Information utile sur la fin du chantier..."
              disabled={
                !peutModifier ||
                enregistrement
              }
            />
          </label>

          {clientPresent ? (
            <label className="pv-mobile-field">
              <span>
                Commentaire du client
              </span>

              <textarea
                rows={4}
                value={
                  commentaireClient
                }
                onChange={(
                  event
                ) =>
                  setCommentaireClient(
                    event.target.value
                  )
                }
                placeholder="Observation éventuelle du client..."
                disabled={
                  !peutModifier ||
                  enregistrement
                }
              />
            </label>
          ) : null}
        </section>

        <section className="pv-mobile-section">
          <div className="pv-mobile-section-title">
            <span>
              4
            </span>

            <div>
              <small>
                ENTREPRISE
              </small>

              <h2>
                Signature de l’intervenant
              </h2>
            </div>
          </div>

          <label className="pv-mobile-field">
            <span>
              Nom du représentant *
            </span>

            <input
              value={
                signataireEntreprise
              }
              onChange={(
                event
              ) =>
                setSignataireEntreprise(
                  event.target.value
                )
              }
              placeholder="Prénom et nom"
              disabled={
                !peutModifier ||
                enregistrement
              }
            />
          </label>

          <SignaturePad
            titre="Signature entreprise"
            sousTitre="Le salarié signe directement sur l’écran."
            valeur={
              signatureEntreprise
            }
            onChange={
              setSignatureEntreprise
            }
            disabled={
              !peutModifier ||
              enregistrement
            }
          />
        </section>

        {clientPresent ? (
          <section className="pv-mobile-section pv-mobile-client-signature-section">
            <div className="pv-mobile-section-title">
              <span>
                5
              </span>

              <div>
                <small>
                  CLIENT
                </small>

                <h2>
                  Signature du client
                </h2>
              </div>
            </div>

            <label className="pv-mobile-field">
              <span>
                Nom du signataire *
              </span>

              <input
                value={
                  signataireClient
                }
                onChange={(
                  event
                ) =>
                  setSignataireClient(
                    event.target.value
                  )
                }
                placeholder="Prénom et nom du client"
                disabled={
                  !peutModifier ||
                  enregistrement
                }
              />
            </label>

            <div className="pv-mobile-client-confirmation">
              <span>
                ✓
              </span>

              <p>
                En signant, le client confirme avoir pris connaissance de l’état de fin du chantier et des éventuelles réserves indiquées ci-dessus.
              </p>
            </div>

            <SignaturePad
              titre="Signature client"
              sousTitre="Faites signer le client directement au doigt."
              valeur={
                signatureClient
              }
              onChange={
                setSignatureClient
              }
              disabled={
                !peutModifier ||
                enregistrement
              }
            />
          </section>
        ) : null}

        {!lectureSeule ? (
          <section className="pv-mobile-final">
            <div>
              <small>
                DERNIÈRE ÉTAPE
              </small>

              <h2>
                Enregistrer le PV
              </h2>

              <p>
                Les signatures et observations seront enregistrées dans Arboboard et rattachées à cette intervention.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                void enregistrerPv()
              }
              disabled={
                !peutModifier ||
                enregistrement
              }
            >
              {enregistrement
                ? "Enregistrement…"
                : pv?.id
                  ? "METTRE À JOUR LE PV"
                  : "VALIDER LE PV"}
            </button>

            {pv?.id ? (
              <p className="pv-mobile-final-ok">
                ✓ PV rattaché à l’intervention
              </p>
            ) : null}
          </section>
        ) : null}

        {pv?.id ? (
          <section className="pv-mobile-pdf-card">
            <div className="pv-mobile-pdf-icon">
              PDF
            </div>

            <div className="pv-mobile-pdf-content">
              <small>
                DOCUMENT
              </small>

              <h2>
                PV de fin de chantier
              </h2>

              <p>
                Générez la version PDF complète avec les informations du chantier, les signatures et les photos.
              </p>
            </div>

            <button
              type="button"
              className="pv-mobile-pdf-button"
              onClick={() =>
                void telechargerPdf()
              }
              disabled={
                telechargementPdf ||
                enregistrement
              }
            >
              {telechargementPdf
                ? "Génération du PDF…"
                : "Télécharger le PDF"}
            </button>
          </section>
        ) : null}
      </section>
    </main>
  );
}