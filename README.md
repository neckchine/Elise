# Mon cabinet — logiciel d'organisation pour praticiens

Application tout-en-un pour les praticiens non médecins (psychologues, psychothérapeutes, sophrologues, naturopathes, hypnothérapeutes, coachs…).

## Ce que fait l'application

| Écran | Fonctions |
|---|---|
| **Accueil** | La journée en un coup d'œil : RDV du jour, demandes en ligne à valider, rappels à envoyer, factures en retard, séances à facturer, chiffre du mois. |
| **Agenda** | Vue semaine / jour. Rendez-vous clients (cabinet ou visio) et événements personnels dans le même agenda. Clic sur un créneau vide → nouveau RDV. Répétition hebdomadaire, alerte en cas de chevauchement, statut (honoré, absent, annulé). |
| **RDV en ligne** | Page de réservation pour vos clients : créneaux libres calculés selon vos horaires et votre agenda. Les demandes arrivent sur l'accueil : « Accepter » crée le client et le RDV, puis prépare le message de confirmation. |
| **Clients** | Fiche client : coordonnées, « adressé par », notes privées, historique des séances, factures, courriers et messages. |
| **Factures** | Création en un clic depuis une séance, numérotation légale continue (2026-0001…), facture verrouillée une fois validée, PDF, envoi par e-mail ou WhatsApp, **relances**, suivi des paiements, « Tout facturer ». |
| **Comptabilité** | Recettes encaissées et dépenses par mois, résultat, reste à encaisser, export du **livre des recettes** (CSV pour Excel / votre comptable). |
| **Courriers** | Modèles : courrier d'adressage, réponse à un confrère, attestation de suivi, courrier libre. Pré-remplis avec les infos du client, prêts à imprimer avec votre en-tête. |
| **WhatsApp** | Messages pré-rédigés (rappel, confirmation, lien visio, relance), modèles personnalisables, historique des envois. |
| **Visio** | Un lien de visio unique par séance, envoyé par WhatsApp. Le client clique, sans rien installer. Visio immédiate possible. |
| **Paramètres** | Infos du cabinet, tarif, durée de séance, mention TVA, IBAN, horaires d'ouverture, sauvegarde / restauration des données. |

## Lancer l'application

Aucune installation : ouvrez `index.html` dans votre navigateur (Chrome, Edge, Firefox, Safari).
Des données d'exemple sont chargées au premier lancement ; vous pouvez les effacer dans **Paramètres → Tout effacer**.

Pour la tester comme un vrai site :

```bash
python3 -m http.server 8000
# puis ouvrir http://localhost:8000
```

La page publique de réservation est accessible à l'adresse `…/index.html#/reserver`.

## À savoir (version actuelle = prototype fonctionnel)

- **Données stockées dans le navigateur** de l'appareil utilisé. Faites des sauvegardes régulières (Paramètres → Télécharger une sauvegarde).
- **Rappels automatiques** (Paramètres) : la veille (24 h avant) et 30 minutes avant chaque séance, avec le lien de visio si besoin. Au bon moment, le rappel s'affiche dans un encadré, sur tous les écrans ; un clic l'envoie par WhatsApp. Chaque rendez-vous indique l'état de ses rappels (prévu, à envoyer, envoyé).
- **Cal.com** (Paramètres → Cal.com) : avec une clé API Cal.com, les réservations faites sur votre page Cal.com sont importées dans l'agenda (au démarrage puis toutes les 5 minutes), avec création de la fiche client. Les annulations et changements d'horaire sont repris. Les réservations en attente de confirmation ne sont importées qu'une fois confirmées sur Cal.com. La synchronisation ne fonctionne pas dans l'aperçu claude.ai, qui bloque les connexions vers d'autres sites : il faut ouvrir l'application elle-même.
- **Envoi sans aucun clic** : il faudra brancher l'API WhatsApp Business (Meta) sur un serveur. Les rappels sont déjà planifiés et suivis par l'application ; il restera à remplacer le bouton « Envoyer » par l'envoi direct. Meta exige des modèles de messages validés à l'avance pour les rappels.
- **WhatsApp (messages manuels)** : l'application ouvre WhatsApp avec le message déjà rédigé ; il reste à appuyer sur « Envoyer ».
- **Appels vidéo WhatsApp** : WhatsApp ne permet pas de lancer un appel vidéo depuis un site. L'application fournit donc un lien de visio (Jitsi Meet par défaut, modifiable), envoyé par WhatsApp.
- **Réservation en ligne** : pour que vos clients réservent depuis chez eux, l'application doit être hébergée en ligne avec une base de données partagée (étape suivante).
- **Données de santé / RGPD** : pour une mise en ligne, les données des patients doivent être hébergées chez un **hébergeur certifié HDS** (Hébergeur de Données de Santé), avec connexion sécurisée.

## Structure du code

```
index.html          page principale
css/app.css         styles de l'application
js/documents.js     mise en page des factures et courriers (impression, PDF, aperçu)
js/utils.js         dates, montants, liens WhatsApp / e-mail
js/store.js         stockage des données, numérotation des factures, créneaux libres
js/demo.js          données d'exemple
js/ui.js            icônes, fenêtres, notifications
js/actions.js       actions communes : RDV, factures, relances, messages, clients
js/reminders.js     rappels automatiques (veille et 30 min avant)
js/calcom.js        connexion Cal.com (import des réservations)
js/views/*.js       un fichier par écran
js/app.js           navigation et démarrage
```
