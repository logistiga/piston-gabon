# Piston Gabon - Gestion Commerciale

Application de gestion commerciale complète pour Piston Gabon, spécialisée dans la vente de pièces automobiles.

## 🚀 Fonctionnalités

- **Gestion des Ventes**
  - Point de vente (POS)
  - Tickets de caisse
  - Devis
  - Factures
  - Gestion des clients

- **Gestion des Achats**
  - Commandes fournisseurs
  - Réception des commandes
  - Gestion des fournisseurs

- **Gestion du Stock**
  - Catalogue articles
  - Gestion des catégories
  - Gestion des marques
  - Compatibilité véhicules

- **Gestion Financière**
  - Caisse
  - Comptes bancaires
  - Rapports financiers

- **Administration**
  - Gestion des utilisateurs
  - Gestion des rôles
  - Journal d'audit
  - Paramètres de l'entreprise

## 🛠️ Technologies Utilisées

- **Frontend**
  - React 18
  - TypeScript
  - Vite
  - Redux Toolkit
  - React Router
  - TailwindCSS
  - Lucide Icons

- **Backend**
  - Supabase
  - PostgreSQL
  - Row Level Security (RLS)

## 📋 Prérequis

- Node.js 18+
- npm ou yarn
- Compte Supabase

## ⚙️ Installation

1. Cloner le dépôt :
```bash
git clone https://github.com/votre-compte/piston-gabon.git
cd piston-gabon
```

2. Installer les dépendances :
```bash
npm install
```

3. Configurer les variables d'environnement :
   - Copier `.env.example` vers `.env`
   - Remplir les variables Supabase :
     ```
     VITE_SUPABASE_URL=votre_url_supabase
     VITE_SUPABASE_ANON_KEY=votre_cle_anon
     ```

4. Lancer l'application en développement :
```bash
npm run dev
```

## 🚀 Déploiement

1. Construire l'application :
```bash
npm run build
```

2. Les fichiers de production seront générés dans le dossier `dist`

3. Déployer sur Netlify :
   - Connecter le dépôt GitHub
   - Configurer les variables d'environnement
   - Le déploiement se fera automatiquement

## 🧪 Tests

Exécuter les tests :
```bash
npm run test
```

Avec couverture :
```bash
npm run test:coverage
```

## 📦 Structure du Projet

```
src/
  ├── components/     # Composants React
  ├── store/         # État global (Redux)
  ├── services/      # Services API
  ├── hooks/         # Hooks personnalisés
  ├── utils/         # Utilitaires
  ├── types/         # Types TypeScript
  └── tests/         # Tests
```

## 🔒 Sécurité

- Authentification via Supabase Auth
- Row Level Security (RLS) pour la base de données
- Gestion des rôles et permissions
- Validation des entrées utilisateur
- Protection CSRF
- Rate limiting

## 🗄️ Base de Données

La base de données PostgreSQL est gérée via Supabase et inclut :

- Tables principales :
  - users
  - clients
  - articles
  - tickets
  - invoices
  - quotes
  - payments
  - banks
  - suppliers

- Vues :
  - ticket_payments_view
  - bank_transactions_details
  - cash_register_details

- Triggers pour :
  - Mise à jour des stocks
  - Calcul des soldes
  - Journal d'audit

## 👥 Rôles Utilisateurs

- **Administrateur**
  - Accès complet à toutes les fonctionnalités
  - Gestion des utilisateurs et des rôles
  - Configuration du système

- **Commercial**
  - Gestion des clients
  - Création de devis et factures
  - Consultation du catalogue

- **Caissier**
  - Point de vente
  - Gestion de la caisse
  - Encaissements

- **Magasinier**
  - Gestion du stock
  - Réception des commandes
  - Inventaire

## 📄 Licence

Propriétaire - Tous droits réservés

## 🤝 Support

Pour toute assistance :
- Email : support@piston-gabon.com
- Téléphone : +241 11701435

## 🔄 Mises à jour

Pour mettre à jour l'application :

1. Tirer les dernières modifications :
```bash
git pull origin main
```

2. Installer les nouvelles dépendances :
```bash
npm install
```

3. Appliquer les migrations Supabase :
```bash
supabase db push
```

4. Redémarrer l'application :
```bash
npm run dev
```

## 🎯 Roadmap

- [ ] Module de gestion des véhicules clients
- [ ] Application mobile pour les commerciaux
- [ ] Système de fidélité clients
- [ ] Module de gestion des réparations
- [ ] Intégration des paiements mobiles