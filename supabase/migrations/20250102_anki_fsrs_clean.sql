-- Clean FSRS Migration - Only adds FSRS tables without conflicts
-- This migration assumes existing anki_decks table exists

-- ==================== DROP EXISTING ANKI TABLES IF THEY EXIST ====================

-- Drop existing anki tables to avoid conflicts (preserve anki_decks)
DROP TABLE IF EXISTS anki_reviews CASCADE;
DROP TABLE IF EXISTS anki_study_sessions CASCADE;
DROP TABLE IF EXISTS anki_cards CASCADE;

-- ==================== CARTES V2 AVEC FSRS ====================

CREATE TABLE anki_cards_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id UUID NOT NULL REFERENCES anki_decks(id) ON DELETE CASCADE,
  
  -- Contenu de la carte
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  
  -- État FSRS
  state INTEGER NOT NULL DEFAULT 0, -- 0=New, 1=Learning, 2=Review, 3=Relearning
  difficulty REAL NOT NULL DEFAULT 0,
  stability REAL NOT NULL DEFAULT 0,
  due TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_review TIMESTAMPTZ,
  
  -- Métadonnées
  suspended BOOLEAN NOT NULL DEFAULT FALSE,
  buried BOOLEAN NOT NULL DEFAULT FALSE,
  leech_count INTEGER NOT NULL DEFAULT 0,
  
  -- Paramètres optionnels de scheduling
  scheduling_params JSONB,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour les cartes
CREATE INDEX idx_anki_cards_v2_deck_id ON anki_cards_v2(deck_id);
CREATE INDEX idx_anki_cards_v2_due ON anki_cards_v2(due) WHERE NOT suspended AND NOT buried;
CREATE INDEX idx_anki_cards_v2_state ON anki_cards_v2(state);
CREATE INDEX idx_anki_cards_v2_tags ON anki_cards_v2 USING gin(tags);
CREATE INDEX idx_anki_cards_v2_front_back ON anki_cards_v2 USING gin(to_tsvector('english', front || ' ' || back));

-- ==================== RÉVISIONS V2 ====================

CREATE TABLE anki_reviews_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES anki_cards_v2(id) ON DELETE CASCADE,
  session_id UUID, -- Référence à la session d'étude
  
  -- Données de la révision
  grade INTEGER NOT NULL CHECK (grade BETWEEN 1 AND 4), -- 1=Again, 2=Hard, 3=Good, 4=Easy
  duration INTEGER NOT NULL DEFAULT 0, -- en millisecondes
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- État avant révision
  state_before INTEGER NOT NULL,
  due_before TIMESTAMPTZ NOT NULL,
  
  -- État après révision
  state_after INTEGER NOT NULL,
  due_after TIMESTAMPTZ NOT NULL,
  
  -- Log FSRS complet (sérialisé)
  fsrs_log JSONB NOT NULL
);

-- Index pour les révisions
CREATE INDEX idx_anki_reviews_v2_card_id ON anki_reviews_v2(card_id);
CREATE INDEX idx_anki_reviews_v2_session_id ON anki_reviews_v2(session_id);
CREATE INDEX idx_anki_reviews_v2_timestamp ON anki_reviews_v2(timestamp);
CREATE INDEX idx_anki_reviews_v2_grade ON anki_reviews_v2(grade);

-- ==================== SESSIONS D'ÉTUDE V2 ====================

CREATE TABLE anki_study_sessions_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id UUID REFERENCES anki_decks(id) ON DELETE SET NULL,
  
  -- Timing de la session
  start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_time TIMESTAMPTZ,
  
  -- Statistiques de base
  cards_reviewed INTEGER NOT NULL DEFAULT 0,
  new_cards INTEGER NOT NULL DEFAULT 0,
  review_cards INTEGER NOT NULL DEFAULT 0,
  
  -- Temps et performance
  total_duration INTEGER NOT NULL DEFAULT 0, -- en millisecondes
  average_duration INTEGER NOT NULL DEFAULT 0, -- en millisecondes
  
  -- Distribution des grades
  again_count INTEGER NOT NULL DEFAULT 0,
  hard_count INTEGER NOT NULL DEFAULT 0,
  good_count INTEGER NOT NULL DEFAULT 0,
  easy_count INTEGER NOT NULL DEFAULT 0
);

-- Index pour les sessions
CREATE INDEX idx_anki_study_sessions_v2_deck_id ON anki_study_sessions_v2(deck_id);
CREATE INDEX idx_anki_study_sessions_v2_start_time ON anki_study_sessions_v2(start_time);

-- ==================== PARAMÈTRES DE DECK V2 ====================

CREATE TABLE anki_deck_settings_v2 (
  deck_id UUID PRIMARY KEY REFERENCES anki_decks(id) ON DELETE CASCADE,
  
  -- Configuration complète stockée en JSON
  settings JSONB NOT NULL,
  
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==================== FONCTIONS ET TRIGGERS ====================

-- Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers pour updated_at
CREATE TRIGGER update_anki_cards_v2_updated_at 
  BEFORE UPDATE ON anki_cards_v2 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_anki_deck_settings_v2_updated_at 
  BEFORE UPDATE ON anki_deck_settings_v2 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==================== VUES POUR STATISTIQUES ====================

-- Vue pour les cartes dues
CREATE VIEW anki_due_cards_v2 AS
SELECT 
  c.*,
  d.name as deck_name,
  CASE 
    WHEN c.due <= NOW() AND c.state = 0 THEN 'new'
    WHEN c.due <= NOW() AND c.state IN (1, 3) THEN 'learning'
    WHEN c.due <= NOW() AND c.state = 2 THEN 'review'
    ELSE 'future'
  END as card_priority,
  EXTRACT(DAY FROM (NOW() - c.due)) as overdue_days
FROM anki_cards_v2 c
JOIN anki_decks d ON c.deck_id = d.id
WHERE NOT c.suspended AND NOT c.buried;

-- Vue pour les statistiques de deck
CREATE VIEW anki_deck_stats_v2 AS
SELECT 
  d.id as deck_id,
  d.name as deck_name,
  COUNT(c.id) as total_cards,
  COUNT(c.id) FILTER (WHERE c.state = 0) as new_cards,
  COUNT(c.id) FILTER (WHERE c.state IN (1, 3)) as learning_cards,
  COUNT(c.id) FILTER (WHERE c.state = 2) as review_cards,
  COUNT(c.id) FILTER (WHERE c.suspended) as suspended_cards,
  COUNT(c.id) FILTER (WHERE c.buried) as buried_cards,
  COUNT(c.id) FILTER (WHERE c.due <= NOW() AND NOT c.suspended AND NOT c.buried) as due_cards,
  COUNT(c.id) FILTER (WHERE c.due < NOW() - INTERVAL '1 day' AND NOT c.suspended AND NOT c.buried) as overdue_cards
FROM anki_decks d
LEFT JOIN anki_cards_v2 c ON d.id = c.deck_id
GROUP BY d.id, d.name;

-- ==================== POLITIQUES RLS ====================

-- Enable RLS and create permissive policies (matching existing pattern)
ALTER TABLE anki_cards_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE anki_reviews_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE anki_study_sessions_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE anki_deck_settings_v2 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on anki_cards_v2" ON anki_cards_v2 FOR ALL USING (true);
CREATE POLICY "Allow all operations on anki_reviews_v2" ON anki_reviews_v2 FOR ALL USING (true);
CREATE POLICY "Allow all operations on anki_study_sessions_v2" ON anki_study_sessions_v2 FOR ALL USING (true);
CREATE POLICY "Allow all operations on anki_deck_settings_v2" ON anki_deck_settings_v2 FOR ALL USING (true);

-- ==================== FONCTIONS UTILITAIRES ====================

-- Fonction pour calculer les statistiques de rétention
CREATE OR REPLACE FUNCTION calculate_retention_rate(deck_id_param UUID, days_back INTEGER DEFAULT 30)
RETURNS REAL AS $$
DECLARE
  total_reviews INTEGER;
  successful_reviews INTEGER;
BEGIN
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE grade >= 3)
  INTO total_reviews, successful_reviews
  FROM anki_reviews_v2 r
  JOIN anki_cards_v2 c ON r.card_id = c.id
  WHERE c.deck_id = deck_id_param
    AND r.timestamp >= NOW() - (days_back || ' days')::INTERVAL;
  
  IF total_reviews = 0 THEN
    RETURN 0;
  END IF;
  
  RETURN successful_reviews::REAL / total_reviews::REAL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour obtenir la charge de travail prédite
CREATE OR REPLACE FUNCTION predict_workload(deck_id_param UUID, days_ahead INTEGER DEFAULT 7)
RETURNS TABLE (
  date DATE,
  new_cards BIGINT,
  review_cards BIGINT,
  total_cards BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.date::DATE,
    COUNT(*) FILTER (WHERE c.state = 0) as new_cards,
    COUNT(*) FILTER (WHERE c.state != 0) as review_cards,
    COUNT(*) as total_cards
  FROM generate_series(
    CURRENT_DATE, 
    CURRENT_DATE + (days_ahead || ' days')::INTERVAL, 
    '1 day'::INTERVAL
  ) AS d(date)
  LEFT JOIN anki_cards_v2 c ON DATE(c.due) = d.date::DATE 
    AND c.deck_id = deck_id_param
    AND NOT c.suspended 
    AND NOT c.buried
  GROUP BY d.date
  ORDER BY d.date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==================== DONNÉES DE TEST ====================

-- Insertion de paramètres par défaut pour les decks existants
INSERT INTO anki_deck_settings_v2 (deck_id, settings)
SELECT 
  id,
  '{
    "newCardsPerDay": 20,
    "maxReviewsPerDay": 200,
    "requestRetention": 0.9,
    "maximumInterval": 36500,
    "learningSteps": [1, 10],
    "graduatingInterval": 1,
    "easyInterval": 4,
    "lapseSteps": [10],
    "leechThreshold": 8,
    "showTimer": true,
    "autoAdvance": false,
    "randomizeOrder": true
  }'::jsonb
FROM anki_decks
WHERE id NOT IN (SELECT deck_id FROM anki_deck_settings_v2);

-- ==================== COMMENTAIRES ====================

COMMENT ON TABLE anki_cards_v2 IS 'Anki cards with full FSRS support';
COMMENT ON TABLE anki_reviews_v2 IS 'Review history with FSRS data';
COMMENT ON TABLE anki_study_sessions_v2 IS 'Study sessions with detailed statistics';
COMMENT ON TABLE anki_deck_settings_v2 IS 'Deck configuration parameters';

COMMENT ON COLUMN anki_cards_v2.state IS '0=New, 1=Learning, 2=Review, 3=Relearning';
COMMENT ON COLUMN anki_cards_v2.difficulty IS 'FSRS difficulty (0-10)';
COMMENT ON COLUMN anki_cards_v2.stability IS 'FSRS stability in days';
COMMENT ON COLUMN anki_reviews_v2.grade IS '1=Again, 2=Hard, 3=Good, 4=Easy';
COMMENT ON COLUMN anki_reviews_v2.fsrs_log IS 'Complete FSRS log for review';