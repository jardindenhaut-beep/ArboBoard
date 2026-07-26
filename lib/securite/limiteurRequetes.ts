type EntreeLimiteur = {
  tentatives: number;
  reinitialisationAt: number;
};

type OptionsLimiteur = {
  cle: string;
  limite: number;
  fenetreMs: number;
};

export type ResultatLimiteur = {
  autorise: boolean;
  limite: number;
  restant: number;
  reinitialisationAt: number;
  retryAfterSecondes: number;
};

const stockageGlobal = globalThis as typeof globalThis & {
  __arboboardLimiteurRequetes?: Map<string, EntreeLimiteur>;
};

const stockage =
  stockageGlobal.__arboboardLimiteurRequetes ??
  new Map<string, EntreeLimiteur>();

if (!stockageGlobal.__arboboardLimiteurRequetes) {
  stockageGlobal.__arboboardLimiteurRequetes = stockage;
}

const MAX_ENTREES = 10_000;

function nettoyerStockage(maintenant: number) {
  if (stockage.size < MAX_ENTREES) return;

  for (const [cle, entree] of stockage.entries()) {
    if (entree.reinitialisationAt <= maintenant) {
      stockage.delete(cle);
    }
  }

  if (stockage.size < MAX_ENTREES) return;

  const nombreASupprimer =
    stockage.size - MAX_ENTREES + 1;

  let supprimees = 0;

  for (const cle of stockage.keys()) {
    stockage.delete(cle);
    supprimees += 1;

    if (supprimees >= nombreASupprimer) {
      break;
    }
  }
}

export function obtenirAdresseIp(request: Request) {
  const vercelIp =
    request.headers.get("x-vercel-forwarded-for");

  const forwardedFor =
    vercelIp ||
    request.headers.get("x-forwarded-for");

  const premiereIp = forwardedFor
    ?.split(",")
    .map((valeur) => valeur.trim())
    .find(Boolean);

  return (
    premiereIp ||
    request.headers.get("x-real-ip") ||
    "ip-inconnue"
  );
}

export function verifierLimiteRequetes({
  cle,
  limite,
  fenetreMs,
}: OptionsLimiteur): ResultatLimiteur {
  const maintenant = Date.now();

  nettoyerStockage(maintenant);

  const entreeExistante = stockage.get(cle);

  if (
    !entreeExistante ||
    entreeExistante.reinitialisationAt <= maintenant
  ) {
    const reinitialisationAt =
      maintenant + fenetreMs;

    stockage.set(cle, {
      tentatives: 1,
      reinitialisationAt,
    });

    return {
      autorise: true,
      limite,
      restant: Math.max(0, limite - 1),
      reinitialisationAt,
      retryAfterSecondes: 0,
    };
  }

  if (entreeExistante.tentatives >= limite) {
    const retryAfterSecondes = Math.max(
      1,
      Math.ceil(
        (entreeExistante.reinitialisationAt -
          maintenant) /
          1000
      )
    );

    return {
      autorise: false,
      limite,
      restant: 0,
      reinitialisationAt:
        entreeExistante.reinitialisationAt,
      retryAfterSecondes,
    };
  }

  entreeExistante.tentatives += 1;
  stockage.set(cle, entreeExistante);

  return {
    autorise: true,
    limite,
    restant: Math.max(
      0,
      limite - entreeExistante.tentatives
    ),
    reinitialisationAt:
      entreeExistante.reinitialisationAt,
    retryAfterSecondes: 0,
  };
}

export function entetesLimiteRequetes(
  resultat: ResultatLimiteur
) {
  return {
    "RateLimit-Limit": String(resultat.limite),
    "RateLimit-Remaining": String(resultat.restant),
    "RateLimit-Reset": String(
      Math.ceil(resultat.reinitialisationAt / 1000)
    ),
    ...(resultat.autorise
      ? {}
      : {
          "Retry-After": String(
            resultat.retryAfterSecondes
          ),
        }),
  };
}