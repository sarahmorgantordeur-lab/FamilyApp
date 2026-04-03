# Family Dashboard

Application familiale construite avec Expo, React Native Web et Firebase.

Le projet permet de :
- gérer des listes de tâches
- partager des listes et événements au niveau du foyer
- utiliser une liste de courses commune
- accéder à l’application sur web

## Site en ligne

Production :
`https://family-dashboard-9de62.web.app`

Console Firebase :
`https://console.firebase.google.com/project/family-dashboard-9de62/overview`

## Stack technique

- Expo
- React Native
- React Native Web
- NativeWind / Tailwind
- Firebase Auth
- Firestore
- Firebase Hosting

## Prérequis

- Node.js 18 ou plus
- npm
- accès au projet Firebase `family-dashboard-9de62`

## Installation

```bash
npm install
```

## Lancement en local

Serveur web de développement :

```bash
npx expo start --web --clear
```

Build web local :

```bash
npm run build:web
```

## Scripts utiles

```bash
npm run build:web
npm run deploy:firebase
npm run serve:firebase
```

Description :
- `npm run build:web` : génère le build web dans `dist/`
- `npm run deploy:firebase` : build puis déploie sur Firebase Hosting
- `npm run serve:firebase` : lance l’émulateur Hosting Firebase

## Déploiement sur Firebase

Connexion à Firebase CLI :

```bash
npx firebase-tools login
```

Déploiement :

```bash
npm run deploy:firebase
```

Configuration Firebase du projet :
- [firebase.json](/Users/sarahtordeur/Documents/Informatique/Todo/firebase.json)
- [.firebaserc](/Users/sarahtordeur/Documents/Informatique/Todo/.firebaserc)

## Structure du projet

```text
.
├── App.js
├── app.json
├── firebase.json
├── src/
│   ├── components/
│   ├── context/
│   ├── lib/
│   └── screens/
├── assets/
├── global.css
└── tailwind.config.js
```

## Fichiers importants

- [App.js](/Users/sarahtordeur/Documents/Informatique/Todo/App.js) : navigation principale
- [src/lib/firebase.js](/Users/sarahtordeur/Documents/Informatique/Todo/src/lib/firebase.js) : configuration Firebase web
- [src/context/AppContext.js](/Users/sarahtordeur/Documents/Informatique/Todo/src/context/AppContext.js) : logique listes, événements et items
- [src/context/HouseholdContext.js](/Users/sarahtordeur/Documents/Informatique/Todo/src/context/HouseholdContext.js) : logique foyer
- [src/screens/HomeScreen.js](/Users/sarahtordeur/Documents/Informatique/Todo/src/screens/HomeScreen.js) : listes
- [src/screens/GroceryScreen.js](/Users/sarahtordeur/Documents/Informatique/Todo/src/screens/GroceryScreen.js) : courses
- [src/screens/CalendarScreen.js](/Users/sarahtordeur/Documents/Informatique/Todo/src/screens/CalendarScreen.js) : calendrier

## Responsive

Le projet utilise NativeWind/Tailwind pour améliorer le rendu web responsive.

Configuration :
- [tailwind.config.js](/Users/sarahtordeur/Documents/Informatique/Todo/tailwind.config.js)
- [global.css](/Users/sarahtordeur/Documents/Informatique/Todo/global.css)
- [babel.config.js](/Users/sarahtordeur/Documents/Informatique/Todo/babel.config.js)
- [metro.config.js](/Users/sarahtordeur/Documents/Informatique/Todo/metro.config.js)

## GitHub

Les fichiers générés, caches et secrets locaux sont exclus du dépôt via `.gitignore`.

Artefacts supprimés du dépôt local :
- `.expo/`
- `dist/`
- `.firebase/`
- `android/.gradle/`

## Remarques

- Si un changement n’apparaît pas sur localhost, relancer avec `npx expo start --web --clear`
- Si un changement n’apparaît pas en production, relancer `npm run deploy:firebase` puis forcer le rechargement navigateur
