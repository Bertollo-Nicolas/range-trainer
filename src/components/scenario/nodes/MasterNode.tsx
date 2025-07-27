'use client'

import { Handle, Position, NodeProps } from 'reactflow'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Target } from 'lucide-react'

interface MasterNodeData {
  onAddScenario?: () => void
  isActive?: boolean
}

/**
 * Master Node - v3 Implementation
 * Contains "Add Scenario" button that creates the 6 position nodes
 * According to trainer-scenario-v3.md specifications
 */
function MasterNode({ data, selected }: NodeProps<MasterNodeData>) {
  const handleAddScenario = () => {
    data.onAddScenario?.()
  }

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
              Node 1
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600 text-center">
            Créer un nouveau scénario poker avec 6 positions
          </p>
          
          <Button
            onClick={handleAddScenario}
            className="w-full flex items-center gap-2 h-10"
            size="default"
          >
            <Plus className="h-4 w-4" />
            Add Scenario
          </Button>
          
          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-500 text-center">
              v3 Spec - trainer-scenario-v3.md
            </p>
          </div>
        </CardContent>
      </Card>
    </>
  )
}

export default MasterNode