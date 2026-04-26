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