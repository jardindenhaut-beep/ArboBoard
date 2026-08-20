"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import BoutonTelechargerPvFinChantierPdf from "@/components/interventions/BoutonTelechargerPvFinChantierPdf";
import BoutonEnvoyerPvFinChantierEmail from "@/components/interventions/BoutonEnvoyerPvFinChantierEmail";

type PvFinChantier = {
  id: string;
  entreprise_id: string;
  fiche_id: string;
  client_id: string | null;
  client_nom: string | null;
  client_email: string | null;
  client_present: boolean | null;
  chantier_termine: boolean | null;
  reserves: string | null;
  commentaire_client: string | null;
  commentaire_entreprise: string | null;
  signature_client: string | null;
  signature_entreprise: string | null;
  signataire_client_nom: string | null;
  signataire_entreprise_nom: string | null;
  envoye_client_at: string | null;
  envoye_client_email: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type Props = {
  entrepriseId: string;
  ficheId: string;
  clientId?: string | null;
  clientNom?: string | null;
  clientEmail?: string | null;
  signataireEntrepriseNom?: string | null;
  afficherEnvoiEmail?: boolean;
  autoriserSuppression?: boolean;
};

type SignaturePadProps = {
  label: string;
  valeur: string;
  onChange: (valeur: string) => void;
  disabled?: boolean;
};

function SignaturePad({
  label,
  valeur,
  onChange,
  disabled = false,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dessinActifRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const contexte = canvas.getContext("2d");
    if (!contexte) return;

    contexte.lineWidth = 2;
    contexte.lineCap = "round";
    contexte.strokeStyle = "#0f172a";

    contexte.clearRect(0, 0, canvas.width, canvas.height);

    if (valeur) {
      const image = new Image();
      image.onload = () => {
        contexte.clearRect(0, 0, canvas.width, canvas.height);
        contexte.drawImage(image, 0, 0, canvas.width, canvas.height);
      };
      image.src = valeur;
    }
  }, [valeur]);

  function positionDepuisEvenement(
    event:
      | React.MouseEvent<HTMLCanvasElement>
      | React.TouchEvent<HTMLCanvasElement>
  ) {
    const canvas = canvasRef.current;

    if (!canvas) {
      return { x: 0, y: 0 };
    }

    const rect = canvas.getBoundingClientRect();

    if ("touches" in event) {
      const touch = event.touches[0] || event.changedTouches[0];

      return {
        x: ((touch.clientX - rect.left) / rect.width) * canvas.width,
        y: ((touch.clientY - rect.top) / rect.height) * canvas.height,
      };
    }

    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function commencerDessin(
    event:
      | React.MouseEvent<HTMLCanvasElement>
      | React.TouchEvent<HTMLCanvasElement>
  ) {
    if (disabled) return;

    event.preventDefault();

    const canvas = canvasRef.current;
    const contexte = canvas?.getContext("2d");

    if (!canvas || !contexte) return;

    const position = positionDepuisEvenement(event);

    dessinActifRef.current = true;
    contexte.beginPath();
    contexte.moveTo(position.x, position.y);
  }

  function dessiner(
    event:
      | React.MouseEvent<HTMLCanvasElement>
      | React.TouchEvent<HTMLCanvasElement>
  ) {
    if (disabled) return;
    if (!dessinActifRef.current) return;

    event.preventDefault();

    const canvas = canvasRef.current;
    const contexte = canvas?.getContext("2d");

    if (!canvas || !contexte) return;

    const position = positionDepuisEvenement(event);

    contexte.lineTo(position.x, position.y);
    contexte.stroke();
  }

  function terminerDessin() {
    if (disabled || !dessinActifRef.current) return;

    const canvas = canvasRef.current;

    if (!canvas) return;

    dessinActifRef.current = false;
    onChange(canvas.toDataURL("image/png"));
  }

  function effacerSignature() {
    if (disabled) return;

    const canvas = canvasRef.current;
    const contexte = canvas?.getContext("2d");

    if (!canvas || !contexte) return;

    contexte.clearRect(0, 0, canvas.width, canvas.height);
    onChange("");
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-900">{label}</p>

        <button
          type="button"
          onClick={effacerSignature}
          disabled={disabled || !valeur}
          className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Effacer
        </button>
      </div>

      <canvas
        ref={canvasRef}
        width={700}
        height={220}
        onMouseDown={commencerDessin}
        onMouseMove={dessiner}
        onMouseUp={terminerDessin}
        onMouseLeave={terminerDessin}
        onTouchStart={commencerDessin}
        onTouchMove={dessiner}
        onTouchEnd={terminerDessin}
        className={`h-40 w-full touch-none rounded-2xl border border-dashed border-slate-300 bg-slate-50 ${
          disabled ? "cursor-not-allowed opacity-60" : "cursor-crosshair"
        }`}
      />

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-400">
          Signature au doigt sur mobile ou à la souris sur ordinateur.
        </p>

        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
            valeur
              ? "bg-emerald-50 text-emerald-700"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          {valeur ? "Signature enregistrée" : "Signature manquante"}
        </span>
      </div>
    </div>
  );
}

function messageErreurSupabase(
  error: unknown,
  fallback: string
) {
  if (!error) return fallback;

  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  if (typeof error === "object") {
    const objet = error as {
      message?: unknown;
      details?: unknown;
      hint?: unknown;
      code?: unknown;
    };

    const morceaux = [
      objet.message,
      objet.details,
      objet.hint,
      objet.code ? `Code ${objet.code}` : null,
    ]
      .filter(
        (valeur): valeur is string =>
          typeof valeur === "string" &&
          valeur.trim().length > 0
      )
      .map((valeur) => valeur.trim());

    if (morceaux.length > 0) {
      return Array.from(new Set(morceaux)).join(" · ");
    }
  }

  return fallback;
}

function formatDateHeure(date: string | null | undefined) {
  if (!date) return "";

  try {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  } catch {
    return date;
  }
}

function normaliserEmail(valeur: string | null | undefined) {
  return String(valeur || "").trim().toLowerCase();
}

function emailValide(valeur: string | null | undefined) {
  const email = normaliserEmail(valeur);

  if (!email) return false;

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function libelleEtatPv({
  pvExiste,
  envoye,
  complet,
}: {
  pvExiste: boolean;
  envoye: boolean;
  complet: boolean;
}) {
  if (envoye) return "Envoyé";
  if (pvExiste && complet) return "Enregistré";
  if (pvExiste) return "À compléter";
  return "Non créé";
}

function classeEtatPv({
  pvExiste,
  envoye,
  complet,
}: {
  pvExiste: boolean;
  envoye: boolean;
  complet: boolean;
}) {
  if (envoye) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (pvExiste && complet) {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (pvExiste) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-600";
}

export default function BlocPvFinChantier({
  entrepriseId,
  ficheId,
  clientId = null,
  clientNom = null,
  clientEmail = null,
  signataireEntrepriseNom = null,
  afficherEnvoiEmail = true,
  autoriserSuppression = afficherEnvoiEmail,
}: Props) {
  const [chargement, setChargement] = useState(true);
  const [enregistrement, setEnregistrement] = useState(false);
  const [suppression, setSuppression] = useState(false);

  const [pv, setPv] = useState<PvFinChantier | null>(null);

  const [clientEmailCharge, setClientEmailCharge] = useState(clientEmail || "");

  const [clientPresent, setClientPresent] = useState(true);
  const [chantierTermine, setChantierTermine] = useState(true);
  const [reserves, setReserves] = useState("");
  const [avecReserves, setAvecReserves] = useState(false);
  const [reconnaissanceTravaux, setReconnaissanceTravaux] = useState(false);
  const [reconnaissanceEvacuation, setReconnaissanceEvacuation] = useState(false);
  const [signatureClient, setSignatureClient] = useState("");
  const [signatureEntreprise, setSignatureEntreprise] = useState("");
  const [commentaireClient, setCommentaireClient] = useState("");
  const [commentaireEntreprise, setCommentaireEntreprise] = useState("");
  const [signataireClientNom, setSignataireClientNom] = useState(
    clientNom || ""
  );
  const [signataireEntreprise, setSignataireEntreprise] = useState(
    signataireEntrepriseNom || ""
  );

  const [messageErreur, setMessageErreur] = useState("");
  const [messageSucces, setMessageSucces] = useState("");

  useEffect(() => {
    chargerPvEtEmail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    entrepriseId,
    ficheId,
    clientId,
    clientEmail,
    clientNom,
    signataireEntrepriseNom,
  ]);

  async function chargerPvEtEmail() {
    if (!entrepriseId || !ficheId) {
      setChargement(false);
      return;
    }

    try {
      setChargement(true);
      setMessageErreur("");
      setMessageSucces("");

      const { data, error } = await supabase
        .from("pv_fin_chantier")
        .select("*")
        .eq("entreprise_id", entrepriseId)
        .eq("fiche_id", ficheId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      const emailClientSource = await recupererEmailClient();

      if (!data) {
        setPv(null);
        setClientPresent(true);
        setChantierTermine(true);
        setReserves("");
        setAvecReserves(false);
        setReconnaissanceTravaux(false);
        setReconnaissanceEvacuation(false);
        setSignatureClient("");
        setSignatureEntreprise("");
        setCommentaireClient("");
        setCommentaireEntreprise("");
        setSignataireClientNom(clientNom || "");
        setSignataireEntreprise(signataireEntrepriseNom || "");
        setClientEmailCharge(emailClientSource);
        return;
      }

      const pvCharge = data as PvFinChantier;

      setPv(pvCharge);
      setClientPresent(pvCharge.client_present !== false);
      setChantierTermine(pvCharge.chantier_termine !== false);
      const reservesChargees = pvCharge.reserves || "";
      setReserves(reservesChargees);
      setAvecReserves(Boolean(reservesChargees.trim()));
      const clientADejaSigne = Boolean(pvCharge.signature_client);
      setReconnaissanceTravaux(clientADejaSigne);
      setReconnaissanceEvacuation(clientADejaSigne);
      setSignatureClient(pvCharge.signature_client || "");
      setSignatureEntreprise(pvCharge.signature_entreprise || "");
      setCommentaireClient(pvCharge.commentaire_client || "");
      setCommentaireEntreprise(pvCharge.commentaire_entreprise || "");
      setSignataireClientNom(pvCharge.signataire_client_nom || clientNom || "");
      setSignataireEntreprise(
        pvCharge.signataire_entreprise_nom || signataireEntrepriseNom || ""
      );

      setClientEmailCharge(
        pvCharge.client_email?.trim() || emailClientSource
      );
    } catch (error: any) {
      console.warn("Erreur chargement PV fin chantier :", error);
      setMessageErreur(
        error?.message || "Impossible de charger le PV de fin de chantier."
      );
    } finally {
      setChargement(false);
    }
  }

  async function recupererEmailClient() {
    const emailFourni = clientEmail?.trim() || "";

    if (emailFourni) return emailFourni;
    if (!clientId || !entrepriseId) return "";

    try {
      const { data, error } = await supabase
        .from("clients")
        .select("email")
        .eq("entreprise_id", entrepriseId)
        .eq("id", clientId)
        .maybeSingle();

      if (error) {
        console.warn("Erreur chargement email client PV :", error);
        return "";
      }

      return data?.email?.trim() || "";
    } catch (error) {
      console.warn("Erreur chargement email client PV :", error);
      return "";
    }
  }

  const emailClientNormalise = useMemo(
    () => normaliserEmail(clientEmailCharge),
    [clientEmailCharge]
  );

  const emailClientEstValide = useMemo(
    () => emailValide(emailClientNormalise),
    [emailClientNormalise]
  );

  const pvComplet = useMemo(() => {
    if (!chantierTermine && !avecReserves) return false;
    if (avecReserves && !reserves.trim()) return false;
    if (!signataireEntreprise.trim() || !signatureEntreprise) return false;

    if (clientPresent) {
      if (!signataireClientNom.trim()) return false;
      if (!reconnaissanceTravaux || !reconnaissanceEvacuation) return false;
      if (!signatureClient) return false;
    }

    return true;
  }, [
    chantierTermine,
    avecReserves,
    reserves,
    signataireEntreprise,
    signatureEntreprise,
    clientPresent,
    signataireClientNom,
    reconnaissanceTravaux,
    reconnaissanceEvacuation,
    signatureClient,
  ]);

  const etatPv = libelleEtatPv({
    pvExiste: Boolean(pv?.id),
    envoye: Boolean(pv?.envoye_client_at),
    complet: pvComplet,
  });

  const classeBadgeEtatPv = classeEtatPv({
    pvExiste: Boolean(pv?.id),
    envoye: Boolean(pv?.envoye_client_at),
    complet: pvComplet,
  });

  async function enregistrerPv() {
    if (!entrepriseId || !ficheId) {
      setMessageErreur("Fiche intervention introuvable.");
      return;
    }


    if (clientEmailCharge.trim() && !emailClientEstValide) {
      setMessageErreur(
        "L’adresse email du client n’est pas valide. Vérifiez-la ou laissez le champ vide."
      );
      return;
    }

    if (!chantierTermine && !avecReserves) {
      setMessageErreur(
        "Un chantier non terminé doit être réceptionné avec réserves."
      );
      return;
    }

    if (avecReserves && !reserves.trim()) {
      setMessageErreur(
        "Décrivez les réserves avant d’enregistrer le PV."
      );
      return;
    }

    if (!signataireEntreprise.trim() || !signatureEntreprise) {
      setMessageErreur(
        "Le nom et la signature de l’entreprise sont obligatoires."
      );
      return;
    }

    if (clientPresent) {
      if (!signataireClientNom.trim()) {
        setMessageErreur("Renseignez le nom du signataire client.");
        return;
      }

      if (!reconnaissanceTravaux || !reconnaissanceEvacuation) {
        setMessageErreur(
          "Le client doit confirmer les deux déclarations avant de signer."
        );
        return;
      }

      if (!signatureClient) {
        setMessageErreur(
          "La signature du client est obligatoire lorsqu’il est présent."
        );
        return;
      }
    }

    try {
      setEnregistrement(true);
      setMessageErreur("");
      setMessageSucces("");

      const payload = {
        entreprise_id: entrepriseId,
        fiche_id: ficheId,
        client_id: clientId || null,
        client_nom: clientNom || null,
        client_email: emailClientNormalise || null,
        client_present: clientPresent,
        chantier_termine: chantierTermine,
        reserves: avecReserves ? reserves.trim() || null : null,
        commentaire_client: commentaireClient.trim() || null,
        commentaire_entreprise: commentaireEntreprise.trim() || null,
        signature_client: clientPresent ? signatureClient || null : null,
        signature_entreprise: signatureEntreprise || null,
        signataire_client_nom:
          clientPresent && signataireClientNom.trim()
            ? signataireClientNom.trim()
            : null,
        signataire_entreprise_nom: signataireEntreprise.trim() || null,
        updated_at: new Date().toISOString(),
      };

      let pvEnregistre: PvFinChantier | null = null;

      if (pv?.id) {
        const { data, error } = await supabase
          .from("pv_fin_chantier")
          .update(payload)
          .eq("entreprise_id", entrepriseId)
          .eq("id", pv.id)
          .select("*")
          .single();

        if (error) throw error;

        pvEnregistre = data as PvFinChantier;
      } else {
        const { data, error } = await supabase
          .from("pv_fin_chantier")
          .insert(payload)
          .select("*")
          .single();

        if (error) throw error;

        pvEnregistre = data as PvFinChantier;
      }

      if (pvEnregistre?.id) {
        const { error: erreurMiseAJourFiche } = await supabase
          .from("fiches_intervention")
          .update({
            pv_fin_chantier_id: pvEnregistre.id,
            etape_fin_statut: chantierTermine ? "valide" : "probleme",
            updated_at: new Date().toISOString(),
          })
          .eq("entreprise_id", entrepriseId)
          .eq("id", ficheId);

        if (erreurMiseAJourFiche) throw erreurMiseAJourFiche;
      }

      setPv(pvEnregistre);
      setClientEmailCharge(pvEnregistre?.client_email || "");
      setMessageSucces("PV de fin de chantier enregistré.");
    } catch (error: unknown) {
      const message = messageErreurSupabase(
        error,
        "Impossible d’enregistrer le PV de fin de chantier."
      );

      console.warn("Erreur enregistrement PV fin chantier :", {
        message,
        error,
      });

      setMessageErreur(message);
    } finally {
      setEnregistrement(false);
    }
  }

  async function supprimerPv() {
    if (!pv?.id || !entrepriseId || !ficheId) return;

    const confirmation = window.confirm(
      "Supprimer le PV de fin de chantier ? Cette action est définitive."
    );

    if (!confirmation) return;

    try {
      setSuppression(true);
      setMessageErreur("");
      setMessageSucces("");

      const { error } = await supabase
        .from("pv_fin_chantier")
        .delete()
        .eq("entreprise_id", entrepriseId)
        .eq("id", pv.id);

      if (error) throw error;

      const { error: erreurMiseAJourFiche } = await supabase
        .from("fiches_intervention")
        .update({
          pv_fin_chantier_id: null,
          etape_fin_statut: "en_attente",
          updated_at: new Date().toISOString(),
        })
        .eq("entreprise_id", entrepriseId)
        .eq("id", ficheId);

      if (erreurMiseAJourFiche) throw erreurMiseAJourFiche;

      setPv(null);
      setClientPresent(true);
      setChantierTermine(true);
      setReserves("");
      setAvecReserves(false);
      setReconnaissanceTravaux(false);
      setReconnaissanceEvacuation(false);
      setSignatureClient("");
      setSignatureEntreprise("");
      setCommentaireClient("");
      setCommentaireEntreprise("");
      setSignataireClientNom(clientNom || "");
      setSignataireEntreprise(signataireEntrepriseNom || "");
      setMessageSucces("PV supprimé.");
    } catch (error: any) {
      console.warn("Erreur suppression PV fin chantier :", error);
      setMessageErreur(
        error?.message || "Impossible de supprimer le PV de fin de chantier."
      );
    } finally {
      setSuppression(false);
    }
  }

  if (chargement) {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-slate-900">
          Chargement du PV de fin de chantier...
        </p>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-gradient-to-br from-emerald-50 via-white to-white p-5 sm:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-2xl">
                ✍️
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-950 sm:text-xl">
                    PV de fin de chantier
                  </h2>

                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${classeBadgeEtatPv}`}
                  >
                    {etatPv}
                  </span>
                </div>

                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Réception des travaux, réserves, commentaires et signatures.
                </p>

                {pv?.updated_at ? (
                  <p className="mt-2 text-xs font-medium text-slate-400">
                    Dernier enregistrement : {formatDateHeure(pv.updated_at)}
                  </p>
                ) : null}
              </div>
            </div>

            {pv?.envoye_client_at ? (
              <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                <span className="font-bold">PV envoyé au client</span>
                <span>
                  {" "}
                  le {formatDateHeure(pv.envoye_client_at)}
                  {pv.envoye_client_email
                    ? ` à ${pv.envoye_client_email}`
                    : ""}
                  .
                </span>
              </div>
            ) : null}
          </div>

          <div className="grid gap-2 sm:grid-cols-2 xl:flex xl:flex-wrap xl:justify-end">
            {pv?.id ? (
              <BoutonTelechargerPvFinChantierPdf ficheId={ficheId} />
            ) : null}

            {pv?.id && afficherEnvoiEmail && emailClientEstValide ? (
              <BoutonEnvoyerPvFinChantierEmail
                ficheId={ficheId}
                pvId={pv.id}
                emailClient={emailClientNormalise}
                clientNom={clientNom}
              />
            ) : null}

            {pv?.id && afficherEnvoiEmail && !emailClientEstValide ? (
              <button
                type="button"
                disabled
                title="Renseignez une adresse email valide avant l’envoi."
                className="rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-400"
              >
                Email requis pour envoyer
              </button>
            ) : null}

            {pv?.id && autoriserSuppression ? (
              <button
                type="button"
                onClick={() => void supprimerPv()}
                disabled={suppression || enregistrement}
                className="rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {suppression ? "Suppression…" : "Supprimer le PV"}
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="space-y-6 p-5 sm:p-6">
        {messageErreur ? (
          <div
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
          >
            {messageErreur}
          </div>
        ) : null}

        {messageSucces ? (
          <div
            role="status"
            className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700"
          >
            {messageSucces}
          </div>
        ) : null}

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-xl shadow-sm">
                🏗️
              </span>
              <div>
                <h3 className="font-bold text-slate-950">État du chantier</h3>
                <p className="text-xs text-slate-500">
                  Indiquez si les travaux sont terminés et si le client est présent.
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                <input
                  type="checkbox"
                  checked={chantierTermine}
                  onChange={(event) => {
                    const termine = event.target.checked;
                    setChantierTermine(termine);

                    if (!termine) {
                      setAvecReserves(true);
                    }
                  }}
                  className="mt-0.5 h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span>
                  <span className="block text-sm font-semibold text-slate-800">
                    Chantier terminé
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500">
                    Décochez uniquement lorsqu’une intervention complémentaire reste nécessaire.
                  </span>
                </span>
              </label>

              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                <input
                  type="checkbox"
                  checked={clientPresent}
                  onChange={(event) => {
                    const present = event.target.checked;
                    setClientPresent(present);

                    if (!present) {
                      setSignatureClient("");
                      setSignataireClientNom("");
                      setReconnaissanceTravaux(false);
                      setReconnaissanceEvacuation(false);
                    } else {
                      setSignataireClientNom(clientNom || "");
                    }
                  }}
                  className="mt-0.5 h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span>
                  <span className="block text-sm font-semibold text-slate-800">
                    Client présent sur place
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500">
                    La signature client devient obligatoire lorsqu’il est présent.
                  </span>
                </span>
              </label>
            </div>

            {!clientPresent ? (
              <div className="mt-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-700">
                Le client est indiqué absent. Le PV pourra être enregistré avec
                la seule signature de l’entreprise puis envoyé par email.
              </div>
            ) : null}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-xl shadow-sm">
                👥
              </span>
              <div>
                <h3 className="font-bold text-slate-950">
                  Signataires et destinataire
                </h3>
                <p className="text-xs text-slate-500">
                  Vérifiez les noms et l’adresse utilisée pour l’envoi.
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-4">
              <label>
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Signataire entreprise *
                </span>
                <input
                  value={signataireEntreprise}
                  onChange={(event) =>
                    setSignataireEntreprise(event.target.value)
                  }
                  placeholder="Nom du signataire entreprise"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                />
              </label>

              <label>
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Signataire client {clientPresent ? "*" : ""}
                </span>
                <input
                  value={signataireClientNom}
                  onChange={(event) =>
                    setSignataireClientNom(event.target.value)
                  }
                  placeholder="Nom du signataire client"
                  disabled={!clientPresent}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                />
              </label>

              {afficherEnvoiEmail ? (
                <label>
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Email client
                  </span>

                  <input
                    type="email"
                    value={clientEmailCharge}
                    onChange={(event) =>
                      setClientEmailCharge(event.target.value)
                    }
                    placeholder="client@email.fr"
                    autoComplete="email"
                    aria-invalid={
                      clientEmailCharge.trim() !== "" && !emailClientEstValide
                    }
                    className={`w-full rounded-2xl border bg-white px-4 py-3 text-sm outline-none transition focus:ring-4 ${
                      clientEmailCharge.trim() !== "" && !emailClientEstValide
                        ? "border-red-300 focus:border-red-500 focus:ring-red-100"
                        : "border-slate-200 focus:border-emerald-500 focus:ring-emerald-100"
                    }`}
                  />

                  {clientEmailCharge.trim() === "" ? (
                    <span className="mt-1 block text-xs text-amber-700">
                      Aucun email enregistré. Le PV pourra être sauvegardé,
                      mais pas envoyé par email.
                    </span>
                  ) : !emailClientEstValide ? (
                    <span className="mt-1 block text-xs font-medium text-red-600">
                      L’adresse saisie n’est pas valide.
                    </span>
                  ) : (
                    <span className="mt-1 block text-xs font-medium text-emerald-700">
                      Adresse email valide.
                    </span>
                  )}
                </label>
              ) : null}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-xl shadow-sm">
              📋
            </span>
            <div>
              <h3 className="font-bold text-slate-950">
                Réception du chantier
              </h3>
              <p className="text-xs text-slate-500">
                Sélectionnez une réception sans réserve ou détaillez les réserves.
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                setAvecReserves(false);
                setReserves("");
              }}
              disabled={!chantierTermine}
              aria-pressed={!avecReserves}
              className={`min-h-14 rounded-2xl border px-4 py-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                !avecReserves
                  ? "border-emerald-500 bg-emerald-600 text-white shadow-sm"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
              }`}
            >
              ✓ Sans réserve
            </button>

            <button
              type="button"
              onClick={() => setAvecReserves(true)}
              aria-pressed={avecReserves}
              className={`min-h-14 rounded-2xl border px-4 py-3 text-sm font-bold transition ${
                avecReserves
                  ? "border-amber-500 bg-amber-500 text-white shadow-sm"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
              }`}
            >
              ⚠️ Avec réserves
            </button>
          </div>

          {avecReserves ? (
            <label className="mt-4 block">
              <span className="mb-2 block text-sm font-bold text-slate-800">
                Description précise des réserves *
              </span>
              <textarea
                value={reserves}
                onChange={(event) => setReserves(event.target.value)}
                rows={5}
                placeholder="Décrivez les travaux restant à effectuer, les défauts constatés et les engagements pris."
                className="w-full rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
              />
              <span className="mt-1 block text-right text-xs text-slate-400">
                {reserves.trim().length} caractère(s)
              </span>
            </label>
          ) : null}
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <label className="rounded-3xl border border-slate-200 bg-white p-4">
            <span className="text-sm font-bold text-slate-950">
              Commentaire de l’entreprise
            </span>
            <span className="mt-1 block text-xs leading-5 text-slate-500">
              Observations internes ou informations à faire apparaître sur le PV.
            </span>
            <textarea
              value={commentaireEntreprise}
              onChange={(event) =>
                setCommentaireEntreprise(event.target.value)
              }
              rows={4}
              placeholder="Ex : travaux réalisés conformément au devis, recommandations d’entretien…"
              className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            />
          </label>

          <label className="rounded-3xl border border-slate-200 bg-white p-4">
            <span className="text-sm font-bold text-slate-950">
              Commentaire du client
            </span>
            <span className="mt-1 block text-xs leading-5 text-slate-500">
              Remarque formulée par le client ou motif de son absence.
            </span>
            <textarea
              value={commentaireClient}
              onChange={(event) => setCommentaireClient(event.target.value)}
              rows={4}
              placeholder={
                clientPresent
                  ? "Ex : client satisfait, demande complémentaire…"
                  : "Ex : client absent lors de la réception, PV envoyé par email…"
              }
              className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            />
          </label>
        </section>

        {clientPresent ? (
          <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-xl shadow-sm">
                ✅
              </span>
              <div>
                <h3 className="font-bold text-emerald-950">
                  Bon pour réception des travaux
                </h3>
                <p className="text-xs text-emerald-700">
                  Les deux déclarations doivent être acceptées avant la signature.
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-emerald-200 bg-white p-4">
                <input
                  type="checkbox"
                  checked={reconnaissanceTravaux}
                  onChange={(event) =>
                    setReconnaissanceTravaux(event.target.checked)
                  }
                  className="mt-0.5 h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-sm leading-6 text-slate-700">
                  Je reconnais que les travaux ont été réalisés conformément au
                  devis accepté, sous réserve des éventuelles réserves indiquées
                  dans le présent document.
                </span>
              </label>

              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-emerald-200 bg-white p-4">
                <input
                  type="checkbox"
                  checked={reconnaissanceEvacuation}
                  onChange={(event) =>
                    setReconnaissanceEvacuation(event.target.checked)
                  }
                  className="mt-0.5 h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-sm leading-6 text-slate-700">
                  Je reconnais que les déchets ont été évacués ou laissés sur
                  place conformément aux conditions prévues.
                </span>
              </label>
            </div>
          </section>
        ) : null}

        <section>
          <div className="mb-4">
            <h3 className="font-bold text-slate-950">Signatures</h3>
            <p className="mt-1 text-sm text-slate-500">
              La signature de l’entreprise est toujours obligatoire.
            </p>
          </div>

          <div
            className={`grid gap-4 ${
              clientPresent ? "lg:grid-cols-2" : "max-w-2xl"
            }`}
          >
            {clientPresent ? (
              <SignaturePad
                label="Signature client *"
                valeur={signatureClient}
                onChange={setSignatureClient}
              />
            ) : null}

            <SignaturePad
              label="Signature entreprise *"
              valeur={signatureEntreprise}
              onChange={setSignatureEntreprise}
            />
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="font-bold text-slate-950">
                {pvComplet
                  ? "Le PV contient les informations obligatoires."
                  : "Le PV doit encore être complété."}
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                L’enregistrement est nécessaire avant le téléchargement ou
                l’envoi au client.
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => void chargerPvEtEmail()}
                disabled={enregistrement || suppression}
                className="min-h-12 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Annuler les modifications
              </button>

              <button
                type="button"
                onClick={() => void enregistrerPv()}
                disabled={enregistrement || suppression}
                className="min-h-12 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {enregistrement ? "Enregistrement…" : "Enregistrer le PV"}
              </button>
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}