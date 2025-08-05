'use client'

import { Handle, Position, NodeProps } from 'reactflow'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Target } from 'lucide-react'

interface MasterNodeData {
  onAddScenario?: () => void
  onAddNewScenario?: () => void
  isActive?: boolean
  scenarioCount?: number
}

/**
 * Master Node - v3 Implementation
 * Contains buttons to create scenarios one by one
 */
function MasterNode({ data, selected }: NodeProps<MasterNodeData>) {
  const handleAddScenario = () => {
    data.onAddScenario?.()
  }

  const handleAddNewScenario = () => {
    data.onAddNewScenario?.()
  }

  const hasExistingScenarios = (data.scenarioCount || 0) > 0

  return (
    <>
      <Handle type="source" position={Position.Right} id="master-out" />
      
      <Card className={`
        w-64 min-h-[180px] transition-all duration-200
        ${selected ? 'ring-2 ring-blue-500 shadow-lg' : 'shadow-md'}
        ${data.isActive ? 'bg-blue-50 border-blue-300' : 'bg-white'}
      `}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg font-semibold text-gray-800">
              Master Node
            </CardTitle>
            <Badge variant="outline" className="ml-auto text-xs">
              {hasExistingScenarios ? `${data.scenarioCount} scénarios` : 'Nouveau'}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600 text-center">
            {hasExistingScenarios 
              ? `${data.scenarioCount} scénario(s) créé(s)`
              : 'Créer un nouveau scénario poker'
            }
          </p>
          
          {!hasExistingScenarios ? (
            <Button
              onClick={handleAddScenario}
              className="w-full flex items-center gap-2 h-10"
              size="default"
            >
              <Plus className="h-4 w-4" />
              Premier Scénario
            </Button>
          ) : (
            <Button
              onClick={handleAddNewScenario}
              className="w-full flex items-center gap-2 h-10"
              variant="outline"
            >
              <Plus className="h-4 w-4" />
              Ajouter Scénario
            </Button>
          )}
          
          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-500 text-center">
              Cliquez pour ajouter un scénario
            </p>
          </div>
        </CardContent>
      </Card>
    </>
  )
}

export default MasterNode