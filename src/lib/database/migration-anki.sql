-- Migration pour créer le système Anki complet
-- À exécuter dans l'éditeur SQL de Supabase

-- Table pour les decks Anki (structure hiérarchique comme tree_items)
CREATE TABLE anki_decks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    parent_id UUID REFERENCES anki_decks(id) ON DELETE CASCADE,
    color TEXT DEFAULT '#3B82F6', -- Couleur pour l'UI
    icon TEXT DEFAULT '📚', -- Emoji ou nom d'icône
    description TEXT,
    is_expanded BOOLEAN DEFAULT true, -- Pour l'état du tree dans l'UI
    
    -- Configuration du deck
    new_cards_per_day INTEGER DEFAULT 20,
    review_cards_per_day INTEGER DEFAULT 200,
    learning_steps INTEGER[] DEFAULT '{1,10}', -- en minutes
    graduating_interval INTEGER DEFAULT 1, -- en jours
    easy_interval INTEGER DEFAULT 4, -- en jours
    starting_ease DECIMAL DEFAULT 2.5,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    
    -- Contraintes
    CONSTRAINT valid_intervals CHECK (
        new_cards_per_day > 0 AND 
        review_cards_per_day > 0 AND
        graduating_interval > 0 AND
        easy_interval > 0 AND
        starting_ease >= 1.3
    )
);

-- Table pour les cartes Anki
CREATE TABLE anki_cards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    deck_id UUID NOT NULL REFERENCES anki_decks(id) ON DELETE CASCADE,
    
    -- Contenu de la carte
    front TEXT NOT NULL,
    back TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}',
    
    -- État de la carte (new, learning, review, relearning)
    card_state TEXT DEFAULT 'new' CHECK (card_state IN ('new', 'learning', 'review', 'relearning')),
    
    -- Algorithme SM-2
    ease_factor DECIMAL DEFAULT 2.5,
    interval_days INTEGER DEFAULT 0, -- 0 pour new cards
    due_date TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    
    -- Statistiques
    review_count INTEGER DEFAULT 0,
    lapse_count INTEGER DEFAULT 0, -- Nombre de fois "oubliée"
    
    -- Métadonnées
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    last_reviewed TIMESTAMP WITH TIME ZONE,
    
    -- Contraintes
    CONSTRAINT valid_ease_factor CHECK (ease_factor >= 1.3),
    CONSTRAINT valid_interval CHECK (interval_days >= 0),
    CONSTRAINT valid_counts CHECK (review_count >= 0 AND lapse_count >= 0)
);

-- Table pour l'historique des révisions (pour statistiques)
CREATE TABLE anki_reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    card_id UUID NOT NULL REFERENCES anki_cards(id) ON DELETE CASCADE,
    
    -- Détails de la révision
    quality INTEGER NOT NULL CHECK (quality BETWEEN 1 AND 4), -- 1=Again, 2=Hard, 3=Good, 4=Easy
    response_time_ms INTEGER, -- Temps de réponse en millisecondes
    
    -- État avant/après pour analyse
    ease_before DECIMAL NOT NULL,
    ease_after DECIMAL NOT NULL,
    interval_before INTEGER NOT NULL,
    interval_after INTEGER NOT NULL,
    
    -- Session info
    session_id UUID, -- Optionnel, pour grouper les révisions
    
    reviewed_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    
    -- Contraintes
    CONSTRAINT valid_quality CHECK (quality BETWEEN 1 AND 4),
    CONSTRAINT valid_ease_values CHECK (ease_before >= 1.3 AND ease_after >= 1.3),
    CONSTRAINT valid_intervals CHECK (interval_before >= 0 AND interval_after >= 0)
);

-- Table pour les sessions d'étude (pour statistiques)
CREATE TABLE anki_study_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    deck_id UUID REFERENCES anki_decks(id) ON DELETE SET NULL, -- Peut être multi-deck
    
    -- Détails de la session
    start_time TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    
    -- Statistiques de session
    cards_studied INTEGER DEFAULT 0,
    new_cards INTEGER DEFAULT 0,
    review_cards INTEGER DEFAULT 0,
    relearning_cards INTEGER DEFAULT 0,
    
    -- Performance
    avg_response_time_ms INTEGER,
    total_study_time_ms INTEGER,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    
    -- Contraintes
    CONSTRAINT valid_session_times CHECK (end_time IS NULL OR end_time >= start_time),
    CONSTRAINT valid_card_counts CHECK (
        cards_studied >= 0 AND 
        new_cards >= 0 AND 
        review_cards >= 0 AND 
        relearning_cards >= 0
    )
);

-- Index pour améliorer les performances
CREATE INDEX idx_anki_decks_parent_id ON anki_decks(parent_id);
CREATE INDEX idx_anki_cards_deck_id ON anki_cards(deck_id);
CREATE INDEX idx_anki_cards_due_date ON anki_cards(due_date);
CREATE INDEX idx_anki_cards_state ON anki_cards(card_state);
CREATE INDEX idx_anki_cards_tags ON anki_cards USING GIN(tags);
CREATE INDEX idx_anki_reviews_card_id ON anki_reviews(card_id);
CREATE INDEX idx_anki_reviews_date ON anki_reviews(reviewed_at);
CREATE INDEX idx_anki_sessions_deck_id ON anki_study_sessions(deck_id);
CREATE INDEX idx_anki_sessions_start_time ON anki_study_sessions(start_time);

-- Trigger pour mettre à jour updated_at automatiquement
CREATE TRIGGER update_anki_decks_updated_at 
    BEFORE UPDATE ON anki_decks 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_anki_cards_updated_at 
    BEFORE UPDATE ON anki_cards 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Activer RLS (Row Level Security)
ALTER TABLE anki_decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE anki_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE anki_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE anki_study_sessions ENABLE ROW LEVEL SECURITY;

-- Politiques pour permettre toutes les opérations (à ajuster selon vos besoins d'authentification)
CREATE POLICY "Allow all operations on anki_decks" ON anki_decks FOR ALL USING (true);
CREATE POLICY "Allow all operations on anki_cards" ON anki_cards FOR ALL USING (true);
CREATE POLICY "Allow all operations on anki_reviews" ON anki_reviews FOR ALL USING (true);
CREATE POLICY "Allow all operations on anki_study_sessions" ON anki_study_sessions FOR ALL USING (true);

-- Données d'exemple pour commencer
INSERT INTO anki_decks (name, description, icon) VALUES 
('Poker Fundamentals', 'Concepts de base du poker', '🃏'),
('Advanced Strategy', 'Stratégies avancées', '🧠'),
('Tournament Play', 'Jeu en tournoi', '🏆');

-- Ajouter quelques sous-decks
INSERT INTO anki_decks (name, parent_id, description, icon) 
SELECT 'Ranges', id, 'Ranges d''ouverture et de défense', '📊'
FROM anki_decks WHERE name = 'Poker Fundamentals';

INSERT INTO anki_decks (name, parent_id, description, icon)
SELECT 'Pot Odds', id, 'Calculs de cotes', '🔢'
FROM anki_decks WHERE name = 'Poker Fundamentals';