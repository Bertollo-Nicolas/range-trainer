-- Complete Range Trainer Database Setup
-- Execute this entire file in your Supabase SQL editor to set up the complete database schema
-- This will create all necessary tables, indexes, triggers, and RLS policies

-- =============================================================================
-- UTILITY FUNCTIONS
-- =============================================================================

-- Function to automatically update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- =============================================================================
-- CORE RANGE MANAGEMENT SYSTEM
-- =============================================================================

-- Table for tree structure (folders and ranges)
CREATE TABLE tree_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('folder', 'range')),
    parent_id UUID REFERENCES tree_items(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    
    -- Folder metadata
    is_expanded BOOLEAN DEFAULT false,
    
    -- Range data (legacy format)
    hands JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    
    -- New editor data format
    data JSONB DEFAULT '{}'::jsonb,
    description TEXT,
    
    -- Validation constraints
    CONSTRAINT valid_folder_data CHECK (
        (type = 'folder' AND hands = '[]'::jsonb AND notes IS NULL) OR
        (type = 'range')
    )
);

-- Indexes for performance
CREATE INDEX idx_tree_items_parent_id ON tree_items(parent_id);
CREATE INDEX idx_tree_items_type ON tree_items(type);
CREATE INDEX idx_tree_items_created_at ON tree_items(created_at);

-- Auto-update trigger
CREATE TRIGGER update_tree_items_updated_at 
    BEFORE UPDATE ON tree_items 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS and create policy
ALTER TABLE tree_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations on tree_items" ON tree_items FOR ALL USING (true);

-- =============================================================================
-- SCENARIO SYSTEM
-- =============================================================================

-- Table for poker scenarios
CREATE TABLE scenarios (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    graph_data JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Indexes for scenarios
CREATE INDEX idx_scenarios_created_at ON scenarios(created_at);
CREATE INDEX idx_scenarios_name ON scenarios(name);

-- Auto-update trigger
CREATE TRIGGER update_scenarios_updated_at 
    BEFORE UPDATE ON scenarios 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS and create policy
ALTER TABLE scenarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations on scenarios" ON scenarios FOR ALL USING (true);

-- =============================================================================
-- SESSION TRACKING SYSTEM
-- =============================================================================

-- Table for training sessions
CREATE TABLE sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    scenario_id UUID REFERENCES scenarios(id) ON DELETE SET NULL,
    scenario_name TEXT,
    range_id UUID REFERENCES tree_items(id) ON DELETE SET NULL,
    range_name TEXT,
    type TEXT NOT NULL CHECK (type IN ('scenario', 'range_training')),
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    duration INTEGER DEFAULT 0,
    total_questions INTEGER DEFAULT 0,
    correct_answers INTEGER DEFAULT 0,
    incorrect_answers INTEGER DEFAULT 0,
    accuracy DECIMAL(5,2) DEFAULT 0.00,
    streak INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    
    -- Validation constraints
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

-- Indexes for sessions
CREATE INDEX idx_sessions_type ON sessions(type);
CREATE INDEX idx_sessions_scenario_id ON sessions(scenario_id);
CREATE INDEX idx_sessions_range_id ON sessions(range_id);
CREATE INDEX idx_sessions_created_at ON sessions(created_at);
CREATE INDEX idx_sessions_start_time ON sessions(start_time);
CREATE INDEX idx_sessions_accuracy ON sessions(accuracy);

-- Auto-update trigger
CREATE TRIGGER update_sessions_updated_at 
    BEFORE UPDATE ON sessions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS and create policy
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations on sessions" ON sessions FOR ALL USING (true);

-- Table for individual hands played in sessions
CREATE TABLE session_hands (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    hand TEXT NOT NULL,
    card1 TEXT NOT NULL,
    card2 TEXT NOT NULL,
    position TEXT,
    player_action TEXT,
    correct_action TEXT,
    is_correct BOOLEAN NOT NULL,
    response_time INTEGER,
    question_context JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Indexes for session hands
CREATE INDEX idx_session_hands_session_id ON session_hands(session_id);
CREATE INDEX idx_session_hands_hand ON session_hands(hand);
CREATE INDEX idx_session_hands_cards ON session_hands(card1, card2);
CREATE INDEX idx_session_hands_is_correct ON session_hands(is_correct);
CREATE INDEX idx_session_hands_position ON session_hands(position);
CREATE INDEX idx_session_hands_created_at ON session_hands(created_at);

-- Enable RLS and create policy
ALTER TABLE session_hands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations on session_hands" ON session_hands FOR ALL USING (true);

-- =============================================================================
-- ANKI SPACED REPETITION SYSTEM
-- =============================================================================

-- Table for Anki decks (hierarchical structure)
CREATE TABLE anki_decks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    parent_id UUID REFERENCES anki_decks(id) ON DELETE CASCADE,
    color TEXT DEFAULT '#3B82F6',
    icon TEXT DEFAULT '📚',
    description TEXT,
    is_expanded BOOLEAN DEFAULT true,
    
    -- Deck configuration
    new_cards_per_day INTEGER DEFAULT 20,
    review_cards_per_day INTEGER DEFAULT 200,
    learning_steps INTEGER[] DEFAULT '{1,10}',
    graduating_interval INTEGER DEFAULT 1,
    easy_interval INTEGER DEFAULT 4,
    starting_ease DECIMAL DEFAULT 2.5,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    
    -- Validation constraints
    CONSTRAINT valid_intervals CHECK (
        new_cards_per_day > 0 AND 
        review_cards_per_day > 0 AND
        graduating_interval > 0 AND
        easy_interval > 0 AND
        starting_ease >= 1.3
    )
);

-- Table for Anki cards
CREATE TABLE anki_cards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    deck_id UUID NOT NULL REFERENCES anki_decks(id) ON DELETE CASCADE,
    
    -- Card content
    front TEXT NOT NULL,
    back TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}',
    
    -- Card state
    card_state TEXT DEFAULT 'new' CHECK (card_state IN ('new', 'learning', 'review', 'relearning')),
    
    -- SM-2 algorithm data
    ease_factor DECIMAL DEFAULT 2.5,
    interval_days INTEGER DEFAULT 0,
    due_date TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    
    -- Statistics
    review_count INTEGER DEFAULT 0,
    lapse_count INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    last_reviewed TIMESTAMP WITH TIME ZONE,
    
    -- Validation constraints
    CONSTRAINT valid_ease_factor CHECK (ease_factor >= 1.3),
    CONSTRAINT valid_interval CHECK (interval_days >= 0),
    CONSTRAINT valid_counts CHECK (review_count >= 0 AND lapse_count >= 0)
);

-- Table for Anki review history
CREATE TABLE anki_reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    card_id UUID NOT NULL REFERENCES anki_cards(id) ON DELETE CASCADE,
    
    -- Review details
    quality INTEGER NOT NULL CHECK (quality BETWEEN 1 AND 4),
    response_time_ms INTEGER,
    
    -- Before/after state for analysis
    ease_before DECIMAL NOT NULL,
    ease_after DECIMAL NOT NULL,
    interval_before INTEGER NOT NULL,
    interval_after INTEGER NOT NULL,
    
    -- Session info
    session_id UUID,
    
    reviewed_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    
    -- Validation constraints
    CONSTRAINT valid_quality CHECK (quality BETWEEN 1 AND 4),
    CONSTRAINT valid_ease_values CHECK (ease_before >= 1.3 AND ease_after >= 1.3),
    CONSTRAINT valid_intervals CHECK (interval_before >= 0 AND interval_after >= 0)
);

-- Table for Anki study sessions
CREATE TABLE anki_study_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    deck_id UUID REFERENCES anki_decks(id) ON DELETE SET NULL,
    
    -- Session details
    start_time TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    
    -- Session statistics
    cards_studied INTEGER DEFAULT 0,
    new_cards INTEGER DEFAULT 0,
    review_cards INTEGER DEFAULT 0,
    relearning_cards INTEGER DEFAULT 0,
    
    -- Performance metrics
    avg_response_time_ms INTEGER,
    total_study_time_ms INTEGER,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    
    -- Validation constraints
    CONSTRAINT valid_session_times CHECK (end_time IS NULL OR end_time >= start_time),
    CONSTRAINT valid_card_counts CHECK (
        cards_studied >= 0 AND 
        new_cards >= 0 AND 
        review_cards >= 0 AND 
        relearning_cards >= 0
    )
);

-- Indexes for Anki system
CREATE INDEX idx_anki_decks_parent_id ON anki_decks(parent_id);
CREATE INDEX idx_anki_cards_deck_id ON anki_cards(deck_id);
CREATE INDEX idx_anki_cards_due_date ON anki_cards(due_date);
CREATE INDEX idx_anki_cards_state ON anki_cards(card_state);
CREATE INDEX idx_anki_cards_tags ON anki_cards USING GIN(tags);
CREATE INDEX idx_anki_reviews_card_id ON anki_reviews(card_id);
CREATE INDEX idx_anki_reviews_date ON anki_reviews(reviewed_at);
CREATE INDEX idx_anki_sessions_deck_id ON anki_study_sessions(deck_id);
CREATE INDEX idx_anki_sessions_start_time ON anki_study_sessions(start_time);

-- Auto-update triggers for Anki tables
CREATE TRIGGER update_anki_decks_updated_at 
    BEFORE UPDATE ON anki_decks 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_anki_cards_updated_at 
    BEFORE UPDATE ON anki_cards 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS and create policies for Anki system
ALTER TABLE anki_decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE anki_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE anki_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE anki_study_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on anki_decks" ON anki_decks FOR ALL USING (true);
CREATE POLICY "Allow all operations on anki_cards" ON anki_cards FOR ALL USING (true);
CREATE POLICY "Allow all operations on anki_reviews" ON anki_reviews FOR ALL USING (true);
CREATE POLICY "Allow all operations on anki_study_sessions" ON anki_study_sessions FOR ALL USING (true);

-- =============================================================================
-- SAMPLE DATA
-- =============================================================================

-- Sample tree structure
INSERT INTO tree_items (name, type, parent_id, is_expanded) VALUES
('Postflop', 'folder', NULL, true),
('Preflop', 'folder', NULL, false);

-- Sample subfolder
INSERT INTO tree_items (name, type, parent_id, is_expanded) 
SELECT 'UTG', 'folder', id, true 
FROM tree_items WHERE name = 'Postflop' AND type = 'folder';

-- Sample ranges
INSERT INTO tree_items (name, type, parent_id, hands, notes) 
SELECT 'Value Range', 'range', id, '["AA", "KK", "QQ", "AK"]'::jsonb, 'Standard value range'
FROM tree_items WHERE name = 'UTG' AND type = 'folder';

INSERT INTO tree_items (name, type, parent_id, hands, notes) 
SELECT 'Bluff Range', 'range', id, '["A5s", "A4s", "A3s", "A2s"]'::jsonb, 'Suited aces bluff range'
FROM tree_items WHERE name = 'UTG' AND type = 'folder';

-- Sample Anki decks
INSERT INTO anki_decks (name, description, icon) VALUES 
('Poker Fundamentals', 'Basic poker concepts', '🃏'),
('Advanced Strategy', 'Advanced strategies', '🧠'),
('Tournament Play', 'Tournament play', '🏆');

-- Sample subdecks
INSERT INTO anki_decks (name, parent_id, description, icon) 
SELECT 'Ranges', id, 'Opening and defense ranges', '📊'
FROM anki_decks WHERE name = 'Poker Fundamentals';

INSERT INTO anki_decks (name, parent_id, description, icon)
SELECT 'Pot Odds', id, 'Pot odds calculations', '🔢'
FROM anki_decks WHERE name = 'Poker Fundamentals';

-- Sample cards
INSERT INTO anki_cards (deck_id, front, back, tags)
SELECT id, 'What is a continuation bet?', 'A bet made by the preflop aggressor on the flop', ARRAY['cbetting', 'postflop']
FROM anki_decks WHERE name = 'Poker Fundamentals';

INSERT INTO anki_cards (deck_id, front, back, tags)
SELECT id, 'What percentage of hands should UTG open in 6-max?', 'Approximately 15-18% of hands', ARRAY['ranges', 'preflop', 'utg']
FROM anki_decks WHERE name = 'Ranges';

-- =============================================================================
-- COMPLETION MESSAGE
-- =============================================================================

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Range Trainer database setup completed successfully!';
    RAISE NOTICE 'Created tables: tree_items, scenarios, sessions, session_hands, anki_decks, anki_cards, anki_reviews, anki_study_sessions';
    RAISE NOTICE 'All indexes, triggers, and RLS policies have been applied.';
    RAISE NOTICE 'Sample data has been inserted for testing.';
END $$;