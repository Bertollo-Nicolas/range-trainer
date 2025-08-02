'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { useRangeCalculation } from '@/hooks/useRangeCalculation'
import { HandAction, EditorAction, MixedColor } from '@/types/editor'
import { cn } from '@/lib/utils'

interface RangeStatsPanelProps {
  handActions: HandAction[]
  actions: EditorAction[]
  mixedColors: MixedColor[]
  className?: string
  showDetailed?: boolean
}

export function RangeStatsPanel({
  handActions,
  actions,
  mixedColors,
  className,
  showDetailed = true
}: RangeStatsPanelProps) {
  const {
    overallStats,
    detailedStats,
    actionStats,
    selectedHands,
    isEmpty,
    isFull
  } = useRangeCalculation({ handActions, actions, mixedColors })

  return (
    <div className={cn("space-y-4", className)}>
      {/* Overall Stats */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Range Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Coverage</span>
            <span className="font-medium">{overallStats.percentage.toFixed(1)}%</span>
          </div>
          
          <Progress 
            value={overallStats.percentage} 
            className="h-2"
          />
          
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-muted-foreground">Hands</div>
              <div className="font-medium">{overallStats.totalHands}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Combos</div>
              <div className="font-medium">{overallStats.totalCombinations}</div>
            </div>
          </div>

          {(isEmpty || isFull) && (
            <Badge 
              variant={isEmpty ? "destructive" : "default"}
              className="w-full justify-center"
            >
              {isEmpty ? "Empty Range" : "Full Range"}
            </Badge>
          )}
        </CardContent>
      </Card>

      {/* Hand Type Breakdown */}
      {showDetailed && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Hand Types</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Pairs */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Pairs</span>
                <span className="text-sm font-medium">
                  {detailedStats.pairStats.count} ({detailedStats.pairStats.percentage.toFixed(1)}%)
                </span>
              </div>
              <Progress 
                value={detailedStats.pairStats.percentage} 
                className="h-1.5"
              />
            </div>

            {/* Suited */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Suited</span>
                <span className="text-sm font-medium">
                  {detailedStats.suitedStats.count} ({detailedStats.suitedStats.percentage.toFixed(1)}%)
                </span>
              </div>
              <Progress 
                value={detailedStats.suitedStats.percentage} 
                className="h-1.5"
              />
            </div>

            {/* Offsuit */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Offsuit</span>
                <span className="text-sm font-medium">
                  {detailedStats.offsuitStats.count} ({detailedStats.offsuitStats.percentage.toFixed(1)}%)
                </span>
              </div>
              <Progress 
                value={detailedStats.offsuitStats.percentage} 
                className="h-1.5"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Breakdown */}
      {actionStats.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {actionStats
              .filter(stat => stat.totalHands > 0)
              .sort((a, b) => b.totalHands - a.totalHands)
              .map((stat) => (
                <div key={stat.action.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-sm border"
                        style={{ backgroundColor: stat.action.color }}
                      />
                      <span className="text-sm font-medium">
                        {stat.action.name || stat.action.type}
                      </span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {stat.totalHands} hands ({stat.percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <Progress 
                    value={stat.percentage} 
                    className="h-1.5"
                    style={{ 
                      '--progress-background': stat.action.color 
                    } as React.CSSProperties}
                  />
                </div>
              ))}
          </CardContent>
        </Card>
      )}

      {/* Hand List */}
      {showDetailed && selectedHands.length > 0 && selectedHands.length <= 20 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Selected Hands</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1">
              {selectedHands
                .sort()
                .map((hand) => (
                  <Badge 
                    key={hand} 
                    variant="secondary" 
                    className="text-xs"
                  >
                    {hand}
                  </Badge>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Range Text Export */}
      {selectedHands.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Export</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">Range String</div>
              <div className="p-2 bg-muted rounded text-xs font-mono break-all">
                {selectedHands.join(', ')}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Compact version for sidebar
export function CompactRangeStats({
  handActions,
  actions,
  mixedColors,
  className
}: Omit<RangeStatsPanelProps, 'showDetailed'>) {
  const { overallStats, isEmpty, isFull } = useRangeCalculation({ 
    handActions, 
    actions, 
    mixedColors 
  })

  return (
    <div className={cn("p-3 border rounded-lg bg-card", className)}>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Range</span>
          <Badge variant={isEmpty ? "destructive" : isFull ? "default" : "secondary"}>
            {overallStats.percentage.toFixed(1)}%
          </Badge>
        </div>
        <Progress value={overallStats.percentage} className="h-1.5" />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{overallStats.totalHands} hands</span>
          <span>{overallStats.totalCombinations} combos</span>
        </div>
      </div>
    </div>
  )
}

// Range comparison component
export function RangeComparison({
  range1,
  range2,
  labels = ['Range 1', 'Range 2'],
  className
}: {
  range1: { handActions: HandAction[], actions: EditorAction[], mixedColors: MixedColor[] }
  range2: { handActions: HandAction[], actions: EditorAction[], mixedColors: MixedColor[] }
  labels?: [string, string]
  className?: string
}) {
  const calc1 = useRangeCalculation(range1)
  const calc2 = useRangeCalculation(range2)
  
  const comparison = calc1.compareRanges(range2.handActions)

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Range Comparison</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Individual ranges */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm font-medium mb-2">{labels[0]}</div>
            <div className="text-xs text-muted-foreground mb-1">
              {calc1.overallStats.totalHands} hands ({calc1.overallStats.percentage.toFixed(1)}%)
            </div>
            <Progress value={calc1.overallStats.percentage} className="h-2" />
          </div>
          <div>
            <div className="text-sm font-medium mb-2">{labels[1]}</div>
            <div className="text-xs text-muted-foreground mb-1">
              {calc2.overallStats.totalHands} hands ({calc2.overallStats.percentage.toFixed(1)}%)
            </div>
            <Progress value={calc2.overallStats.percentage} className="h-2" />
          </div>
        </div>

        {/* Overlap analysis */}
        <div className="space-y-2">
          <div className="text-sm font-medium">Overlap Analysis</div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Overlap</span>
              <span>{comparison.overlap.length} hands ({comparison.overlapPercentage.toFixed(1)}%)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Only {labels[0]}</span>
              <span>{comparison.onlyInFirst.length} hands</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Only {labels[1]}</span>
              <span>{comparison.onlyInSecond.length} hands</span>
            </div>
          </div>
          <Progress value={comparison.overlapPercentage} className="h-1.5" />
        </div>
      </CardContent>
    </Card>
  )
}