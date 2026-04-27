import type { Order } from '@wisiex/shared'
import { apiCancelOrder } from '../../services/api.js'

interface Props {
  orders: Order[]
  token: string
  onCancelled: (order: Order) => void
}

export function ActiveOrders({ orders, token, onCancelled }: Props) {
  async function cancel(order: Order) {
    try {
      const { order: updated } = await apiCancelOrder(order.id, token)
      onCancelled(updated)
    } catch (err) {
      if (err instanceof Error && err.message === 'Order cannot be cancelled') {
        onCancelled({ ...order, status: 'COMPLETED' })
        return
      }
      alert(err instanceof Error ? err.message : 'Cancel failed')
    }
  }

  return (
    <div className="card bg-dark border-secondary">
      <div className="card-header border-secondary py-2">
        <span className="text-white fw-semibold small">My Active Orders</span>
      </div>
      <div className="card-body p-0" style={{ maxHeight: 240, overflowY: 'auto' }}>
        <table className="table table-dark table-sm mb-0 small">
          <thead>
            <tr className="text-muted">
              <th>Side</th>
              <th className="text-end">Price</th>
              <th className="text-end">Remaining</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td className={order.side === 'BUY' ? 'text-success' : 'text-danger'}>
                  {order.side}
                </td>
                <td className="text-end">{Number(order.price).toLocaleString()}</td>
                <td className="text-end">{Number(order.remaining).toFixed(6)}</td>
                <td className="text-end">
                  <button
                    className="btn btn-link btn-sm text-danger p-0"
                    onClick={() => cancel(order)}
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={4} className="text-muted text-center py-3">
                  No active orders
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
