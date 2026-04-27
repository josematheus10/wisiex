Feature: Wallet Balance Management

  @wallet-default-balance
  Scenario: User starts with default balance
    Given a new user "alice" is registered
    Then the user should have 100 BTC available
    And the user should have 100000 USD available
    And the reserved balances should be zero

  @wallet-reserve-buy
  Scenario: Reserve USD on buy order creation
    Given the user has 100000 USD available
    When the user creates a buy order of 1 BTC at 10000 USD
    Then 10000 USD should be reserved
    And 90000 USD should remain available

  @wallet-reserve-sell
  Scenario: Reserve BTC on sell order creation
    Given the user has 10 BTC available
    When the user creates a sell order of 2 BTC
    Then 2 BTC should be reserved
    And 8 BTC should remain available

  @wallet-insufficient-usd
  Scenario: Prevent buy order with insufficient USD
    Given the user has 5000 USD available
    When the user tries to create a buy order of 1 BTC at 10000 USD
    Then the system should reject the order

  @wallet-insufficient-btc
  Scenario: Prevent sell order with insufficient BTC
    Given the user has 0.5 BTC available
    When the user tries to create a sell order of 1 BTC
    Then the system should reject the order

  @wallet-full-buy-exec
  Scenario: Update balances after full buy execution
    Given the user has 10000 USD available
    When the user creates a buy order of 1 BTC at 10000 USD
    And the order is fully matched
    Then 10000 USD should be deducted
    And the user should receive 1 BTC
    And no USD should remain reserved

  @wallet-full-sell-exec
  Scenario: Update balances after full sell execution
    Given the user has 1 BTC available
    When the user creates a sell order of 1 BTC at 10000 USD
    And the order is fully matched
    Then 1 BTC should be deducted
    And the user should receive 10000 USD
    And no BTC should remain reserved

  @wallet-partial-exec
  Scenario: Partial execution updates balances correctly
    Given the user has 10000 USD available
    When the user creates a buy order of 1 BTC at 10000 USD
    And 0.4 BTC is executed
    Then 4000 USD should be deducted
    And 6000 USD should remain reserved
    And the user should receive 0.4 BTC

  @wallet-cancel-buy-reserved
  Scenario: Cancel buy order releases reserved USD
    Given the user has a buy order with 10000 USD reserved
    When the user cancels the order
    Then the 10000 USD should return to available balance
    And reserved USD should be zero

  @wallet-cancel-partial
  Scenario: Cancel partially filled order releases remaining balance
    Given the user created a buy order of 1 BTC at 10000 USD
    And 0.5 BTC was executed
    And 5000 USD is still reserved
    When the user cancels the order
    Then 5000 USD should return to available balance
    And the user should keep 0.5 BTC

  @wallet-taker-fee
  Scenario: Apply taker fee on execution
    Given the user executes a trade as taker
    When the trade is completed
    Then a 0.3 percent fee should be deducted from received assets

  @wallet-maker-fee
  Scenario: Apply maker fee on execution
    Given the user has an order in the book
    When the order is matched
    Then a 0.5 percent fee should be deducted

  @wallet-balance-persist
  Scenario: Balance persists after page refresh
    Given the user has 5 BTC and 50000 USD
    When the user refreshes the page
    Then the system should reload the wallet from backend
    And the balances should remain unchanged

  @wallet-double-spend
  Scenario: Prevent double spending
    Given the user has 10000 USD available
    When the user creates two buy orders of 1 BTC at 10000 USD simultaneously
    Then only one order should be accepted
    And the other should be rejected

  @wallet-concurrent-exec
  Scenario: Balance remains consistent under concurrent execution
    Given multiple orders are being processed
    When the matching engine executes trades
    Then the final balances must be consistent
    And no negative balance should occur

  @wallet-non-negative
  Scenario: Reserved and available balances should never be negative
    Given the system is processing orders
    Then no wallet balance should be negative

  @wallet-total
  Scenario: Total balance consistency
    Given the user has available and reserved balances
    Then total balance should always equal available plus reserved
