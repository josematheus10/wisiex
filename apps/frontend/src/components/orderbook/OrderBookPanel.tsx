import type { OrderBook, OrderBookEntry } from '@wisiex/shared'

interface Props {
  orderBook: OrderBook
  onEntryClick: (price: string, side: 'BUY' | 'SELL', amount: string) => void
}

export function OrderBookPanel({ orderBook, onEntryClick }: Props) {
  return (
    <div className="card bg-dark border-secondary h-100">
      <div className="card-header border-secondary py-2">
        <span className="text-white fw-semibold small">Order Book</span>
      </div>
      <div className="card-body p-0">
        <table className="table table-dark table-sm mb-0 small">
          <thead>
            <tr className="text-muted">
              <th>Price (USD)</th>
              <th className="text-end">Amount (BTC)</th>
              <th className="text-end">Total</th>
            </tr>
          </thead>
          <tbody>
            {orderBook.asks.slice().reverse().map((entry) => (
              <BookRow key={entry.price} entry={entry} side="SELL" onClick={onEntryClick} />
            ))}
            <tr>
              <td colSpan={3} className="text-center py-1 border-top border-bottom border-secondary">
                <span className="text-muted" style={{ fontSize: '0.65rem' }}>
                  SPREAD
                </span>
              </td>
            </tr>
            {orderBook.bids.map((entry) => (
              <BookRow key={entry.price} entry={entry} side="BUY" onClick={onEntryClick} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function BookRow({
  entry,
  side,
  onClick,
}: {
  entry: OrderBookEntry
  side: 'BUY' | 'SELL'
  onClick: (price: string, side: 'BUY' | 'SELL', amount: string) => void
}) {
  return (
    <tr
      className={`cursor-pointer ${side === 'BUY' ? 'text-success' : 'text-danger'}`}
      style={{ cursor: 'pointer' }}
      onClick={() => onClick(entry.price, side === 'BUY' ? 'SELL' : 'BUY', entry.amount)}
    >
      <td>{Number(entry.price).toLocaleString()}</td>
      <td className="text-end">{Number(entry.amount).toFixed(6)}</td>
      <td className="text-end text-muted">{Number(entry.total).toLocaleString()}</td>
    </tr>
  )
}
