-- Migration pour créer les tables ranges et folders
-- À exécuter dans l'éditeur SQL de Supabase

-- Table pour les éléments (dossiers et ranges)
CREATE TABLE tree_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('folder', 'range')),
    parent_id UUID REFERENCES tree_items(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    
    -- Métadonnées pour les dossiers
    is_expanded BOOLEAN DEFAULT false,
    
    -- Données pour les ranges
    hands JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    
    -- Index pour optimiser les requêtes
    CONSTRAINT valid_folder_data CHECK (
        (type = 'folder' AND hands = '[]'::jsonb AND notes IS NULL) OR
        (type = 'range')
    )
);

-- Index pour améliorer les performances
CREATE INDEX idx_tree_items_parent_id ON tree_items(parent_id);
CREATE INDEX idx_tree_items_type ON tree_items(type);
CREATE INDEX idx_tree_items_created_at ON tree_items(created_at);

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger pour mettre à jour updated_at
CREATE TRIGGER update_tree_items_updated_at 
    BEFORE UPDATE ON tree_items 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Activer RLS (Row Level Security)
ALTER TABLE tree_items ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre toutes les opérations (à ajuster selon vos besoins d'authentification)
CREATE POLICY "Allow all operations on tree_items" ON tree_items
    FOR ALL USING (true);

-- Données d'exemple
INSERT INTO tree_items (name, type, parent_id, is_expanded) VALUES
('Postflop', 'folder', NULL, true),
('Preflop', 'folder', NULL, false);

-- Sous-dossier UTG dans Postflop
INSERT INTO tree_items (name, type, parent_id, is_expanded) 
SELECT 'UTG', 'folder', id, true 
FROM tree_items WHERE name = 'Postflop' AND type = 'folder';

-- Ranges dans UTG
INSERT INTO tree_items (name, type, parent_id, hands, notes) 
SELECT 'Value Range', 'range', id, '["AA", "KK", "QQ", "AK"]'::jsonb, 'Range de value standard'
FROM tree_items WHERE name = 'UTG' AND type = 'folder';

INSERT INTO tree_items (name, type, parent_id, hands, notes) 
SELECT 'Bluff Range', 'range', id, '["A5s", "A4s", "A3s", "A2s"]'::jsonb, 'Range de bluff suited aces'
FROM tree_items WHERE name = 'UTG' AND type = 'folder';