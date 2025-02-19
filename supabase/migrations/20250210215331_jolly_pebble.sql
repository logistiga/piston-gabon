-- Drop existing view if it exists
DROP VIEW IF EXISTS article_catalog;

-- Create view for article catalog with all necessary details
CREATE VIEW article_catalog AS
SELECT 
  a.id,
  a.cb,
  a.cb_ref,
  a.nom,
  a.prixa,
  a.prixg,
  a.prixd,
  a.derniere_prix,
  a.avatar,
  a.type_stock,
  a.emplacement,
  a.obs,
  a.stock,
  c.name as category_name,
  c.slug as category_slug,
  b.name as brand_name,
  b.abbreviation as brand_abbreviation,
  (
    SELECT COUNT(*)
    FROM article_compatibility ac
    WHERE ac.article_id = a.id
  ) as compatibility_count,
  (
    SELECT json_agg(json_build_object(
      'model_name', vm.name,
      'brand_name', vb.name,
      'year_start', vm.year_start,
      'year_end', vm.year_end
    ))
    FROM article_compatibility ac
    JOIN vehicle_models vm ON vm.id = ac.model_id
    JOIN vehicle_brands vb ON vb.id = vm.brand_id
    WHERE ac.article_id = a.id
  ) as compatibilities,
  a.created_at,
  a.updated_at
FROM articles a
LEFT JOIN categories c ON c.id = a.categorie_article_id
LEFT JOIN brands b ON b.id = a.marque_id;

-- Add RLS policy for the view
ALTER VIEW article_catalog OWNER TO postgres;
GRANT SELECT ON article_catalog TO authenticated;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_articles_nom ON articles(nom);
CREATE INDEX IF NOT EXISTS idx_articles_type_stock ON articles(type_stock);
CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(categorie_article_id);
CREATE INDEX IF NOT EXISTS idx_articles_brand ON articles(marque_id);

-- Add helpful comments
COMMENT ON VIEW article_catalog IS 'Consolidated view of articles with category, brand and compatibility details';
COMMENT ON COLUMN article_catalog.compatibility_count IS 'Number of compatible vehicle models';
COMMENT ON COLUMN article_catalog.compatibilities IS 'JSON array of compatible vehicle models with details';