'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { HandAction, Action, MixedColor } from '@/types/range-editor'

interface DebugPanelProps {
  handActions: HandAction[]
  actions: Action[]
  mixedColors: MixedColor[]
  selectedRange?: any
}

export function DebugPanel({ handActions, actions, mixedColors, selectedRange }: DebugPanelProps) {
  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-sm">🐛 Debug Info</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-xs">
        {/* Range Info */}
        <div>
          <strong>Selected Range:</strong>
          <pre className="bg-muted p-2 rounded mt-1 text-xs overflow-auto">
            {JSON.stringify({
              name: selectedRange?.name,
              type: selectedRange?.type,
              hasData: !!selectedRange?.data,
              hasEditorData: !!selectedRange?.data?.editorData,
              dataKeys: selectedRange?.data ? Object.keys(selectedRange.data) : [],
              editorDataKeys: selectedRange?.data?.editorData ? Object.keys(selectedRange.data.editorData) : []
            }, null, 2)}
          </pre>
        </div>

        {/* Actions */}
        <div>
          <strong>Actions ({actions.length}):</strong>
          <div className="space-y-1 mt-1">
            {actions.map((action, i) => (
              <div key={i} className="flex items-center gap-2 p-1 bg-muted rounded">
                <div 
                  className="w-3 h-3 rounded" 
                  style={{ backgroundColor: action.color }}
                />
                <span>{action.id}</span>
                <Badge variant="secondary">{action.name || 'No name'}</Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Mixed Colors */}
        <div>
          <strong>Mixed Colors ({mixedColors.length}):</strong>
          {mixedColors.length === 0 ? (
            <div className="text-muted-foreground mt-1">No mixed colors</div>
          ) : (
            <div className="space-y-1 mt-1">
              {mixedColors.map((mc, i) => (
                <div key={i} className="p-1 bg-muted rounded">
                  <div>ID: {mc.id}</div>
                  <div>Actions: {mc.actions.map(a => `${a.actionId}(${a.percentage}%)`).join(', ')}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Hand Actions Sample */}
        <div>
          <strong>Hand Actions (first 10 of {handActions.length}):</strong>
          <div className="space-y-1 mt-1">
            {handActions.slice(0, 10).map((ha, i) => (
              <div key={i} className="p-1 bg-muted rounded text-xs">
                <span className="font-mono">{ha.handId}</span>
                {ha.actionId && <Badge variant="outline">action: {ha.actionId}</Badge>}
                {ha.mixedColorId && <Badge variant="outline">mixed: {ha.mixedColorId}</Badge>}
              </div>
            ))}
            {handActions.length > 10 && (
              <div className="text-muted-foreground">... and {handActions.length - 10} more</div>
            )}
          </div>
        </div>

        {/* Raw editorData */}
        <div>
          <strong>Raw editorData:</strong>
          <pre className="bg-muted p-2 rounded mt-1 text-xs overflow-auto max-h-32">
            {JSON.stringify(selectedRange?.data?.editorData, null, 2)}
          </pre>
        </div>
      </CardContent>
    </Card>
  )
}