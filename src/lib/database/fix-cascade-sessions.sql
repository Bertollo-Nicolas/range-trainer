-- Migration pour corriger le problème de cascade lors de la suppression de scénarios
-- Le problème : ON DELETE SET NULL met scenario_id à NULL mais viole la contrainte valid_scenario_data
-- La solution : Changer vers ON DELETE CASCADE pour supprimer les sessions liées

-- 1. Supprimer d'abord la contrainte de clé étrangère existante
ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_scenario_id_fkey;

-- 2. Recréer la contrainte avec ON DELETE CASCADE
ALTER TABLE sessions 
ADD CONSTRAINT sessions_scenario_id_fkey 
FOREIGN KEY (scenario_id) 
REFERENCES scenarios(id) 
ON DELETE CASCADE;

-- 3. Faire la même chose pour range_id si nécessaire
ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_range_id_fkey;

ALTER TABLE sessions 
ADD CONSTRAINT sessions_range_id_fkey 
FOREIGN KEY (range_id) 
REFERENCES tree_items(id) 
ON DELETE CASCADE;