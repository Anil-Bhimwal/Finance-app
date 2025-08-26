import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'

const Watchlist = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Watchlist</h1>
        <p className="text-muted-foreground">
          Your personal collection of tracked stocks and mutual funds
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Watchlist</CardTitle>
          <CardDescription>
            Add stocks and mutual funds to track their performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            Your watchlist is empty. Add some stocks to get started!
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default Watchlist
