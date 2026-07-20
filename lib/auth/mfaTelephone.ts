import { supabase } from "@/lib/supabaseClient";

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
  typeFacteur: TypeFacteurMfa | null;
  challengeId: string | null;
};

export function normaliserNumeroTelephone(
  valeur: string,
  paysParDefaut = "FR"
) {
  const brut = valeur.trim();

  if (!brut) {
    throw new Error("Le numéro de téléphone est obligatoire.");
  }

  let numero = brut.replace(/[()\s.-]/g, "");

  if (numero.startsWith("00")) {
    numero = `+${numero.slice(2)}`;
  }

  if (paysParDefaut === "FR" && /^0[67]\d{8}$/.test(numero)) {
    numero = `+33${numero.slice(1)}`;
  }

  if (paysParDefaut === "FR" && /^33[67]\d{8}$/.test(numero)) {
    numero = `+${numero}`;
  }

  if (!/^\+[1-9]\d{7,14}$/.test(numero)) {
    throw new Error(
      "Le numéro doit être au format international, par exemple +33612345678."
    );
  }

  return numero;
}

export function masquerNumeroTelephone(
  valeur: string | null | undefined
) {
  const numero = String(valeur || "").trim();

  if (!numero) return "numéro masqué";
  if (numero.length <= 5) return numero;

  return `${numero.slice(0, 4)}••••${numero.slice(-3)}`;
}

function typeFacteur(
  facteur: FacteurMfaArboboard
): TypeFacteurMfa | null {
  const type = String(
    facteur.factor_type || facteur.type || ""
  ).toLowerCase();

  if (type === "phone" || facteur.phone) return "phone";
  if (type === "totp") return "totp";

  return null;
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
    ...(resultat?.phone || []),
    ...(resultat?.totp || []),
  ];

  const uniques = new Map<string, FacteurMfaArboboard>();

  for (const facteur of tous) {
    if (facteur?.id) {
      uniques.set(facteur.id, facteur);
    }
  }

  return Array.from(uniques.values());
}

export function choisirFacteurMfaConnexion(
  facteurs: FacteurMfaArboboard[]
) {
  const verifies = facteurs.filter(
    (facteur) => facteur.status === "verified"
  );

  return (
    verifies.find(
      (facteur) => typeFacteur(facteur) === "phone"
    ) ||
    verifies.find(
      (facteur) => typeFacteur(facteur) === "totp"
    ) ||
    null
  );
}

export function obtenirTypeFacteurMfa(
  facteur: FacteurMfaArboboard | null
) {
  return facteur ? typeFacteur(facteur) : null;
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

  const { data: facteursData, error: facteursError } =
    await supabase.auth.mfa.listFactors();

  if (facteursError) {
    throw facteursError;
  }

  const facteur = choisirFacteurMfaConnexion(
    extraireFacteursMfa(facteursData)
  );

  if (!facteur) {
    throw new Error(
      "La double authentification est active, mais aucun facteur vérifié n’a été trouvé."
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
    typeFacteur: typeFacteur(facteur),
    challengeId: challenge.id,
  };
}

export async function renvoyerCodeMfa(
  facteurId: string
) {
  const { data, error } = await supabase.auth.mfa.challenge({
    factorId: facteurId,
  });

  if (error) {
    throw error;
  }

  return data.id;
}

export async function verifierCodeMfa(params: {
  facteurId: string;
  challengeId: string;
  code: string;
}) {
  const code = params.code.replace(/\D/g, "").slice(0, 8);

  if (code.length < 6) {
    throw new Error("Saisissez le code de vérification reçu.");
  }

  const { error } = await supabase.auth.mfa.verify({
    factorId: params.facteurId,
    challengeId: params.challengeId,
    code,
  });

  if (error) {
    throw error;
  }
}

export function messageErreurMfa(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    const message = error.message;
    const normalisee = message.toLowerCase();

    if (
      normalisee.includes("invalid") &&
      (normalisee.includes("code") ||
        normalisee.includes("challenge") ||
        normalisee.includes("verification"))
    ) {
      return "Le code est incorrect ou a expiré. Demandez un nouveau code puis recommencez.";
    }

    if (
      normalisee.includes("mfa enroll is disabled") &&
      normalisee.includes("phone")
    ) {
      return "La double authentification par téléphone n’est pas encore activée dans Supabase. Activez le MFA téléphone et configurez un fournisseur SMS avant de recommencer.";
    }

    if (
      normalisee.includes("phone") &&
      (
        normalisee.includes("provider") ||
        normalisee.includes("sms") ||
        normalisee.includes("disabled")
      )
    ) {
      return "L’envoi des codes par téléphone n’est pas encore disponible. Vérifiez l’activation du MFA téléphone et du fournisseur SMS dans Supabase.";
    }

    if (normalisee.includes("rate limit")) {
      return "Trop de tentatives ont été effectuées. Patientez avant de demander un nouveau code.";
    }

    return message;
  }

  return "Une erreur inattendue est survenue.";
}