-- ARBOBOARD — BROUILLONS JURIDIQUES COMPLETS V1
-- Date : 26/07/2026
-- Ce script remplace uniquement les BROUILLONS.
-- Il ne publie rien automatiquement.
-- Après exécution, relire chaque document dans :
-- /chef/securite/documents-juridiques
-- puis utiliser le bouton Publier.

BEGIN;


UPDATE public.documents_juridiques_plateforme
SET
  titre_brouillon = 'Mentions légales',
  contenu_brouillon = $mentions$
# Mentions légales

Dernière mise à jour : 26 juillet 2026

## Éditeur du site et du service

Le site arboboard.fr et l’application ArboBoard sont édités par :

- Dénomination sociale : ArboBoard
- Forme juridique : Société par actions simplifiée à associé unique (SASU)
- Capital social : 10,00 €
- Siège social : 1 Hameau du Moulin Neuf, 03500 Châtel-de-Neuvre, France
- SIREN : 106 289 044
- SIRET : 106 289 044 00013
- Immatriculation : 106 289 044 RCS Cusset
- Numéro de TVA intracommunautaire : FR14 106289044
- Adresse électronique : contact@arboboard.fr
- Téléphone : 07 83 06 71 67

## Directeur de la publication

Le directeur de la publication est Monsieur Djily BOUCHET, Président de la société ArboBoard.

## Hébergement

Le site et l’application sont principalement hébergés par :

Vercel Inc.
440 N Barranca Avenue, #4133
Covina, CA 91723
États-Unis

Le nom de domaine est géré par OVH SAS, 2 rue Kellermann, 59100 Roubaix, France.

Les services applicatifs et les données peuvent également être traités par des prestataires techniques identifiés dans la Politique de confidentialité, notamment Supabase pour la base de données, l’authentification et le stockage, Stripe pour les paiements et Resend pour l’envoi d’e-mails.

## Propriété intellectuelle

La structure, l’identité visuelle, les textes, les éléments graphiques, le code, les bases de données, les marques et les fonctionnalités d’ArboBoard sont protégés par les règles applicables à la propriété intellectuelle.

Toute reproduction, représentation, adaptation, extraction ou exploitation, totale ou partielle, sans autorisation écrite préalable d’ArboBoard est interdite, sauf exception légale.

Les dénominations et marques appartenant à des tiers restent la propriété de leurs titulaires respectifs.

## Responsabilité

ArboBoard s’efforce de fournir des informations exactes et un service disponible. La société ne garantit toutefois pas l’absence permanente d’erreur, d’interruption ou de vulnérabilité.

Les informations et documents produits par l’application doivent être vérifiés par l’utilisateur avant leur utilisation, leur envoi ou leur transmission à un tiers. ArboBoard ne fournit pas de conseil juridique, fiscal, comptable, social ou technique personnalisé.

## Signalement

Toute erreur, vulnérabilité, atteinte aux droits ou contenu manifestement illicite peut être signalé à contact@arboboard.fr.

## Contact

Pour toute question relative au site ou au service :

- E-mail : contact@arboboard.fr
- Téléphone : 07 83 06 71 67
- Courrier : ArboBoard, 1 Hameau du Moulin Neuf, 03500 Châtel-de-Neuvre, France
$mentions$,
  version_brouillon = '1.0',
  updated_at = now()
WHERE type_document = 'mentions_legales';


UPDATE public.documents_juridiques_plateforme
SET
  titre_brouillon = 'Politique de confidentialité',
  contenu_brouillon = $confidentialite$
# Politique de confidentialité

Dernière mise à jour : 26 juillet 2026

## 1. Objet

La présente politique explique comment ArboBoard traite les données personnelles liées à son site, à son application, à ses comptes utilisateurs, à ses abonnements et à son assistance.

Elle distingue les traitements réalisés par ArboBoard pour ses propres besoins et les traitements réalisés pour le compte des entreprises clientes.

## 2. Responsable du traitement

Pour la gestion du site, des comptes, de la sécurité, des abonnements, de la facturation et de la relation commerciale, le responsable du traitement est :

ArboBoard, SASU au capital de 10,00 €, immatriculée sous le numéro 106 289 044 RCS Cusset, dont le siège social est situé 1 Hameau du Moulin Neuf, 03500 Châtel-de-Neuvre, France.

Contact relatif aux données personnelles : contact@arboboard.fr.

## 3. Rôle d’ArboBoard pour les données des entreprises clientes

Lorsqu’une entreprise cliente enregistre dans ArboBoard des données relatives à ses propres clients, prospects, salariés, apprentis, fournisseurs ou intervenants, cette entreprise détermine les finalités et les moyens essentiels du traitement.

Dans ce cas :

- l’entreprise cliente agit en qualité de responsable du traitement ;
- ArboBoard agit en qualité de sous-traitant, uniquement pour fournir le service ;
- l’entreprise cliente doit informer les personnes concernées, disposer d’une base légale et respecter leurs droits ;
- ArboBoard ne réutilise pas ces données à des fins publicitaires ou commerciales propres.

Les obligations détaillées de sous-traitance peuvent être précisées dans un accord de traitement des données ou dans les conditions contractuelles applicables.

## 4. Données traitées

Selon les fonctions utilisées, ArboBoard peut traiter :

- identité, coordonnées et fonction des utilisateurs ;
- informations relatives à l’entreprise abonnée ;
- identifiants de compte et données d’authentification ;
- facteurs de double authentification et appareils de confiance ;
- adresses IP, journaux de connexion, événements de sécurité et traces d’activité ;
- offre souscrite, statut d’abonnement, références de facturation et historique de paiement ;
- échanges avec l’assistance ;
- données professionnelles enregistrées par les utilisateurs, telles que clients, devis, factures, interventions, plannings, salariés, photos, signatures et documents ;
- consentements et demandes d’exercice de droits.

ArboBoard ne demande jamais à connaître le mot de passe en clair de l’utilisateur ni les données complètes de sa carte bancaire.

## 5. Finalités et bases légales

Les traitements sont réalisés pour les finalités suivantes :

- création et gestion des comptes : exécution du contrat ;
- fourniture des fonctionnalités ArboBoard : exécution du contrat ;
- gestion des abonnements, paiements et factures : exécution du contrat et obligations légales ;
- authentification, sécurité, prévention des abus, sauvegardes et journalisation : intérêt légitime d’ArboBoard à sécuriser le service et, selon les cas, obligation légale ;
- assistance, suivi des demandes et amélioration du service : exécution du contrat ou intérêt légitime ;
- gestion comptable, fiscale et probatoire : obligation légale et intérêt légitime ;
- communications facultatives ou prospection électronique : consentement lorsqu’il est requis ou intérêt légitime dans les cas autorisés.

Lorsque le traitement repose sur le consentement, celui-ci peut être retiré à tout moment sans remettre en cause les traitements antérieurs.

## 6. Caractère obligatoire des informations

Les informations signalées comme obligatoires sont nécessaires à la création du compte, à la souscription ou au fonctionnement du service. Leur absence peut empêcher la fourniture de la fonctionnalité concernée.

Les autres informations sont facultatives.

## 7. Destinataires

Les données peuvent être accessibles, dans la limite de leurs attributions, aux personnes habilitées d’ArboBoard ainsi qu’aux prestataires nécessaires au service, notamment :

- Supabase : base de données, authentification, stockage et services backend ;
- Vercel : hébergement et déploiement de l’application web ;
- Stripe : souscription, paiement, facturation et portail client ;
- Resend : envoi d’e-mails transactionnels ;
- OVHcloud : gestion du nom de domaine et services associés ;
- conseils professionnels, autorités administratives ou judiciaires lorsque la loi l’exige.

ArboBoard ne vend pas les données personnelles.

## 8. Paiements

Les paiements sont traités par Stripe. ArboBoard reçoit uniquement les informations nécessaires au suivi de la transaction et de l’abonnement, telles que l’état du paiement, les références Stripe, les montants et les dates.

Les données complètes de carte bancaire sont traitées directement par Stripe et ne sont pas stockées dans la base de données ArboBoard.

## 9. Transferts internationaux

Certains prestataires peuvent traiter des données en dehors de l’Espace économique européen.

Lorsqu’un transfert international a lieu, ArboBoard s’appuie sur un mécanisme reconnu par le RGPD, notamment une décision d’adéquation, les clauses contractuelles types de la Commission européenne ou des garanties complémentaires appropriées.

Les emplacements et garanties peuvent évoluer selon les options techniques et contractuelles des prestataires.

## 10. Durées de conservation

Les données sont conservées pendant une durée proportionnée à leur finalité :

- données de compte et données professionnelles : pendant la relation contractuelle ;
- données nécessaires à la facturation et à la comptabilité : pendant les durées légales applicables ;
- demandes d’assistance et éléments de preuve contractuelle : pendant la durée nécessaire au traitement puis pendant la prescription applicable ;
- journaux techniques et de sécurité : pendant une durée limitée nécessaire à la sécurité et à la preuve des opérations ;
- données de prospection : pendant la durée autorisée par la réglementation ou jusqu’à opposition ;
- appareils de confiance : jusqu’à leur expiration, fixée à 90 jours, ou leur révocation.

À la fin du contrat, les données peuvent être conservées temporairement pour permettre leur restitution, traiter un litige, respecter une obligation légale ou assurer la purge des sauvegardes. Elles sont ensuite supprimées ou anonymisées.

## 11. Sécurité

ArboBoard met en œuvre des mesures techniques et organisationnelles adaptées, notamment :

- contrôle des accès par compte et par entreprise ;
- politiques de sécurité au niveau de la base de données ;
- chiffrement des communications ;
- gestion sécurisée des sessions ;
- double authentification facultative ;
- appareils de confiance révocables ;
- journalisation des actions sensibles ;
- limitation des accès administratifs ;
- sauvegardes et maintenance de sécurité.

Aucune transmission ou conservation de données ne peut toutefois être garantie comme totalement exempte de risque.

## 12. Cookies et stockage local

ArboBoard utilise des cookies ou technologies similaires strictement nécessaires :

- à la connexion et au maintien de la session ;
- à la sécurité et à la double authentification ;
- à la reconnaissance temporaire d’un appareil de confiance ;
- au fonctionnement des fonctions essentielles.

Ces traceurs nécessaires ne requièrent pas de consentement préalable. ArboBoard n’utilise pas, à la date de la présente politique, de cookie publicitaire propre.

Des services tiers, notamment Stripe lors du paiement, peuvent déposer leurs propres traceurs selon leurs politiques.

## 13. Droits des personnes

Selon les conditions prévues par la réglementation, toute personne dispose des droits suivants :

- accès à ses données ;
- rectification ;
- effacement ;
- limitation ;
- opposition ;
- portabilité lorsque ce droit est applicable ;
- retrait du consentement ;
- définition de directives relatives au sort de ses données après son décès, lorsque la loi le permet.

Une demande peut être adressée à contact@arboboard.fr ou par courrier au siège social.

ArboBoard peut demander un justificatif raisonnable lorsque cela est nécessaire pour vérifier l’identité du demandeur. Une réponse est apportée dans les délais réglementaires.

Lorsque la demande concerne des données enregistrées par une entreprise cliente, la personne doit en priorité contacter cette entreprise, qui agit comme responsable du traitement. ArboBoard l’assistera dans la mesure prévue par ses obligations de sous-traitant.

## 14. Réclamation auprès de la CNIL

Toute personne peut introduire une réclamation auprès de la Commission nationale de l’informatique et des libertés, sans préjudice de tout autre recours.

## 15. Modifications

La présente politique peut être mise à jour pour tenir compte des évolutions du service, des prestataires ou de la réglementation.

La date de dernière mise à jour figure en haut du document. En cas de modification importante, une information adaptée pourra être affichée dans l’application ou adressée aux utilisateurs.
$confidentialite$,
  version_brouillon = '1.0',
  updated_at = now()
WHERE type_document = 'politique_confidentialite';


UPDATE public.documents_juridiques_plateforme
SET
  titre_brouillon = 'Conditions générales d’utilisation',
  contenu_brouillon = $cgu$
# Conditions générales d’utilisation

Version 1.0 — Entrée en vigueur : 26 juillet 2026

## 1. Objet

Les présentes conditions générales d’utilisation définissent les règles d’accès et d’utilisation du site arboboard.fr et de l’application ArboBoard.

ArboBoard est un logiciel de gestion destiné aux professionnels du paysage, de l’élagage, de l’entretien extérieur et activités professionnelles connexes.

## 2. Acceptation

L’accès à un compte et l’utilisation du service impliquent l’acceptation des présentes CGU.

L’utilisateur qui agit pour une entreprise déclare disposer de l’autorisation nécessaire pour utiliser le service au nom de celle-ci.

## 3. Accès au service

L’accès nécessite un équipement compatible, une connexion internet et un compte actif.

Certaines fonctions dépendent de l’offre souscrite, du rôle attribué, des autorisations de l’entreprise et du statut de l’abonnement.

ArboBoard peut refuser ou suspendre un accès en cas de compte inactif, abonnement expiré, incident de paiement, risque de sécurité ou violation des présentes conditions.

## 4. Compte utilisateur

L’utilisateur doit :

- fournir des informations exactes et les maintenir à jour ;
- conserver ses identifiants confidentiels ;
- utiliser un mot de passe robuste ;
- ne pas partager son compte personnel ;
- signaler sans délai toute utilisation non autorisée ;
- révoquer les accès des personnes qui ne sont plus autorisées.

Toute action effectuée depuis un compte est présumée réalisée par son titulaire ou sous sa responsabilité, sauf preuve contraire.

## 5. Double authentification et appareils de confiance

ArboBoard peut proposer une double authentification par application TOTP.

L’utilisateur peut enregistrer un navigateur comme appareil de confiance pendant une durée maximale de 90 jours. Il reste responsable de la sécurité physique de l’appareil et doit révoquer immédiatement tout appareil perdu, vendu, partagé ou compromis.

La suppression des cookies, la navigation privée, la révocation ou l’expiration de la confiance peut entraîner une nouvelle demande de code.

## 6. Utilisation autorisée

Le service doit être utilisé uniquement dans un cadre professionnel, conformément à sa destination, aux présentes CGU et aux lois applicables.

Il est interdit notamment de :

- tenter d’accéder aux données d’une autre entreprise ;
- contourner les restrictions de sécurité ou de l’offre souscrite ;
- perturber le service ou tester sa sécurité sans autorisation ;
- introduire un programme malveillant ;
- utiliser le service à des fins frauduleuses ou illicites ;
- extraire massivement les données, copier le logiciel ou créer un service concurrent à partir de ses éléments protégés ;
- transmettre des contenus illicites, diffamatoires, dangereux ou portant atteinte aux droits d’un tiers.

## 7. Données et contenus de l’entreprise

L’entreprise cliente reste propriétaire ou titulaire des droits sur les données qu’elle enregistre.

Elle garantit :

- disposer d’une base légale pour traiter les données personnelles ;
- informer les personnes concernées ;
- disposer des droits nécessaires sur les documents, photos, signatures et contenus ajoutés ;
- ne pas enregistrer de données excessives ou sans lien avec son activité ;
- vérifier l’exactitude et la légalité des contenus.

ArboBoard traite ces données pour fournir le service et n’en acquiert aucun droit de propriété.

## 8. Documents générés

ArboBoard peut produire des devis, factures, avoirs, fiches d’intervention, plannings, procès-verbaux et autres documents à partir des informations saisies.

L’utilisateur doit vérifier avant usage :

- l’identité des parties ;
- les montants, taxes, dates et numéros ;
- les mentions légales et contractuelles ;
- l’exactitude des travaux, prestations et conditions ;
- la conformité aux obligations propres à son activité.

ArboBoard est un outil technique et ne remplace pas les conseils d’un avocat, expert-comptable, fiscaliste, organisme social ou autre professionnel compétent.

## 9. Disponibilité et maintenance

ArboBoard s’efforce d’assurer la disponibilité du service, sans garantir un fonctionnement continu ou sans erreur.

Des interruptions peuvent intervenir pour maintenance, mise à jour, sécurité, incident technique, intervention d’un prestataire ou cas de force majeure.

Lorsque cela est raisonnablement possible, les opérations importantes de maintenance sont organisées pour réduire leur impact.

## 10. Assistance

L’assistance est accessible à l’adresse contact@arboboard.fr.

Le niveau ou la priorité de support peut dépendre de l’offre souscrite. L’assistance ne comprend pas les prestations de conseil juridique, fiscal, comptable, social ou informatique propres à l’entreprise cliente.

## 11. Propriété intellectuelle

ArboBoard et ses éléments restent la propriété exclusive de la société ArboBoard ou de leurs titulaires respectifs.

L’utilisateur bénéficie uniquement d’un droit personnel, non exclusif, non cessible et limité à la durée de son accès au service.

Aucune cession de code source, marque, base de données, méthode, interface ou autre droit de propriété intellectuelle n’est consentie.

## 12. Sécurité

L’utilisateur doit appliquer les mises à jour de son navigateur et de son système, protéger ses appareils et limiter les droits de ses utilisateurs.

ArboBoard peut imposer une reconnexion, révoquer une session, bloquer un compte ou demander une vérification supplémentaire en cas de risque.

## 13. Suspension et suppression

ArboBoard peut suspendre immédiatement tout ou partie du service en cas :

- d’utilisation illicite ou dangereuse ;
- d’atteinte à la sécurité ;
- de tentative d’accès non autorisé ;
- de violation grave des présentes CGU ;
- de demande d’une autorité compétente ;
- de défaut de paiement selon les CGV.

Sauf urgence ou obligation légale, ArboBoard s’efforce d’informer l’entreprise concernée et de lui permettre de régulariser.

## 14. Responsabilité

Chaque utilisateur est responsable de ses saisies, de ses décisions, de ses documents et de l’usage qu’il fait du service.

ArboBoard n’est pas responsable des dommages résultant notamment :

- d’une donnée erronée ou incomplète saisie par l’utilisateur ;
- d’une mauvaise configuration ;
- du partage d’identifiants ;
- d’un appareil compromis ;
- de l’utilisation d’un document non vérifié ;
- d’un service tiers ou d’une connexion internet ;
- d’un usage contraire aux présentes CGU.

Les limitations applicables au client professionnel sont précisées dans les CGV.

## 15. Données personnelles

Les traitements de données sont décrits dans la Politique de confidentialité et, lorsqu’ArboBoard agit comme sous-traitant, dans les clauses contractuelles applicables.

## 16. Liens et services tiers

Le service peut permettre l’accès à des services tiers, notamment Stripe. Leur utilisation est également soumise à leurs propres conditions.

ArboBoard n’exerce pas de contrôle général sur ces services et n’est pas responsable de leur fonctionnement propre.

## 17. Modification des CGU

ArboBoard peut modifier les présentes CGU pour tenir compte d’une évolution légale, technique, fonctionnelle ou de sécurité.

La version applicable est celle portée à la connaissance de l’utilisateur. Une modification substantielle peut faire l’objet d’une information dans l’application ou par e-mail.

## 18. Droit applicable et litiges

Les présentes CGU sont soumises au droit français.

Les parties recherchent une solution amiable avant toute action judiciaire. À défaut d’accord, le litige relève des juridictions compétentes dans les conditions prévues par les CGV ou la loi applicable.
$cgu$,
  version_brouillon = '1.0',
  updated_at = now()
WHERE type_document = 'cgu';


UPDATE public.documents_juridiques_plateforme
SET
  titre_brouillon = 'Conditions générales de vente',
  contenu_brouillon = $cgv$
# Conditions générales de vente

Version 1.0 — Entrée en vigueur : 26 juillet 2026

## 1. Identité du fournisseur

Les abonnements ArboBoard sont fournis par :

ArboBoard, SASU au capital de 10,00 €, siège social 1 Hameau du Moulin Neuf, 03500 Châtel-de-Neuvre, SIREN 106 289 044, SIRET 106 289 044 00013, immatriculée sous le numéro 106 289 044 RCS Cusset, TVA FR14 106289044.

Contact : contact@arboboard.fr — 07 83 06 71 67.

## 2. Champ d’application

Les présentes CGV s’appliquent exclusivement aux abonnements souscrits par des professionnels agissant pour les besoins de leur activité.

Le service n’est pas commercialisé auprès des consommateurs. Les règles protectrices propres aux contrats conclus avec des consommateurs, notamment le droit de rétractation de quatorze jours, ne sont donc pas applicables.

La souscription est réalisée par une personne déclarant être habilitée à engager l’entreprise cliente.

## 3. Documents contractuels

Le contrat comprend, par ordre de priorité :

1. les conditions particulières affichées ou acceptées lors de la souscription ;
2. les présentes CGV ;
3. les CGU ;
4. la Politique de confidentialité ;
5. le détail fonctionnel de l’offre souscrite.

En cas de contradiction, le document de rang supérieur prévaut.

## 4. Description du service

ArboBoard est un logiciel en ligne de gestion professionnelle permettant, selon l’offre souscrite, de gérer notamment les clients, devis, factures, paiements, interventions, équipes, plannings, matériels, heures et indicateurs.

Les fonctionnalités peuvent évoluer afin d’améliorer, sécuriser ou mettre en conformité le service, sans supprimer les caractéristiques essentielles de l’offre pendant la période déjà payée.

Certaines fonctions dépendant d’une autorisation administrative, d’une API tierce ou d’un service externe peuvent être indisponibles, expérimentales ou activées ultérieurement.

## 5. Offres et tarifs

Les tarifs mensuels de référence à la date d’entrée en vigueur sont :

- Essentiel : 29,99 € HT par mois, un utilisateur inclus ;
- Pro : 39,99 € HT par mois, jusqu’à trois utilisateurs inclus ;
- Expert : 49,99 € HT par mois, jusqu’à dix utilisateurs inclus.

La TVA au taux légal applicable est ajoutée.

Le détail actualisé des fonctionnalités, limites et prix est présenté avant la souscription. Les informations affichées dans le parcours de commande et dans Stripe prévalent en cas d’évolution tarifaire.

Sauf mention contraire, aucun escompte n’est accordé pour paiement anticipé.

## 6. Souscription

La souscription est effectuée en ligne.

Le client doit :

- disposer d’un compte ArboBoard valide ;
- choisir une offre ;
- fournir les informations de facturation requises ;
- accepter les documents contractuels ;
- valider le paiement auprès de Stripe.

Le contrat est formé lorsque la souscription est confirmée et que le paiement ou la période d’essai est validé.

ArboBoard peut refuser une souscription en cas d’informations incomplètes, risque de fraude, incident antérieur, impossibilité technique ou demande illicite.

## 7. Période d’essai

ArboBoard peut proposer une période d’essai gratuite. Sa durée, ses fonctionnalités, ses limites et la nécessité éventuelle d’enregistrer un moyen de paiement sont indiquées avant son activation.

Sauf indication contraire dans le parcours de souscription, l’essai ne se transforme pas en abonnement payant sans action ou information préalable du client conforme au parcours affiché.

À l’expiration de l’essai, l’accès peut être limité ou bloqué tant qu’aucune offre payante n’est activée.

Une seule période d’essai peut être accordée par entreprise, sauf décision contraire d’ArboBoard.

## 8. Paiement et facturation

Le paiement est réalisé par carte bancaire ou tout autre moyen proposé dans l’interface sécurisée Stripe.

Les abonnements sont facturés d’avance selon la périodicité choisie. Les factures sont mises à disposition sous forme électronique.

Le client autorise Stripe et ArboBoard à prélever les échéances dues selon l’abonnement actif.

ArboBoard ne conserve pas les données complètes de carte bancaire.

## 9. Retard ou échec de paiement

En cas d’échec ou de retard de paiement, ArboBoard peut :

- effectuer ou faire effectuer une nouvelle tentative de paiement ;
- inviter le client à mettre à jour son moyen de paiement ;
- suspendre tout ou partie du service ;
- résilier l’abonnement après information du client.

Tout retard entraîne, de plein droit et sans rappel préalable :

- des pénalités calculées au taux appliqué par la Banque centrale européenne à son opération de refinancement la plus récente, majoré de dix points de pourcentage, sans pouvoir être inférieur à trois fois le taux d’intérêt légal ;
- une indemnité forfaitaire de 40 € pour frais de recouvrement ;
- une indemnisation complémentaire sur justificatifs lorsque les frais de recouvrement réellement exposés dépassent 40 €.

## 10. Durée et renouvellement

L’abonnement est conclu pour la période choisie lors de la commande, généralement mensuelle.

Il est renouvelé automatiquement pour des périodes successives de même durée jusqu’à sa résiliation.

Le tarif applicable au renouvellement est celui annoncé au client dans les conditions prévues à l’article relatif aux modifications tarifaires.

## 11. Changement d’offre

Le client peut demander un changement d’offre depuis l’application ou le portail Stripe lorsque cette fonction est disponible.

Les conséquences financières, notamment prorata, crédit, facturation immédiate ou prise d’effet à la prochaine échéance, sont affichées par Stripe avant confirmation.

Une baisse d’offre peut être refusée ou différée si les données, utilisateurs ou fonctions utilisées dépassent les limites de la nouvelle offre. Le client doit alors adapter son compte avant le changement.

## 12. Résiliation

Le client peut résilier depuis le portail de gestion d’abonnement accessible dans son compte, lorsqu’il est disponible, ou en contactant contact@arboboard.fr.

Sauf indication contraire lors de la confirmation :

- la résiliation prend effet à la fin de la période déjà payée ;
- l’accès reste disponible jusqu’à cette date ;
- les sommes déjà payées ne sont pas remboursées pour la période commencée ;
- aucun nouveau prélèvement n’est effectué après la date d’effet.

ArboBoard peut résilier ou suspendre le contrat en cas de manquement grave, usage illicite, atteinte à la sécurité ou impayé non régularisé.

## 13. Restitution et suppression des données

Avant la fin de l’accès, le client doit exporter ou récupérer les données dont il a besoin au moyen des fonctions disponibles.

Après la fin du contrat, ArboBoard peut maintenir un accès limité ou conserver temporairement les données afin de permettre leur restitution, régler un litige, respecter une obligation légale ou purger les sauvegardes.

À l’issue de cette période, les données sont supprimées ou anonymisées, sous réserve des données devant être conservées légalement.

Une prestation particulière de récupération ou de migration peut faire l’objet d’un devis.

## 14. Obligations du client

Le client doit :

- payer les échéances ;
- utiliser le service conformément à sa destination ;
- maintenir à jour ses coordonnées et moyens de paiement ;
- administrer les comptes et autorisations ;
- respecter le droit du travail, le droit fiscal, le droit comptable, le RGPD et les règles propres à son activité ;
- vérifier les documents générés avant usage ;
- sauvegarder ou exporter les éléments essentiels selon ses besoins ;
- ne pas porter atteinte au service ou aux droits d’un tiers.

## 15. Engagements d’ArboBoard

ArboBoard s’engage à :

- fournir les fonctionnalités de l’offre active ;
- mettre en œuvre des mesures de sécurité adaptées ;
- assurer une maintenance raisonnable ;
- traiter les données selon les documents contractuels ;
- informer le client des incidents significatifs lorsque la réglementation ou le contrat l’exige ;
- fournir une assistance selon l’offre souscrite.

ArboBoard est tenu à une obligation de moyens.

## 16. Assistance

L’assistance standard est accessible par e-mail à contact@arboboard.fr.

L’offre Expert peut bénéficier d’un traitement prioritaire. La priorité ne constitue pas une garantie de résolution dans un délai déterminé, sauf engagement écrit particulier.

## 17. Services tiers

Le service repose en partie sur des prestataires et infrastructures tiers, notamment Supabase, Vercel, Stripe, Resend et OVHcloud.

ArboBoard ne peut garantir leur disponibilité permanente. La responsabilité d’ArboBoard ne peut être engagée pour une interruption directement imputable à un tiers et échappant raisonnablement à son contrôle, sous réserve de ses obligations de choix, de sécurité et de continuité.

## 18. Propriété intellectuelle

Le contrat n’emporte aucune cession de propriété intellectuelle.

Le client bénéficie d’un droit d’utilisation interne, non exclusif, non transférable et limité à la durée de l’abonnement.

Toute copie, revente, mise à disposition de tiers, ingénierie inverse ou exploitation non autorisée est interdite.

## 19. Confidentialité

Chaque partie s’engage à protéger les informations confidentielles reçues de l’autre partie et à ne les utiliser que pour l’exécution du contrat.

Cette obligation ne s’applique pas aux informations déjà publiques, légitimement connues, reçues licitement d’un tiers ou dont la communication est exigée par la loi.

## 20. Données personnelles

Pour les traitements liés aux comptes, abonnements, paiements, sécurité et assistance, ArboBoard agit comme responsable du traitement.

Pour les données professionnelles saisies par le client pour gérer ses propres contacts, salariés, interventions ou documents, ArboBoard agit comme sous-traitant et le client comme responsable du traitement.

Les parties s’engagent à respecter le RGPD. Les détails figurent dans la Politique de confidentialité et, le cas échéant, dans un accord de sous-traitance.

## 21. Responsabilité

ArboBoard répond uniquement des dommages directs, prévisibles et prouvés résultant d’un manquement qui lui est imputable.

ArboBoard ne répond pas notamment :

- des pertes de chiffre d’affaires, bénéfice, clientèle, réputation ou opportunité ;
- des dommages indirects ;
- des erreurs de saisie ou de paramétrage ;
- de l’utilisation d’un document non vérifié ;
- d’une décision métier, juridique, fiscale, comptable ou sociale ;
- d’un accès frauduleux causé par une faute du client ;
- d’une défaillance d’internet ou d’un service tiers hors de son contrôle raisonnable.

Sauf faute lourde ou dolosive, atteinte corporelle, violation d’une obligation légale ne pouvant être limitée ou disposition impérative contraire, la responsabilité totale d’ArboBoard au titre d’une période de douze mois est plafonnée au montant HT payé par le client au cours des douze mois précédant le fait générateur.

## 22. Force majeure

Aucune partie n’est responsable d’un manquement causé par un événement échappant raisonnablement à son contrôle et répondant aux conditions légales de la force majeure.

La partie concernée informe l’autre partie dans un délai raisonnable et s’efforce de limiter les conséquences.

Si l’empêchement se prolonge au-delà de trente jours, chaque partie peut résilier la prestation affectée sans indemnité.

## 23. Évolution du service et des tarifs

ArboBoard peut faire évoluer les fonctions, les limites et les tarifs.

Une hausse tarifaire applicable à un abonnement en cours est portée à la connaissance du client avant son prochain renouvellement. Le client peut résilier avant la prise d’effet de la hausse.

Les modifications imposées par la loi, la sécurité ou un prestataire essentiel peuvent prendre effet plus rapidement lorsque cela est nécessaire.

## 24. Preuve

Les enregistrements informatiques, journaux d’activité, confirmations Stripe, e-mails et données enregistrées dans les systèmes d’ArboBoard peuvent constituer des éléments de preuve, sous réserve de leur fiabilité et des règles légales applicables.

## 25. Cession

Le client ne peut céder le contrat sans l’accord écrit préalable d’ArboBoard.

ArboBoard peut céder le contrat dans le cadre d’une restructuration, fusion, acquisition ou cession d’activité, sous réserve d’en informer le client et de préserver ses droits essentiels.

## 26. Nullité partielle

Si une clause est déclarée nulle ou inapplicable, les autres clauses restent en vigueur.

Les parties remplacent la clause concernée par une disposition valide ayant un effet économique aussi proche que possible.

## 27. Droit applicable et règlement des litiges

Les présentes CGV sont soumises au droit français.

En cas de difficulté, le client doit adresser une réclamation détaillée à contact@arboboard.fr. Les parties s’efforcent de trouver une solution amiable.

À défaut d’accord amiable dans un délai raisonnable, tout litige entre professionnels relatif à la validité, l’interprétation, l’exécution ou la cessation du contrat relève de la compétence exclusive des tribunaux du ressort de Cusset, y compris en cas de pluralité de défendeurs ou d’appel en garantie, sous réserve des règles impératives contraires.
$cgv$,
  version_brouillon = '1.0',
  updated_at = now()
WHERE type_document = 'cgv';


COMMIT;

SELECT
  type_document,
  titre_brouillon,
  version_brouillon,
  char_length(contenu_brouillon) AS longueur,
  publie_at
FROM public.documents_juridiques_plateforme
WHERE type_document IN (
  'mentions_legales',
  'politique_confidentialite',
  'cgu',
  'cgv'
)
ORDER BY type_document;