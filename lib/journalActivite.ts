import { supabase } from "@/lib/supabaseClient";

export type ResultatJournal =
  | "succes"
  | "echec"
  | "information";

export type EntreeJournalActivite = {
  action: string;
  categorie?: string;
  ressource_type?: string | null;
  ressource_id?: string | null;
  resultat?: ResultatJournal;
  description?: string | null;
  details?: Record<string, unknown>;
};

type ReponseJournal = {
  succes?: boolean;
  erreur?: string;
};

export async function journaliserActivite(
  entree: EntreeJournalActivite
): Promise<boolean> {
  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.access_token) {
      console.warn(
        "Journal d’activité : aucune session active."
      );
      return false;
    }

    const reponse = await fetch(
      "/api/securite/journal-activite",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(entree),
      }
    );

    const donnees =
      (await reponse.json().catch(() => ({}))) as ReponseJournal;

    if (!reponse.ok) {
      console.warn(
        "Journal d’activité non enregistré :",
        donnees.erreur || reponse.statusText
      );
      return false;
    }

    return donnees.succes === true;
  } catch (error) {
    console.warn(
      "Erreur silencieuse du journal d’activité :",
      error
    );
    return false;
  }
}