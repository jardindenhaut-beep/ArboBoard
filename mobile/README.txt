ARBOBOARD MOBILE V1 — PACK GLOBAL

Ce ZIP contient :
- le projet React/Vite complet ;
- Supabase ;
- authentification Chef / Salarié ;
- MFA TOTP ;
- navigation mobile complète ;
- espace Chef : dashboard, clients, devis, factures, interventions, planning, salariés, profil ;
- espace Salarié : dashboard, interventions, planning, détail chantier, matériel, arrivée, photos, fin d’intervention, demandes, profil ;
- Capacitor Android + iOS déjà déclaré dans package.json ;
- appId : fr.arboboard.app ;
- configuration commune Android/iOS.

IMPORTANT
Le fichier .env.local n'est volontairement PAS inclus, afin de ne pas diffuser vos clés.
Conservez votre .env.local actuel ou créez-le à partir de .env.example.

INSTALLATION DANS LE PROJET ACTUEL
1. Fermer npm run dev.
2. Garder une copie de votre .env.local actuel.
3. Copier le contenu de ce ZIP dans C:\Users\Tour\Desktop\arboboard\mobile
4. Remettre votre .env.local si nécessaire.
5. npm install
6. npm run build
7. npm run dev
8. Pour Android : npm run android:sync

IOS
Le même code React/Supabase sera utilisé.
Sur un Mac avec Xcode :
- npm install
- npx cap add ios
- npm run ios:sync
- npm run ios:open

Remarque :
Les opérations serveur qui existent déjà sur arboboard.fr (PDF, e-mails, Stripe, etc.) ne doivent pas être recopiées avec une clé service-role dans l’application mobile. Le mobile utilise uniquement la clé Supabase anon + les règles RLS.
