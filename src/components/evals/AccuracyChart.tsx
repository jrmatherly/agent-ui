'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface AccuracyDataPoint {
  date: string
  accuracy: number
}

interface AccuracyChartProps {
  data: AccuracyDataPoint[]
  currentAccuracy?: number
}

export function AccuracyChart({ data, currentAccuracy }: AccuracyChartProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Accuracy Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground flex h-32 items-center justify-center text-sm">
            No data available
          </div>
        </CardContent>
      </Card>
    )
  }

  // Simple bar chart without external dependency
  const maxAccuracy = Math.max(...data.map((d) => d.accuracy))

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">Accuracy Trend</CardTitle>
        {currentAccuracy !== undefined && (
          <span className="text-2xl font-bold text-green-600">
            {Math.round(currentAccuracy * 100)}%
          </span>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex h-32 items-end gap-1">
          {data.map((point) => (
            <div
              key={point.date}
              className="bg-brand/80 hover:bg-brand flex-1 rounded-t transition-colors"
              style={{
                height: `${(point.accuracy / maxAccuracy) * 100}%`
              }}
              title={`${point.date}: ${Math.round(point.accuracy * 100)}%`}
            />
          ))}
        </div>
        <div className="text-muted-foreground mt-2 flex justify-between text-xs">
          <span>{data[0]?.date}</span>
          <span>{data[data.length - 1]?.date}</span>
        </div>
      </CardContent>
    </Card>
  )
}
