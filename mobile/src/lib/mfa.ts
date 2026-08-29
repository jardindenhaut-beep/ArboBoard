import { supabase } from "./supabase";

export async function preparerMfaApresConnexion() {
  const { data: niveau, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error) throw error;

  if (niveau.currentLevel === "aal2" || niveau.nextLevel !== "aal2") {
    return { necessaire: false, facteurId: null as string | null, challengeId: null as string | null };
  }

  const { data: facteursData, error: facteursError } = await supabase.auth.mfa.listFactors();
  if (facteursError) throw facteursError;

  const brut = facteursData as any;
  const facteurs = [...(brut?.all || []), ...(brut?.totp || []), ...(brut?.phone || [])];
  const facteur = facteurs.find(
    (f: any) => f?.status === "verified" && String(f?.factor_type || f?.type || "").toLowerCase() === "totp"
  );

  if (!facteur) throw new Error("La double authentification est active mais aucun facteur TOTP vérifié n’a été trouvé.");

  const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: facteur.id });
  if (challengeError) throw challengeError;

  return { necessaire: true, facteurId: facteur.id as string, challengeId: challenge.id as string };
}

export async function verifierCodeMfa(facteurId: string, challengeId: string, code: string) {
  const nettoye = code.replace(/\D/g, "").slice(0, 8);
  if (nettoye.length < 6) throw new Error("Saisissez le code à 6 chiffres.");

  const { error } = await supabase.auth.mfa.verify({
    factorId: facteurId,
    challengeId,
    code: nettoye,
  });
  if (error) throw error;
}
