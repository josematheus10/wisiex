# Balance Reserve System

Mechanism to prevent double spending and ensure order integrity.

---

## Overview

```
Order Created  →  Balance Reserved
Order Matched  →  Balance Transferred
Order Cancelled →  Balance Released
```

---

## 1. Order Creation — Reserve

| Order Type | Asset Reserved |
|------------|---------------|
| Buy        | USD            |
| Sell       | BTC            |

**Example:**

```
User balance:  10,000 USD available
Creates order: Buy 1 BTC @ 10,000 USD

After creation:
  available_usd:  0 USD
  reserved_usd:   10,000 USD
```

Reserved balance cannot be used in other orders.

---

## 2. Order Match — Transfer

When a match occurs, the reserved balance moves permanently.

**Buy side:**

```
reserved_usd  → deducted
available_btc → credited
```

**Sell side:**

```
reserved_btc  → deducted
available_usd → credited
```

---

## 3. Price Improvement Refund (BUY orders)

When a BUY order executes at a BETTER price than specified, the overpaid USD is refunded.

```
Order:  Buy 1 BTC @ 10,000 USD  (reserved: 10,000 USD)
Match:  0.5 BTC filled at 9,000 USD

Result:
  Refund:     (10,000 - 9,000) × 0.5 = 500 USD → returned to available_usd
  BTC credit: 0.5 BTC - taker_fee
  Still open: 0.5 BTC @ 10,000 (5,000 USD reserved)
```

---

## 4. Partial Execution

```
Order:  Buy 1 BTC @ 10,000 USD
Match:  0.5 BTC filled

Result:
  5,000 USD  → deducted (transferred)
  0.5 BTC    → credited
  5,000 USD  → remains reserved (pending fill)
```

Remaining reserved balance is released only on full fill or cancellation.

---

## 4. Fees (Maker / Taker)

Fees are applied **at match time**, not at order creation.

| Role   | Fee   | Definition                      |
|--------|-------|---------------------------------|
| Taker  | 0.3%  | Executes against the order book |
| Maker  | 0.5%  | Order rests in the book         |

Fee is deducted from the **received asset**.

**Example (Taker buying 1 BTC):**

```
Receives:    1 BTC
Fee (0.3%):  0.003 BTC
Net credit:  0.997 BTC
```

---

## 5. Wallet Model

```
Wallet {
  available_usd: Decimal   // spendable
  reserved_usd:  Decimal   // locked in open orders
  available_btc: Decimal
  reserved_btc:  Decimal
}

total_usd = available_usd + reserved_usd
total_btc = available_btc + reserved_btc
```

Invariant: `total` never changes due to reservation — only due to match or fee.

---

## 6. Order Cancellation — Release

```
Order cancelled:
  reserved_usd → returned to available_usd  (Buy)
  reserved_btc → returned to available_btc  (Sell)
```

---

## Common Mistakes

| Mistake                              | Consequence                         |
|--------------------------------------|-------------------------------------|
| Deduct balance only at order close   | User creates orders without funds   |
| No available/reserved split          | Allows double spending              |
| Apply fees at creation               | Fee charged even if order never fills |
| Release reserve before cancel confirm | Race condition — balance inconsistency |

---

## Flow Summary

```
Create Order
  └─ reserve(asset, amount)

Match (full or partial)
  ├─ deduct(reserved_asset, filled_amount)
  ├─ credit(received_asset, filled_amount - fee)
  └─ if partial: reserved remainder stays locked

Cancel Order
  └─ release(reserved_asset, remaining_amount)
```
