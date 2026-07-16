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
};

export async function journaliserActivite(
  entree: EntreeJournalActivite
): Promise<boolean> {
  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (
      sessionError ||
      !session?.access_token
    ) {
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

    if (!reponse.ok) {
      return false;
    }

    const donnees =
      (await reponse
        .json()
        .catch(() => ({}))) as ReponseJournal;

    return donnees.succes === true;
  } catch {
    return false;
  }
}