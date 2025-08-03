-- Migration pour créer les tables de base du système Mind
-- Date: 2025-01-02

-- ====================================
-- TABLES DE BASE MIND
-- ====================================

-- Table des objectifs/goals (doit être créée en premier pour les références)
CREATE TABLE IF NOT EXISTS mind_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  deadline DATE,
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  category VARCHAR(50),
  is_smart BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des tâches
CREATE TABLE IF NOT EXISTS mind_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'completed')),
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  archived BOOLEAN DEFAULT FALSE,
  archived_at TIMESTAMPTZ,
  linked_goal_id UUID REFERENCES mind_goals(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des habitudes
CREATE TABLE IF NOT EXISTS mind_habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  frequency VARCHAR(20) DEFAULT 'daily' CHECK (frequency IN ('daily', '3x_week', 'weekly', 'monthly')),
  current_streak INTEGER DEFAULT 0,
  max_streak INTEGER DEFAULT 0,
  completion_rate INTEGER DEFAULT 0,
  is_hardcore BOOLEAN DEFAULT FALSE,
  hardcore_weeks INTEGER DEFAULT 4,
  linked_goal_id UUID REFERENCES mind_goals(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des entrées d'habitudes
CREATE TABLE IF NOT EXISTS habit_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  habit_id UUID REFERENCES mind_habits(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status VARCHAR(20) CHECK (status IN ('completed', 'failed', 'partial')),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(habit_id, date)
);

-- Table des entrées de journal
CREATE TABLE IF NOT EXISTS mind_journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  mood INTEGER CHECK (mood >= -5 AND mood <= 5),
  game_quality VARCHAR(1) CHECK (game_quality IN ('A', 'B', 'C', 'D')),
  tags TEXT[], -- Array de tags
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des leaks mentaux
CREATE TABLE IF NOT EXISTS mind_leaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  trigger TEXT NOT NULL,
  automatic_thought TEXT,
  mental_reflex TEXT,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'resolved')),
  severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high')),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des reviews poker
CREATE TABLE IF NOT EXISTS poker_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  game_format VARCHAR(20) DEFAULT 'cash' CHECK (game_format IN ('cash', 'tournament', 'sng', 'spin')),
  stakes VARCHAR(50) NOT NULL,
  hands_played INTEGER NOT NULL CHECK (hands_played > 0),
  session_duration INTEGER DEFAULT 0, -- en minutes
  bb_per_100 DECIMAL(10,2) DEFAULT 0,
  bankroll_change DECIMAL(10,2) DEFAULT 0,
  technical_rating VARCHAR(1) DEFAULT 'B' CHECK (technical_rating IN ('A', 'B', 'C', 'D')),
  notes TEXT,
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des paramètres poker
CREATE TABLE IF NOT EXISTS poker_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  current_bankroll DECIMAL(10,2) DEFAULT 0,
  target_bankroll DECIMAL(10,2) DEFAULT 0,
  stakes_played TEXT[], -- Array de stakes
  bankroll_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================
-- INDEXES POUR PERFORMANCE
-- ====================================

-- Index sur user_id pour toutes les tables
CREATE INDEX IF NOT EXISTS idx_mind_goals_user_id ON mind_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_mind_tasks_user_id ON mind_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_mind_habits_user_id ON mind_habits(user_id);
CREATE INDEX IF NOT EXISTS idx_habit_entries_user_id ON habit_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_mind_journal_entries_user_id ON mind_journal_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_mind_leaks_user_id ON mind_leaks(user_id);
CREATE INDEX IF NOT EXISTS idx_poker_reviews_user_id ON poker_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_poker_settings_user_id ON poker_settings(user_id);

-- Index sur les dates
CREATE INDEX IF NOT EXISTS idx_habit_entries_date ON habit_entries(date);
CREATE INDEX IF NOT EXISTS idx_mind_journal_entries_date ON mind_journal_entries(date);
CREATE INDEX IF NOT EXISTS idx_poker_reviews_date ON poker_reviews(date);

-- Index sur les statuts
CREATE INDEX IF NOT EXISTS idx_mind_tasks_status ON mind_tasks(status);
CREATE INDEX IF NOT EXISTS idx_mind_tasks_archived ON mind_tasks(archived);
CREATE INDEX IF NOT EXISTS idx_mind_leaks_status ON mind_leaks(status);

-- ====================================
-- ROW LEVEL SECURITY (RLS)
-- ====================================

-- Activer RLS sur toutes les tables
ALTER TABLE mind_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE mind_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE mind_habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE mind_journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE mind_leaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE poker_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE poker_settings ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour chaque table
-- Les utilisateurs ne peuvent voir que leurs propres données

-- Politiques pour mind_goals
CREATE POLICY "Users can view own goals" ON mind_goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own goals" ON mind_goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own goals" ON mind_goals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own goals" ON mind_goals FOR DELETE USING (auth.uid() = user_id);

-- Politiques pour mind_tasks
CREATE POLICY "Users can view own tasks" ON mind_tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tasks" ON mind_tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tasks" ON mind_tasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own tasks" ON mind_tasks FOR DELETE USING (auth.uid() = user_id);

-- Politiques pour mind_habits
CREATE POLICY "Users can view own habits" ON mind_habits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own habits" ON mind_habits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own habits" ON mind_habits FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own habits" ON mind_habits FOR DELETE USING (auth.uid() = user_id);

-- Politiques pour habit_entries
CREATE POLICY "Users can view own habit entries" ON habit_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own habit entries" ON habit_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own habit entries" ON habit_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own habit entries" ON habit_entries FOR DELETE USING (auth.uid() = user_id);

-- Politiques pour mind_journal_entries
CREATE POLICY "Users can view own journal entries" ON mind_journal_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own journal entries" ON mind_journal_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own journal entries" ON mind_journal_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own journal entries" ON mind_journal_entries FOR DELETE USING (auth.uid() = user_id);

-- Politiques pour mind_leaks
CREATE POLICY "Users can view own leaks" ON mind_leaks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own leaks" ON mind_leaks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own leaks" ON mind_leaks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own leaks" ON mind_leaks FOR DELETE USING (auth.uid() = user_id);

-- Politiques pour poker_reviews
CREATE POLICY "Users can view own poker reviews" ON poker_reviews FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own poker reviews" ON poker_reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own poker reviews" ON poker_reviews FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own poker reviews" ON poker_reviews FOR DELETE USING (auth.uid() = user_id);

-- Politiques pour poker_settings
CREATE POLICY "Users can view own poker settings" ON poker_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own poker settings" ON poker_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own poker settings" ON poker_settings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own poker settings" ON poker_settings FOR DELETE USING (auth.uid() = user_id);