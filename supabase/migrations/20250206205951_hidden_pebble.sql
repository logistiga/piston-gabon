-- Insert additional articles
INSERT INTO articles (cb, nom, emplacement, prixg, prixd, stock, prixa, derniere_prix, description) VALUES
  ('AR-12/48V-T', 'ALARME DE RECULE 12V-48V TKZ', 'DEPOT 1 / MB16', 10000, 16807, 0, 5497, 10000, NULL),
  ('AL-440-A', 'ALTERNATEUR 24V-80A 440 ALTERNATOR', 'MC11', 180000, 252101, 0, 64590, 180000, 'Product description Entsprechende Artikelnummern: RENAULT TRUCKS 50 10 589 525; RENAULT TRUCKS 20 849 349'),
  ('ASC-MAN-T', 'AMORTISSEUR DE SUSPENSION DE CABINE MAN TKZ', 'HC12', 40000, 58824, 0, 14600, 40000, '3 years warranty febi 40002 Cabin Shock Absorber'),
  ('ASC-RENAULT-SA', 'AMORTISSEUR DE SUSPENSION DE CABINE RENAULT SABO', 'HB8', 40000, 67227, 0, 26700, 45000, NULL),
  ('ASC-REVO-D', 'AMORTISSEUR DE SUSPENSION DE CABINE RENAULT/VOLVO DT SPARE', 'HB12', 40000, 50420, 0, 20000, 40000, NULL),
  ('3.33556', 'AMORTISSEUR DE SUSPENSION DE CABINE EW', NULL, 40000, 67227, 0, 26700, 45000, NULL),
  ('ASC4-MERCEDES-M', 'AMORTISSEUR DE SUSPENSION DE CABINE MP2/MP3 MAXPART', 'HB11', 40000, 67227, 0, 26700, 30000, NULL),
  ('1601776600002', 'AMORTISSEUR DE SUSPENSION DE CABINE SAMPA', NULL, 40000, 58824, 0, 23350, 45000, NULL),
  ('8680281821321', 'AMMORTISSEUR DE SUSPENSION DE CABINE SAMPA', 'HB14', 40000, 54622, 0, 21700, 40000, 'Numéro d''article 078.217 Producteur SAMPA'),
  ('ASL-RENAULT-W', 'AMORTISSEUR DE SUSPENSION DE LAME RENAULT WBNORTECH', 'HB12', 45000, 70588, 0, 25000, 40000, NULL),
  ('A-TOYOTA-H', 'AMORTISSEUR TOYOTA HHKCRT', 'BUS-D4', 30000, 42017, 0, 16700, 30000, 'Model NO. 444178/344347/4853136160/4853180154/485318051'),
  ('A-TOYOTA-E', 'AMORTISSEUR TOYOTA EF', 'BUS/D', 30000, 42017, 0, 16700, 35000, NULL),
  ('ASC-350', 'AMORTISSEUR DE SUSPENSION DE CABINE 350', 'HB10', 35000, 42017, 0, 13000, 35000, NULL),
  ('ASC-RENAULT-T', 'AMORTISSEUR DE SUSPENSION DE CABINE RENAULT TKZ', 'HB13', 35000, 65000, 0, 7470, 40000, NULL),
  ('A2-HYUNDAI-H', 'AMORTISSEUR HYUNDAI D''ORIGINE/2', 'BUS-D4', 45000, 60000, 0, 30918, 45000, NULL)
ON CONFLICT (cb) DO UPDATE SET
  nom = EXCLUDED.nom,
  emplacement = EXCLUDED.emplacement,
  prixg = EXCLUDED.prixg,
  prixd = EXCLUDED.prixd,
  prixa = EXCLUDED.prixa,
  derniere_prix = EXCLUDED.derniere_prix,
  description = EXCLUDED.description;