import type { MarketStats } from '@wisiex/shared'

interface Props {
  stats: MarketStats
  balance: { btc: string; usd: string }
}

export function StatsBar({ stats, balance }: Props) {
  const change = stats.priceChange24h ? Number(stats.priceChange24h) : null
  const changeClass = change === null ? '' : change >= 0 ? 'text-success' : 'text-danger'
  const changeSign = change !== null && change >= 0 ? '+' : ''

  return (
    <div className="d-flex flex-wrap gap-4 px-3 py-2 bg-black border-bottom border-secondary small">
      <Stat label="Last Price" value={stats.lastPrice ? `$${Number(stats.lastPrice).toLocaleString()}` : '—'} />
      <Stat
        label="24h Change"
        value={change !== null ? `${changeSign}${change.toFixed(2)}` : '—'}
        valueClass={changeClass}
      />
      <Stat label="24h High" value={stats.high24h ? `$${Number(stats.high24h).toLocaleString()}` : '—'} />
      <Stat label="24h Low" value={stats.low24h ? `$${Number(stats.low24h).toLocaleString()}` : '—'} />
      <Stat label="24h Vol (BTC)" value={Number(stats.volume24hBtc).toFixed(4)} />
      <Stat label="24h Vol (USD)" value={`$${Number(stats.volume24hUsd).toLocaleString()}`} />
      <div className="ms-auto d-flex gap-4">
        <Stat label="BTC Balance" value={`${Number(balance.btc).toFixed(8)} BTC`} valueClass="text-warning" />
        <Stat label="USD Balance" value={`$${Number(balance.usd).toLocaleString()}`} valueClass="text-warning" />
      </div>
    </div>
  )
}

function Stat({ label, value, valueClass = '' }: { label: string; value: string; valueClass?: string }) {
  return (
    <div>
      <div className="text-muted" style={{ fontSize: '0.7rem' }}>
        {label}
      </div>
      <div className={`fw-semibold ${valueClass}`}>{value}</div>
    </div>
  )
}
