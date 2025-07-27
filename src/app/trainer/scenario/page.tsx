import { Suspense } from 'react'
import { ScenarioBuilderV3 } from '@/components/scenario/ScenarioBuilderV3'

/**
 * Page Scenario Trainer - v3 Implementation
 * Based on trainer-scenario-v3.md specifications
 */
export default function ScenarioPage() {
  return (
    <div className="h-screen">
      <Suspense fallback={<div className="h-screen flex items-center justify-center">Chargement...</div>}>
        <ScenarioBuilderV3 />
      </Suspense>
    </div>
  )
}

export const metadata = {
  title: 'Scenario Builder v3 - Range Trainer',
  description: 'Create and train poker scenarios with sequential logic and dynamic node creation',
}