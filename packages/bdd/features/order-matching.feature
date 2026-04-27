Feature: Order Matching

  Scenario: Match buy order with better price
    Given there is a sell order of 0.5 BTC at 9000 USD
    When a buy order of 1 BTC at 10000 USD is created
    Then 0.5 BTC should be matched at 9000 USD
    And the remaining 0.5 BTC should stay open

  Scenario: Fully matched order
    Given there are matching orders in the book
    When a new order is fully matched
    Then the order should be marked as complete

  Scenario: Partially matched order
    Given there are partial matching orders
    When a new order is executed
    Then part of the order should be matched
    And the remainder should be stored in the order book

  Scenario: No matching orders
    Given there are no matching orders
    When a new order is created
    Then the order should be added to the order book

  Scenario: Prevent double spending using fractional BTC orders
    Given a user "alice" is authenticated
    And "alice" has 0.005 BTC available
    When "alice" creates a sell order of 0.003 BTC
    And "alice" creates another sell order of 0.003 BTC
    Then the system should accept only one order
    And the other order should be rejected due to insufficient balance
    And the total reserved BTC should not exceed 0.005 BTC
    And the available BTC balance should never be negative

  Scenario: Prevent multiple fractional purchases exceeding a sell order volume
    Given a user "alice" is authenticated
    And a user "maurico" is authenticated
    And "alice" has 0.005 BTC available
    And "alice" creates a sell order of 0.005 BTC at 10000 USD
    And the order is available in the order book
    When "maurico" creates a buy order of 0.003 BTC at 10000 USD
    And the system executes the trade
    And "maurico" creates another buy order of 0.003 BTC at 10000 USD
    Then the system should only execute up to the remaining 0.002 BTC
    And the total executed volume should not exceed 0.005 BTC
    And the sell order should be marked as "FILLED" after reaching its limit
    And any excess amount should be rejected or partially filled
    And the system should maintain consistent balances for both users
