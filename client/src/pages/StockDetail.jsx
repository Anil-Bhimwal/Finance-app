import { useParams } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'

const StockDetail = () => {
  const { symbol } = useParams()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{symbol}</h1>
        <p className="text-muted-foreground">
          Detailed view and charts for {symbol}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Stock Details</CardTitle>
          <CardDescription>
            Price history, charts, and detailed information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            Stock detail view coming soon...
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default StockDetail
