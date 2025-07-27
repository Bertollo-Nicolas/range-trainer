-- Migration pour le système de tags intelligent
-- À exécuter dans l'éditeur SQL de Supabase

-- Table pour les tags populaires avec compteur d'usage
CREATE TABLE anki_tags (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    usage_count INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    
    -- Contraintes
    CONSTRAINT valid_tag_name CHECK (LENGTH(TRIM(name)) > 0),
    CONSTRAINT valid_usage_count CHECK (usage_count >= 0)
);

-- Index pour les performances
CREATE INDEX idx_anki_tags_usage ON anki_tags(usage_count DESC);
CREATE INDEX idx_anki_tags_name ON anki_tags(name);
CREATE INDEX idx_anki_tags_search ON anki_tags USING gin(to_tsvector('simple', name));

-- Trigger pour mettre à jour updated_at automatiquement
CREATE TRIGGER update_anki_tags_updated_at 
    BEFORE UPDATE ON anki_tags 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Activer RLS (Row Level Security)
ALTER TABLE anki_tags ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre toutes les opérations
CREATE POLICY "Allow all operations on anki_tags" ON anki_tags FOR ALL USING (true);

-- Fonction pour incrémenter l'usage d'un tag
CREATE OR REPLACE FUNCTION increment_tag_usage(tag_name TEXT)
RETURNS UUID AS $$
DECLARE
    tag_id UUID;
BEGIN
    -- Essayer d'incrémenter un tag existant
    UPDATE anki_tags 
    SET usage_count = usage_count + 1,
        updated_at = NOW()
    WHERE LOWER(TRIM(name)) = LOWER(TRIM(tag_name))
    RETURNING id INTO tag_id;
    
    -- Si le tag n'existe pas, le créer
    IF tag_id IS NULL THEN
        INSERT INTO anki_tags (name, usage_count) 
        VALUES (TRIM(tag_name), 1)
        RETURNING id INTO tag_id;
    END IF;
    
    RETURN tag_id;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour obtenir les suggestions de tags
CREATE OR REPLACE FUNCTION get_tag_suggestions(search_term TEXT DEFAULT '', limit_count INTEGER DEFAULT 10)
RETURNS TABLE(id UUID, name TEXT, usage_count INTEGER) AS $$
BEGIN
    IF search_term = '' THEN
        -- Retourner les tags les plus populaires
        RETURN QUERY
        SELECT t.id, t.name, t.usage_count
        FROM anki_tags t
        ORDER BY t.usage_count DESC, t.name ASC
        LIMIT limit_count;
    ELSE
        -- Recherche par similarité
        RETURN QUERY
        SELECT t.id, t.name, t.usage_count
        FROM anki_tags t
        WHERE LOWER(t.name) LIKE LOWER('%' || search_term || '%')
           OR t.name ILIKE search_term || '%'
        ORDER BY 
            CASE WHEN LOWER(t.name) = LOWER(search_term) THEN 1 ELSE 2 END,
            t.usage_count DESC,
            LENGTH(t.name),
            t.name ASC
        LIMIT limit_count;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour nettoyer les tags inutilisés
CREATE OR REPLACE FUNCTION cleanup_unused_tags()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Supprimer les tags avec usage_count = 0 et plus anciens que 30 jours
    DELETE FROM anki_tags 
    WHERE usage_count = 0 
      AND created_at < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Données d'exemple pour commencer
INSERT INTO anki_tags (name, usage_count) VALUES 
('poker', 15),
('ranges', 12),
('position', 10),
('preflop', 8),
('postflop', 6),
('bluff', 5),
('value-bet', 4),
('pot-odds', 7),
('equity', 6),
('tournament', 3),
('cash-game', 4),
('psychology', 2),
('bankroll', 3),
('tells', 2),
('math', 5) ON CONFLICT (name) DO NOTHING;