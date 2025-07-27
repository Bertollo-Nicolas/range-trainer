-- Migration pour ajouter la colonne editor_data
-- À exécuter dans l'éditeur SQL de Supabase

-- Ajouter la colonne editor_data à la table tree_items
ALTER TABLE tree_items 
ADD COLUMN editor_data JSONB DEFAULT NULL;

-- Mettre à jour la contrainte pour permettre editor_data dans les ranges
ALTER TABLE tree_items 
DROP CONSTRAINT valid_folder_data;

-- Nouvelle contrainte qui permet editor_data pour les ranges
ALTER TABLE tree_items 
ADD CONSTRAINT valid_folder_data CHECK (
    (type = 'folder' AND hands = '[]'::jsonb AND notes IS NULL AND editor_data IS NULL) OR
    (type = 'range')
);

-- Index pour les requêtes sur editor_data
CREATE INDEX idx_tree_items_editor_data ON tree_items USING GIN (editor_data);