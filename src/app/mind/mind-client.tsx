'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Brain, 
  CheckSquare, 
  Target, 
  Calendar, 
  BookOpen, 
  TrendingDown, 
  Star,
  BarChart3
} from 'lucide-react'

// Import des composants (à créer)
import { DashboardPokerMind } from '@/components/mind/dashboard-poker-mind'
import { TaskManager } from '@/components/mind/task-manager'
import { HabitTracker } from '@/components/mind/habit-tracker'
import { SmartGoals } from '@/components/mind/smart-goals'
import { MentalJournal } from '@/components/mind/mental-journal'
import { MentalLeakTracker } from '@/components/mind/mental-leak-tracker'
import { SessionReview } from '@/components/mind/session-review'

export function MindClient() {
  const [activeTab, setActiveTab] = useState('dashboard')

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Brain className="h-8 w-8 text-purple-600" />
        <div>
          <h1 className="text-3xl font-bold">PokerMind+</h1>
          <p className="text-muted-foreground">
            Votre dashboard mental pour exceller au poker
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-7 lg:w-auto lg:grid-cols-7">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="tasks" className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Tâches</span>
          </TabsTrigger>
          <TabsTrigger value="habits" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Habitudes</span>
          </TabsTrigger>
          <TabsTrigger value="goals" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            <span className="hidden sm:inline">Objectifs</span>
          </TabsTrigger>
          <TabsTrigger value="journal" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Journal</span>
          </TabsTrigger>
          <TabsTrigger value="leaks" className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4" />
            <span className="hidden sm:inline">Leaks</span>
          </TabsTrigger>
          <TabsTrigger value="reviews" className="flex items-center gap-2">
            <Star className="h-4 w-4" />
            <span className="hidden sm:inline">Reviews</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <DashboardPokerMind />
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          <TaskManager />
        </TabsContent>

        <TabsContent value="habits" className="space-y-4">
          <HabitTracker />
        </TabsContent>

        <TabsContent value="goals" className="space-y-4">
          <SmartGoals />
        </TabsContent>

        <TabsContent value="journal" className="space-y-4">
          <MentalJournal />
        </TabsContent>

        <TabsContent value="leaks" className="space-y-4">
          <MentalLeakTracker />
        </TabsContent>

        <TabsContent value="reviews" className="space-y-4">
          <SessionReview />
        </TabsContent>
      </Tabs>
    </div>
  )
}