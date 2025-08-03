-- Migration pour le système Mind amélioré
-- Date: 2025-01-02

-- ====================================
-- TABLES POUR LES TÂCHES AMÉLIORÉES
-- ====================================

-- Table des catégories de tâches
CREATE TABLE IF NOT EXISTS task_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  color VARCHAR(7) DEFAULT '#3B82F6', -- Code couleur hex
  icon VARCHAR(20) DEFAULT '📝',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mise à jour de la table des tâches
ALTER TABLE mind_tasks 
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES task_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS linked_goal_id UUID REFERENCES mind_goals(id) ON DELETE SET NULL;

-- Trigger pour archiver automatiquement les tâches terminées
CREATE OR REPLACE FUNCTION auto_archive_completed_tasks()
RETURNS TRIGGER AS $$
BEGIN
  -- Si la tâche passe à terminée et n'était pas déjà archivée
  IF NEW.status = 'completed' AND OLD.status != 'completed' AND NEW.archived = FALSE THEN
    NEW.archived = TRUE;
    NEW.archived_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_archive_tasks ON mind_tasks;
CREATE TRIGGER trigger_auto_archive_tasks
  BEFORE UPDATE ON mind_tasks
  FOR EACH ROW
  EXECUTE FUNCTION auto_archive_completed_tasks();

-- ====================================
-- TABLES POUR LES HABITUDES AMÉLIORÉES
-- ====================================

-- Ajout de colonnes pour le mode hardcore et liaison aux objectifs
ALTER TABLE mind_habits 
  ADD COLUMN IF NOT EXISTS hardcore_mode BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS hardcore_streak_target INTEGER DEFAULT 0, -- Nombre de jours/semaines à maintenir
  ADD COLUMN IF NOT EXISTS hardcore_current_streak INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hardcore_reset_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS linked_goal_id UUID REFERENCES mind_goals(id) ON DELETE SET NULL;

-- Trigger pour reset hardcore mode
CREATE OR REPLACE FUNCTION reset_hardcore_streak()
RETURNS TRIGGER AS $$
BEGIN
  -- Si c'est un habit en mode hardcore et qu'on a manqué un jour
  IF NEW.hardcore_mode = TRUE AND OLD.hardcore_current_streak > NEW.hardcore_current_streak THEN
    NEW.hardcore_current_streak = 0;
    NEW.hardcore_reset_count = OLD.hardcore_reset_count + 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_reset_hardcore ON mind_habits;
CREATE TRIGGER trigger_reset_hardcore
  BEFORE UPDATE ON mind_habits
  FOR EACH ROW
  EXECUTE FUNCTION reset_hardcore_streak();

-- ====================================
-- TABLES POUR LE JOURNAL AMÉLIORÉ
-- ====================================

-- Ajout de colonnes pour la qualité et évaluation
ALTER TABLE mind_journal_entries 
  ADD COLUMN IF NOT EXISTS mood_score INTEGER CHECK (mood_score >= 1 AND mood_score <= 10),
  ADD COLUMN IF NOT EXISTS energy_level INTEGER CHECK (energy_level >= 1 AND energy_level <= 10),
  ADD COLUMN IF NOT EXISTS focus_level INTEGER CHECK (focus_level >= 1 AND focus_level <= 10),
  ADD COLUMN IF NOT EXISTS overall_quality INTEGER CHECK (overall_quality >= 1 AND overall_quality <= 10),
  ADD COLUMN IF NOT EXISTS lessons_learned TEXT,
  ADD COLUMN IF NOT EXISTS tomorrow_focus TEXT;

-- ====================================
-- TABLES POUR LES LEAKS AMÉLIORÉS
-- ====================================

-- Amélioration de la table des leaks
ALTER TABLE mind_leaks 
  ADD COLUMN IF NOT EXISTS dominant_emotion VARCHAR(50),
  ADD COLUMN IF NOT EXISTS emotion_trigger TEXT,
  ADD COLUMN IF NOT EXISTS impact_description TEXT,
  ADD COLUMN IF NOT EXISTS prevention_strategy TEXT,
  ADD COLUMN IF NOT EXISTS severity INTEGER CHECK (severity >= 1 AND severity <= 10) DEFAULT 5;

-- ====================================
-- NOUVEAU: SYSTÈME DE REVIEWS POKER
-- ====================================

-- Table des paramètres de poker
CREATE TABLE IF NOT EXISTS poker_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  bankroll DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des limites de jeu
CREATE TABLE IF NOT EXISTS poker_game_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL, -- ex: "NL2 Zoom", "MTT 2€"
  game_type VARCHAR(20) NOT NULL, -- 'cash', 'tournament', 'sng'
  stakes VARCHAR(20) NOT NULL, -- ex: "NL2", "2€"
  variant VARCHAR(20) DEFAULT 'holdem', -- 'holdem', 'omaha', etc.
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des reviews de sessions poker
CREATE TABLE IF NOT EXISTS poker_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  game_limit_id UUID REFERENCES poker_game_limits(id) ON DELETE SET NULL,
  session_date DATE NOT NULL,
  hands_played INTEGER NOT NULL DEFAULT 0,
  bb_per_100 DECIMAL(8,3), -- bb/100 hands
  technical_evaluation INTEGER CHECK (technical_evaluation >= 1 AND technical_evaluation <= 10),
  variance_impact INTEGER CHECK (variance_impact >= 1 AND variance_impact <= 10),
  decision_quality INTEGER CHECK (decision_quality >= 1 AND decision_quality <= 10),
  tilt_control INTEGER CHECK (tilt_control >= 1 AND tilt_control <= 10),
  overall_rating INTEGER CHECK (overall_rating >= 1 AND overall_rating <= 10),
  key_hands_analysis TEXT,
  areas_to_improve TEXT,
  bankroll_change DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================
-- INDEX POUR PERFORMANCE
-- ====================================

-- Index pour les tâches
CREATE INDEX IF NOT EXISTS idx_tasks_category ON mind_tasks(category_id);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON mind_tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_archived ON mind_tasks(archived);
CREATE INDEX IF NOT EXISTS idx_tasks_goal_link ON mind_tasks(linked_goal_id);

-- Index pour les habitudes
CREATE INDEX IF NOT EXISTS idx_habits_hardcore ON mind_habits(hardcore_mode);
CREATE INDEX IF NOT EXISTS idx_habits_goal_link ON mind_habits(linked_goal_id);

-- Index pour le journal
CREATE INDEX IF NOT EXISTS idx_journal_quality ON mind_journal_entries(overall_quality);
CREATE INDEX IF NOT EXISTS idx_journal_date ON mind_journal_entries(entry_date);

-- Index pour les leaks
CREATE INDEX IF NOT EXISTS idx_leaks_severity ON mind_leaks(severity);
CREATE INDEX IF NOT EXISTS idx_leaks_emotion ON mind_leaks(dominant_emotion);

-- Index pour les reviews poker
CREATE INDEX IF NOT EXISTS idx_poker_reviews_date ON poker_reviews(session_date);
CREATE INDEX IF NOT EXISTS idx_poker_reviews_limit ON poker_reviews(game_limit_id);
CREATE INDEX IF NOT EXISTS idx_poker_reviews_user_date ON poker_reviews(user_id, session_date);

-- ====================================
-- RLS (ROW LEVEL SECURITY)
-- ====================================

-- Activation RLS pour toutes les nouvelles tables
ALTER TABLE task_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE poker_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE poker_game_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE poker_reviews ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour les catégories de tâches
CREATE POLICY "Users can manage their own task categories" ON task_categories
  FOR ALL USING (auth.uid() = user_id);

-- Politiques RLS pour les paramètres poker
CREATE POLICY "Users can manage their own poker settings" ON poker_settings
  FOR ALL USING (auth.uid() = user_id);

-- Politiques RLS pour les limites de jeu
CREATE POLICY "Users can manage their own game limits" ON poker_game_limits
  FOR ALL USING (auth.uid() = user_id);

-- Politiques RLS pour les reviews poker
CREATE POLICY "Users can manage their own poker reviews" ON poker_reviews
  FOR ALL USING (auth.uid() = user_id);

-- ====================================
-- DONNÉES PAR DÉFAUT
-- ====================================

-- Catégories de tâches par défaut (sera inséré via l'app)
-- Limites de jeu par défaut (sera inséré via l'app)

-- ====================================
-- FONCTIONS UTILITAIRES
-- ====================================

-- Fonction pour calculer les statistiques de review poker
CREATE OR REPLACE FUNCTION get_poker_stats(p_user_id UUID, p_days INTEGER DEFAULT 30)
RETURNS TABLE(
  total_hands INTEGER,
  avg_bb_100 DECIMAL,
  total_sessions INTEGER,
  avg_technical DECIMAL,
  bankroll_change DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(hands_played), 0)::INTEGER as total_hands,
    COALESCE(AVG(bb_per_100), 0)::DECIMAL as avg_bb_100,
    COUNT(*)::INTEGER as total_sessions,
    COALESCE(AVG(technical_evaluation), 0)::DECIMAL as avg_technical,
    COALESCE(SUM(bankroll_change), 0)::DECIMAL as bankroll_change
  FROM poker_reviews 
  WHERE user_id = p_user_id 
    AND session_date >= CURRENT_DATE - INTERVAL '1 day' * p_days;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour obtenir les catégories par défaut
CREATE OR REPLACE FUNCTION get_default_categories()
RETURNS TABLE(name VARCHAR, color VARCHAR, icon VARCHAR) AS $$
BEGIN
  RETURN QUERY VALUES
    ('Travail', '#3B82F6', '💼'),
    ('Personnel', '#10B981', '🏠'),
    ('Sport', '#F59E0B', '🏃'),
    ('Apprentissage', '#8B5CF6', '📚'),
    ('Urgent', '#EF4444', '🚨');
END;
$$ LANGUAGE plpgsql;

-- ====================================
-- COMMENTAIRES
-- ====================================

COMMENT ON TABLE task_categories IS 'Catégories pour organiser les tâches';
COMMENT ON TABLE poker_settings IS 'Paramètres globaux du poker pour chaque utilisateur';
COMMENT ON TABLE poker_game_limits IS 'Limites de jeu configurées par l''utilisateur';
COMMENT ON TABLE poker_reviews IS 'Reviews de sessions de poker avec focus technique';

COMMENT ON COLUMN mind_tasks.priority IS 'Priorité: low, medium, high, urgent';
COMMENT ON COLUMN mind_tasks.archived IS 'Archivage automatique des tâches terminées';
COMMENT ON COLUMN mind_habits.hardcore_mode IS 'Mode strict: reset à zéro si un jour manqué';
COMMENT ON COLUMN poker_reviews.bb_per_100 IS 'Big blinds gagnées pour 100 mains';
COMMENT ON COLUMN poker_reviews.technical_evaluation IS 'Évaluation technique de 1 à 10';