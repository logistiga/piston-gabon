/*
  # Mise à jour du schéma articles et ajout de données

  1. Modifications de la table
    - Ajout des colonnes manquantes
    - Ajout de la contrainte unique sur cb
  
  2. Insertion des données
    - Ajout de nouveaux articles
    - Mise à jour des articles existants
*/

-- Add missing columns to articles table
DO $$ BEGIN
  -- Add columns if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'articles' AND column_name = 'stock') THEN
    ALTER TABLE articles ADD COLUMN stock integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'articles' AND column_name = 'type_stock') THEN
    ALTER TABLE articles ADD COLUMN type_stock text DEFAULT 'O';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'articles' AND column_name = 'avatar') THEN
    ALTER TABLE articles ADD COLUMN avatar text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'articles' AND column_name = 'cb_ref') THEN
    ALTER TABLE articles ADD COLUMN cb_ref text;
  END IF;
END $$;

-- Add unique constraint if it doesn't exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'articles' AND constraint_type = 'UNIQUE' AND constraint_name = 'articles_cb_key'
  ) THEN
    ALTER TABLE articles ADD CONSTRAINT articles_cb_key UNIQUE (cb);
  END IF;
END $$;

-- Insert new articles data
INSERT INTO articles (
  cb, nom, prixa, prixg, prixd, derniere_prix, type_stock, emplacement, stock
) VALUES
  ('RO-33275-N', 'ROULEMENT 33275 NTN', NULL, NULL, NULL, NULL, 'O', 'Non Définie', 0),
  ('CSBV', 'CAPTEUR DE SELECTEUR DE BOITE DE VITESSE', NULL, NULL, NULL, NULL, 'O', 'Non Définie', 0),
  ('I-440', 'INJECTEUR OCCASION KERAX 440', NULL, 100000, 126050, 100000, 'O', 'Non Définie', 1),
  ('PM-TOYOTA-T', 'PISTON MOTEUR TOYOTA D''ORIGINE', NULL, NULL, 25210, NULL, 'O', 'Non Définie', 12),
  ('JP-440-R', 'JOINT DE PORTIERE KERAX 440 D''ORIGINE', NULL, NULL, NULL, NULL, 'O', 'Non Définie', 0),
  ('FARJR-REMORQUE-C', 'FEU ARRIERE ROUGE-JAUNE ROND REMORQUE C', NULL, 8000, 10000, 8000, 'O', 'Non Définie', 50),
  ('FARRR-REMORQUE-C', 'FEU ARRIERE ROUGE-BLANC ROND REMORQUE C', NULL, 8000, 10000, 8000, 'O', 'Non Définie', 50),
  ('PACG-BEIBEN-C', 'PHARE AVANT COTE GAUCHE BEIBEN C', NULL, 40000, 50420, 40000, 'O', 'Non Définie', 5),
  ('PACD-BEIBEN-C', 'PHARE AVANT COTE DROIT BEIBEN C', NULL, 40000, 50420, 40000, 'O', 'Non Définie', 5),
  ('VI-BEIBEN', 'VILEBREQUIN BEIBEN', NULL, 400000, 504202, 400000, 'O', 'Non Définie', 1),
  ('I-BEIBEN-W-C', 'INJECTEUR BEIBEN WEICHEI C', NULL, 30000, 42017, 30000, 'O', 'Non Définie', 12),
  ('AL-BEIBEN-W-C', 'ALTERNATEUR BEIBEN WEICHEI C', NULL, 80000, 100840, 80000, 'O', 'Non Définie', 1),
  ('DE-BEIBEN-W-C', 'DEMARREUR BEIBEN WEICHEI C', NULL, 120000, 168067, 120000, 'O', 'Non Définie', 3),
  ('JC-BEIBEN-W-C', 'JOINT DE CULASSE BEIBEN WEICHEI C', NULL, 20000, 25210, 20000, 'O', 'Non Définie', 6),
  ('JS-BEIBEN-W-C', 'JOINT DE SOUPAPE BEIBEN WEICHEI C', NULL, 8000, 12605, 8000, 'O', 'Non Définie', 5),
  ('CA-BEIBEN-W-C', 'COMPRESSEUR D''AIR BEIBEN WEICHEI C', NULL, 120000, 168067, 120000, 'O', 'Non Définie', 3),
  ('TU-BEIBEN-B-C', 'TURBOCOMPRESSEUR BEIBEN WEICHEI C', NULL, 150000, 210084, 150000, 'O', 'Non Définie', 3),
  ('CP-BEIBEN-W-C', 'COUSSINET DE PALIER BEIBEN WEICHEI C', NULL, 40000, 50420, 40000, 'O', 'Non Définie', 5),
  ('CB-BEIBEN-W-C', 'COUSSINET DE BIELLE BEIBEN WEICHEI C', NULL, 40000, 50420, 40000, 'O', 'Non Définie', 3),
  ('SEM-BEIBEN-W-C', 'SEGMENT MOTEUR BEIBEN WEICHEI C', NULL, 45000, 67226, 45000, 'O', 'Non Définie', 3)
ON CONFLICT (cb) DO UPDATE SET
  nom = EXCLUDED.nom,
  prixg = EXCLUDED.prixg,
  prixd = EXCLUDED.prixd,
  derniere_prix = EXCLUDED.derniere_prix,
  stock = EXCLUDED.stock,
  type_stock = EXCLUDED.type_stock,
  emplacement = EXCLUDED.emplacement;