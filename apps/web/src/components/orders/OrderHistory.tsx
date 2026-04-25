import type { Order } from '@wisiex/shared'

interface Props {
  orders: Order[]
}

export function OrderHistory({ orders }: Props) {
  return (
    <div className="card bg-dark border-secondary">
      <div className="card-header border-secondary py-2">
        <span className="fw-semibold small">My Order History</span>
      </div>
      <div className="card-body p-0" style={{ maxHeight: 240, overflowY: 'auto' }}>
        <table className="table table-dark table-sm mb-0 small">
          <thead>
            <tr className="text-muted">
              <th>Side</th>
              <th className="text-end">Price</th>
              <th className="text-end">Filled</th>
              <th className="text-end">Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td className={order.side === 'BUY' ? 'text-success' : 'text-danger'}>
                  {order.side}
                </td>
                <td className="text-end">{Number(order.price).toLocaleString()}</td>
                <td className="text-end">{Number(order.filled).toFixed(6)}</td>
                <td className="text-end">
                  <span
                    className={`badge ${
                      order.status === 'COMPLETED' ? 'bg-success' : 'bg-secondary'
                    }`}
                  >
                    {order.status}
                  </span>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={4} className="text-muted text-center py-3">
                  No history yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
