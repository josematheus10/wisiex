import type { Trade } from '@wisiex/shared'

interface Props {
  trades: Trade[]
}

export function GlobalMatches({ trades }: Props) {
  return (
    <div className="card bg-dark border-secondary">
      <div className="card-header border-secondary py-2">
        <span className="fw-semibold small">Global Matches</span>
      </div>
      <div className="card-body p-0" style={{ maxHeight: 220, overflowY: 'auto' }}>
        <table className="table table-dark table-sm mb-0 small">
          <thead>
            <tr className="text-muted">
              <th>Price (USD)</th>
              <th className="text-end">Amount (BTC)</th>
              <th className="text-end">Time</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((trade) => (
              <tr key={trade.id}>
                <td className="text-warning">{Number(trade.price).toLocaleString()}</td>
                <td className="text-end">{Number(trade.amount).toFixed(6)}</td>
                <td className="text-end text-muted">
                  {new Date(trade.createdAt).toLocaleTimeString()}
                </td>
              </tr>
            ))}
            {trades.length === 0 && (
              <tr>
                <td colSpan={3} className="text-muted text-center py-3">
                  No trades yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
