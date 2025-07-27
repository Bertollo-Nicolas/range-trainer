export interface Database {
  public: {
    Tables: {
      tree_items: {
        Row: {
          id: string
          name: string
          type: 'folder' | 'range'
          parent_id: string | null
          created_at: string
          updated_at: string
          is_expanded: boolean | null
          hands: string[] | null
          notes: string | null
          editor_data: any | null
        }
        Insert: {
          id?: string
          name: string
          type: 'folder' | 'range'
          parent_id?: string | null
          created_at?: string
          updated_at?: string
          is_expanded?: boolean | null
          hands?: string[] | null
          notes?: string | null
          editor_data?: any | null
        }
        Update: {
          id?: string
          name?: string
          type?: 'folder' | 'range'
          parent_id?: string | null
          created_at?: string
          updated_at?: string
          is_expanded?: boolean | null
          hands?: string[] | null
          notes?: string | null
          editor_data?: any | null
        }
      }
      sessions: {
        Row: {
          id: string
          scenario_id: string | null
          scenario_name: string | null
          range_id: string | null
          range_name: string | null
          type: 'scenario' | 'range_training'
          start_time: string
          end_time: string | null
          duration: number
          total_questions: number
          correct_answers: number
          incorrect_answers: number
          accuracy: number
          streak: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          scenario_id?: string | null
          scenario_name?: string | null
          range_id?: string | null
          range_name?: string | null
          type: 'scenario' | 'range_training'
          start_time: string
          end_time?: string | null
          duration?: number
          total_questions: number
          correct_answers: number
          incorrect_answers: number
          accuracy: number
          streak: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          scenario_id?: string | null
          scenario_name?: string | null
          range_id?: string | null
          range_name?: string | null
          type?: 'scenario' | 'range_training'
          start_time?: string
          end_time?: string
          duration?: number
          total_questions?: number
          correct_answers?: number
          incorrect_answers?: number
          accuracy?: number
          streak?: number
          created_at?: string
          updated_at?: string
        }
      }
      session_hands: {
        Row: {
          id: string
          session_id: string
          hand: string
          card1: string
          card2: string
          position: string | null
          player_action: string | null
          correct_action: string | null
          is_correct: boolean
          response_time: number | null
          question_context: any | null
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          hand: string
          card1: string
          card2: string
          position?: string | null
          player_action?: string | null
          correct_action?: string | null
          is_correct: boolean
          response_time?: number | null
          question_context?: any | null
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          hand?: string
          card1?: string
          card2?: string
          position?: string | null
          player_action?: string | null
          correct_action?: string | null
          is_correct?: boolean
          response_time?: number | null
          question_context?: any | null
          created_at?: string
        }
      }
      pomodoro_sessions: {
        Row: {
          id: string
          name: string
          work_duration: number
          short_break_duration: number
          long_break_duration: number
          cycles_before_long_break: number
          current_cycle: number
          current_type: 'work' | 'short_break' | 'long_break'
          time_left: number
          is_running: boolean
          is_paused: boolean
          completed_pomodoros: number
          start_time: string | null
          pause_time: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          work_duration: number
          short_break_duration: number
          long_break_duration: number
          cycles_before_long_break: number
          current_cycle?: number
          current_type?: 'work' | 'short_break' | 'long_break'
          time_left?: number
          is_running?: boolean
          is_paused?: boolean
          completed_pomodoros?: number
          start_time?: string | null
          pause_time?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          work_duration?: number
          short_break_duration?: number
          long_break_duration?: number
          cycles_before_long_break?: number
          current_cycle?: number
          current_type?: 'work' | 'short_break' | 'long_break'
          time_left?: number
          is_running?: boolean
          is_paused?: boolean
          completed_pomodoros?: number
          start_time?: string | null
          pause_time?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      pomodoro_history: {
        Row: {
          id: string
          session_id: string
          type: 'work' | 'short_break' | 'long_break'
          planned_duration: number
          actual_duration: number | null
          completed: boolean
          start_time: string
          end_time: string | null
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          type: 'work' | 'short_break' | 'long_break'
          planned_duration: number
          actual_duration?: number | null
          completed?: boolean
          start_time: string
          end_time?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          type?: 'work' | 'short_break' | 'long_break'
          planned_duration?: number
          actual_duration?: number | null
          completed?: boolean
          start_time?: string
          end_time?: string | null
          created_at?: string
        }
      }
      anki_decks: {
        Row: {
          id: string
          name: string
          parent_id: string | null
          color: string
          icon: string
          description: string | null
          is_expanded: boolean
          new_cards_per_day: number
          review_cards_per_day: number
          learning_steps: number[]
          graduating_interval: number
          easy_interval: number
          starting_ease: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          parent_id?: string | null
          color?: string
          icon?: string
          description?: string | null
          is_expanded?: boolean
          new_cards_per_day?: number
          review_cards_per_day?: number
          learning_steps?: number[]
          graduating_interval?: number
          easy_interval?: number
          starting_ease?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          parent_id?: string | null
          color?: string
          icon?: string
          description?: string | null
          is_expanded?: boolean
          new_cards_per_day?: number
          review_cards_per_day?: number
          learning_steps?: number[]
          graduating_interval?: number
          easy_interval?: number
          starting_ease?: number
          created_at?: string
          updated_at?: string
        }
      }
      anki_cards: {
        Row: {
          id: string
          deck_id: string
          front: string
          back: string
          tags: string[]
          card_state: 'new' | 'learning' | 'review' | 'relearning'
          ease_factor: number
          interval_days: number
          due_date: string
          review_count: number
          lapse_count: number
          created_at: string
          updated_at: string
          last_reviewed: string | null
        }
        Insert: {
          id?: string
          deck_id: string
          front: string
          back: string
          tags?: string[]
          card_state?: 'new' | 'learning' | 'review' | 'relearning'
          ease_factor?: number
          interval_days?: number
          due_date?: string
          review_count?: number
          lapse_count?: number
          created_at?: string
          updated_at?: string
          last_reviewed?: string | null
        }
        Update: {
          id?: string
          deck_id?: string
          front?: string
          back?: string
          tags?: string[]
          card_state?: 'new' | 'learning' | 'review' | 'relearning'
          ease_factor?: number
          interval_days?: number
          due_date?: string
          review_count?: number
          lapse_count?: number
          created_at?: string
          updated_at?: string
          last_reviewed?: string | null
        }
      }
      anki_reviews: {
        Row: {
          id: string
          card_id: string
          quality: number
          response_time_ms: number | null
          ease_before: number
          ease_after: number
          interval_before: number
          interval_after: number
          session_id: string | null
          reviewed_at: string
        }
        Insert: {
          id?: string
          card_id: string
          quality: number
          response_time_ms?: number | null
          ease_before: number
          ease_after: number
          interval_before: number
          interval_after: number
          session_id?: string | null
          reviewed_at?: string
        }
        Update: {
          id?: string
          card_id?: string
          quality?: number
          response_time_ms?: number | null
          ease_before?: number
          ease_after?: number
          interval_before?: number
          interval_after?: number
          session_id?: string | null
          reviewed_at?: string
        }
      }
      anki_study_sessions: {
        Row: {
          id: string
          deck_id: string | null
          start_time: string
          end_time: string | null
          cards_studied: number
          new_cards: number
          review_cards: number
          relearning_cards: number
          avg_response_time_ms: number | null
          total_study_time_ms: number | null
          created_at: string
        }
        Insert: {
          id?: string
          deck_id?: string | null
          start_time?: string
          end_time?: string | null
          cards_studied?: number
          new_cards?: number
          review_cards?: number
          relearning_cards?: number
          avg_response_time_ms?: number | null
          total_study_time_ms?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          deck_id?: string | null
          start_time?: string
          end_time?: string | null
          cards_studied?: number
          new_cards?: number
          review_cards?: number
          relearning_cards?: number
          avg_response_time_ms?: number | null
          total_study_time_ms?: number | null
          created_at?: string
        }
      }
    }
  }
}