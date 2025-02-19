-- Drop existing table and triggers
DROP TRIGGER IF EXISTS audit_articles_trigger ON articles;
DROP TABLE IF EXISTS articles CASCADE;

-- Create articles table with original schema
CREATE TABLE articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cb text NOT NULL,
  cb_ref text,
  nom text NOT NULL,
  prixa decimal(10,2) DEFAULT 0,
  prixg decimal(10,2) DEFAULT 0,
  prixd decimal(10,2) DEFAULT 0,
  derniere_prix decimal(10,2) DEFAULT 0,
  avatar text,
  type_stock text,
  emplacement text,
  obs text,
  categorie_article_id integer,
  fournisseur_id integer,
  marque_id integer,
  created timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;

-- Create unified CRUD policy
CREATE POLICY "articles_crud_policy" ON articles
  USING (true)
  WITH CHECK (true);

-- Add audit trigger
CREATE TRIGGER audit_articles_trigger
  AFTER INSERT OR UPDATE OR DELETE ON articles
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Insert initial articles data
INSERT INTO articles (
  cb, nom, prixa, prixg, prixd, derniere_prix, avatar, type_stock, emplacement, obs, 
  categorie_article_id, fournisseur_id, marque_id, created
) VALUES
  ('AE-MAN-T', 'ACCORDEON D''ECHAPPEMENT MAN TKZ', 27720, 35000, 60000, 40000, '20220314160137.jpg', 'O', 'AB14/MAGASIN', '', 400, 2, 4, '2022-01-01 06:13:40'),
  ('AE2-ACTROS-T', 'ACCORDÉON D''ECHAPPEMENT ACTROS TKZ/2', 13000, 35000, 54622, 35000, '20220314160327.jpg', 'O', 'AB15', '', 400, 2, 4, '2022-01-01 06:13:40'),
  ('AR-12/48V-T', 'ALARME DE RECULE 12V-48V  TKZ', 5497, 10000, 16807, 10000, '20220314155344.jpg', 'O', 'DEPOT 1 / MB16', '', 1100, 22, 4, '2022-01-01 06:13:40'),
  ('AL-440-A', 'ALTERNATEUR 24V-80A 440 ALTERNATOR', 64590, 180000, 252101, 180000, '20220310160738.jpg', 'O', 'MC11', 'Product description\r\nEntsprechende Artikelnummern:\r\n\r\nRENAULT TRUCKS 50 10 589 525; RENAULT TRUCKS 20 849 349; RENAULT TRUCKS 20 409 228; RENAULT 74 20 409 228; DAF 1524012R; WAI 12599N; UNIPOINT ALT-2117A; UNIPOINT ALT-2117B; WAI 1-2857-01BO; VALEO 439231', 1100, 2, 200, '2022-01-01 06:13:40'),
  ('ASC-MAN-T', 'AMORTISSEUR DE SUSPENSION DE CABINE MAN TKZ', 14600, 40000, 58824, 40000, '20220223094339.jpg', 'O', 'HC12', '3 years warranty febi\r\n40002\r\nCabin Shock Absorber\r\nFitting Side: rear\r\n40002  1 \r\nAttributes\r\nDiameter of the Attachment Points	14 mm\r\nMax. Length	276 mm\r\nMin. Length	237 mm\r\nOperating Mode	mechanical\r\nOutside Thread	M14 x 1,5\r\nPiston Rod Diameter	14 mm\r\nShock Absorber Bracket Type	bottom pin\r\nShock Absorber Bracket Type	top eye', 1200, 2, 4, '2022-01-01 06:13:40'),
  ('ASC-RENAULT-SA', 'AMORTISSEUR DE SUSPENSION DE CABINE RENAULT SABO', 26700, 40000, 67227, 45000, '20220317143522.png', 'O', 'HB8', '', 1200, 2, NULL, '2022-01-01 06:13:40'),
  ('ASC-REVO-D', 'AMORTISSEUR DE SUSPENSION DE CABINE RENAULT/VOLVO DT SPARE', 20000, 40000, 50420, 40000, '20220317111201.jpg', 'O', 'HB12', '', 1200, 2, 144, '2022-01-01 06:13:40'),
  ('3.33556', 'AMORTISSEUR DE SUSPENSION DE CABINE EW', 26700, 40000, 67227, 45000, '20220310154810.jpg', 'O', '', '', 1200, 2, 16, '2022-01-01 06:13:40'),
  ('ASC4-MERCEDES-M', 'AMORTISSEUR DE SUSPENSION DE CABINE MP2/MP3 MAXPART', 26700, 40000, 67227, 30000, '20220310154659.jpg', 'O', 'HB11', '', 1200, 2, 2, '2022-01-01 06:13:40'),
  ('1601776600002', 'AMORTISSEUR DE SUSPENSION DE CABINE SAMPA', 23350, 40000, 58824, 45000, NULL, 'O', '', '', 1200, 2, 1, '2022-01-01 06:13:40'),
  ('8680281821321', 'AMMORTISSEUR DE SUSPENSION DE CABINE SAMPA', 21700, 40000, 54622, 40000, '20220217083523.jpg', 'O', 'HB14', 'Numéro d''article\r\n078.217\r\nProducteur\r\nSAMPA\r\nCode EAN\r\n8680281821321\r\nLa pièce de montage\r\nretour\r\nPoids (kg]\r\n2,4 kg', 1200, 2, 1, '2022-01-01 06:13:40'),
  ('ASL-RENAULT-W', 'AMORTISSEUR DE SUSPENSION DE LAME RENAULT WBNORTECH', 25000, 45000, 70588, 40000, '20220317110509.jpg', 'O', 'HB12', '', 1200, 2, 10, '2022-01-01 06:14:03'),
  ('A-TOYOTA-H', 'AMORTISSEUR TOYOTA HHKCRT', 16700, 30000, 42017, 30000, '20220312102018.jpg', 'O', 'BUS-D4', 'Model NO.\r\n444178/344347/4853136160/4853180154/485318051\r\nPart\r\nRubber Bushing\r\nPosition\r\nFront\r\nType\r\nGas-Filled\r\nSpring Type\r\nCoil Spring\r\nSpring Material\r\nSteel\r\nStructure\r\nSingle Cylinder\r\nCar Make\r\nToyota\r\nBrand\r\nKYB\r\nDamping Force Direction\r\nSingle Effect\r\nTrademark\r\nOEM\r\nTransport Package\r\nBox\r\nSpecification\r\nBOX\r\nOrigin\r\nChina\r\nHS Code\r\n8708801000', 1200, 2, 166, '2022-01-01 06:14:03'),
  ('A-TOYOTA-E', 'AMORTISSEUR TOYOTA EF', 16700, 30000, 42017, 35000, '20220312115853.jpg', 'O', 'BUS/D', '', 1200, 2, 165, '2022-01-01 06:14:03'),
  ('ASC-350', 'AMORTISSEUR DE SUSPENSION DE CABINE 350', 13000, 35000, 42017, 35000, '20220312121841.jpg', 'O', 'HB10', '', 1200, NULL, NULL, '2022-01-01 06:14:03');