-- Migration pour créer la table sessions
-- À exécuter dans l'éditeur SQL de Supabase

-- Table pour stocker les sessions d'entraînement (scenarios et range training)
CREATE TABLE sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    scenario_id UUID REFERENCES scenarios(id) ON DELETE SET NULL,
    scenario_name TEXT,
    range_id UUID REFERENCES tree_items(id) ON DELETE SET NULL,
    range_name TEXT,
    type TEXT NOT NULL CHECK (type IN ('scenario', 'range_training')),
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NULL, -- NULL pendant que la session est active
    duration INTEGER NOT NULL DEFAULT 0, -- durée en minutes
    total_questions INTEGER NOT NULL DEFAULT 0,
    correct_answers INTEGER NOT NULL DEFAULT 0,
    incorrect_answers INTEGER NOT NULL DEFAULT 0,
    accuracy DECIMAL(5,2) NOT NULL DEFAULT 0.00, -- pourcentage de 0 à 100
    streak INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    
    -- Contraintes de validation
    CONSTRAINT valid_duration CHECK (duration >= 0),
    CONSTRAINT valid_questions CHECK (total_questions >= 0),
    CONSTRAINT valid_answers CHECK (correct_answers >= 0 AND incorrect_answers >= 0),
    CONSTRAINT valid_accuracy CHECK (accuracy >= 0 AND accuracy <= 100),
    CONSTRAINT valid_streak CHECK (streak >= 0),
    CONSTRAINT valid_total_answers CHECK (total_questions = correct_answers + incorrect_answers),
    CONSTRAINT valid_scenario_data CHECK (
        (type = 'scenario' AND scenario_id IS NOT NULL) OR
        (type = 'range_training' AND range_id IS NOT NULL)
    )
);

-- Index pour améliorer les performances
CREATE INDEX idx_sessions_type ON sessions(type);
CREATE INDEX idx_sessions_scenario_id ON sessions(scenario_id);
CREATE INDEX idx_sessions_range_id ON sessions(range_id);
CREATE INDEX idx_sessions_created_at ON sessions(created_at);
CREATE INDEX idx_sessions_start_time ON sessions(start_time);
CREATE INDEX idx_sessions_accuracy ON sessions(accuracy);

-- Trigger pour mettre à jour updated_at automatiquement
CREATE TRIGGER update_sessions_updated_at 
    BEFORE UPDATE ON sessions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Activer RLS (Row Level Security)
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre toutes les opérations (à ajuster selon vos besoins d'authentification)
CREATE POLICY "Allow all operations on sessions" ON sessions
    FOR ALL USING (true);

-- Table pour stocker les mains jouées dans chaque session
CREATE TABLE session_hands (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    hand TEXT NOT NULL, -- ex: "AKs", "22", "A7o" (pour regroupement)
    card1 TEXT NOT NULL, -- ex: "As", "Kh", "2c"
    card2 TEXT NOT NULL, -- ex: "Ks", "Qd", "2s"
    position TEXT, -- ex: "UTG", "BTN", "SB", etc.
    player_action TEXT, -- action du joueur: "fold", "call", "raise", "all-in"
    correct_action TEXT, -- action correcte attendue
    is_correct BOOLEAN NOT NULL,
    response_time INTEGER, -- temps de réponse en millisecondes
    question_context JSONB, -- contexte: pot size, actions précédentes, stack sizes, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Index pour optimiser les requêtes
CREATE INDEX idx_session_hands_session_id ON session_hands(session_id);
CREATE INDEX idx_session_hands_hand ON session_hands(hand);
CREATE INDEX idx_session_hands_cards ON session_hands(card1, card2);
CREATE INDEX idx_session_hands_is_correct ON session_hands(is_correct);
CREATE INDEX idx_session_hands_position ON session_hands(position);
CREATE INDEX idx_session_hands_created_at ON session_hands(created_at);

-- Activer RLS
ALTER TABLE session_hands ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre toutes les opérations
CREATE POLICY "Allow all operations on session_hands" ON session_hands
    FOR ALL USING (true);