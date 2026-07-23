import { supabase } from "@/lib/supabaseClient";
import {
  verifierAppareilConfiance,
} from "@/lib/auth/appareilConfianceClient";

export type TypeFacteurMfa = "phone" | "totp";

export type FacteurMfaArboboard = {
  id: string;
  status: "verified" | "unverified" | string;
  friendly_name?: string | null;
  phone?: string | null;
  factor_type?: string | null;
  type?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type EtapeMfaPreparee = {
  necessaire: boolean;
  facteur: FacteurMfaArboboard | null;
  typeFacteur: "totp" | null;
  challengeId: string | null;
};

function typeFacteur(
  facteur: FacteurMfaArboboard
): TypeFacteurMfa | null {
  const type = String(
    facteur.factor_type || facteur.type || ""
  )
    .trim()
    .toLowerCase();

  if (type === "totp") return "totp";
  if (type === "phone" || facteur.phone) {
    return "phone";
  }

  return null;
}

export function obtenirTypeFacteurMfa(
  facteur: FacteurMfaArboboard | null
) {
  return facteur
    ? typeFacteur(facteur)
    : null;
}

export function extraireFacteursMfa(
  data: unknown
): FacteurMfaArboboard[] {
  const resultat = data as
    | {
        all?: FacteurMfaArboboard[];
        phone?: FacteurMfaArboboard[];
        totp?: FacteurMfaArboboard[];
      }
    | null
    | undefined;

  const tous = [
    ...(resultat?.all || []),
    ...(resultat?.totp || []),
    ...(resultat?.phone || []),
  ];

  const uniques = new Map<
    string,
    FacteurMfaArboboard
  >();

  for (const facteur of tous) {
    if (facteur?.id) {
      uniques.set(
        facteur.id,
        facteur
      );
    }
  }

  return Array.from(
    uniques.values()
  );
}

export function choisirFacteurMfaConnexion(
  facteurs: FacteurMfaArboboard[]
) {
  return (
    facteurs.find(
      (facteur) =>
        facteur.status === "verified" &&
        typeFacteur(facteur) === "totp"
    ) || null
  );
}

export async function preparerMfaApresConnexion(): Promise<EtapeMfaPreparee> {
  const { data: niveau, error: niveauError } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  if (niveauError) {
    throw niveauError;
  }

  if (
    niveau.currentLevel === "aal2" ||
    niveau.nextLevel !== "aal2"
  ) {
    return {
      necessaire: false,
      facteur: null,
      typeFacteur: null,
      challengeId: null,
    };
  }

  const appareilReconnu =
    await verifierAppareilConfiance();

  if (appareilReconnu) {
    return {
      necessaire: false,
      facteur: null,
      typeFacteur: null,
      challengeId: null,
    };
  }

  const { data: facteursData, error: facteursError } =
    await supabase.auth.mfa.listFactors();

  if (facteursError) {
    throw facteursError;
  }

  const facteurs =
    extraireFacteursMfa(
      facteursData
    );

  const facteur =
    choisirFacteurMfaConnexion(
      facteurs
    );

  if (!facteur) {
    const ancienTelephoneVerifie =
      facteurs.some(
        (element) =>
          element.status === "verified" &&
          typeFacteur(element) === "phone"
      );

    if (ancienTelephoneVerifie) {
      throw new Error(
        "Ce compte utilise encore un ancien facteur MFA par téléphone. Activez d'abord l'application d'authentification depuis la sécurité du compte, puis supprimez le facteur téléphone."
      );
    }

    throw new Error(
      "La double authentification est active, mais aucune application d'authentification vérifiée n'a été trouvée."
    );
  }

  const { data: challenge, error: challengeError } =
    await supabase.auth.mfa.challenge({
      factorId: facteur.id,
    });

  if (challengeError) {
    throw challengeError;
  }

  return {
    necessaire: true,
    facteur,
    typeFacteur: "totp",
    challengeId: challenge.id,
  };
}

export async function verifierCodeMfa(params: {
  facteurId: string;
  challengeId: string;
  code: string;
}) {
  const code = params.code
    .replace(/\D/g, "")
    .slice(0, 8);

  if (code.length < 6) {
    throw new Error(
      "Saisissez le code à 6 chiffres affiché dans votre application d'authentification."
    );
  }

  const { error } =
    await supabase.auth.mfa.verify({
      factorId: params.facteurId,
      challengeId: params.challengeId,
      code,
    });

  if (error) {
    throw error;
  }
}

/**
 * Compatibilité temporaire avec les anciens imports téléphone.
 */
export function normaliserNumeroTelephone(
  valeur: string
) {
  return valeur.trim();
}

export function masquerNumeroTelephone(
  valeur: string | null | undefined
) {
  const numero =
    String(valeur || "").trim();

  if (!numero) return "numéro masqué";
  if (numero.length <= 5) return numero;

  return `${numero.slice(0, 4)}••••${numero.slice(-3)}`;
}

export async function renvoyerCodeMfa(
  facteurId: string
) {
  const { data, error } =
    await supabase.auth.mfa.challenge({
      factorId: facteurId,
    });

  if (error) {
    throw error;
  }

  return data.id;
}

export function messageErreurMfa(
  error: unknown
) {
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    const message = error.message;
    const normalisee =
      message.toLowerCase();

    if (
      normalisee.includes("invalid") &&
      (
        normalisee.includes("code") ||
        normalisee.includes("challenge") ||
        normalisee.includes("verification") ||
        normalisee.includes("totp")
      )
    ) {
      return "Le code est incorrect ou a expiré. Attendez le prochain code affiché dans l'application puis recommencez.";
    }

    if (
      normalisee.includes("factor") &&
      normalisee.includes("already")
    ) {
      return "Une application d'authentification est déjà enregistrée sur ce compte.";
    }

    if (
      normalisee.includes("aal2") ||
      normalisee.includes("assurance level")
    ) {
      return "Validez d'abord votre code de sécurité avant de modifier la double authentification.";
    }

    if (
      normalisee.includes("rate limit")
    ) {
      return "Trop de tentatives ont été effectuées. Patientez quelques instants avant de recommencer.";
    }

    return message;
  }

  return "Une erreur inattendue est survenue.";
}