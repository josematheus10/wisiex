Feature: Create Orders

  Scenario: Create buy order
    Given the user has sufficient USD balance
    When the user submits a buy order with amount 1 BTC and price 10000 USD
    Then the order should be created

  Scenario: Create sell order
    Given the user has sufficient BTC balance
    When the user submits a sell order with amount 1 BTC and price 10000 USD
    Then the order should be created

  Scenario: Auto calculate total
    Given the user enters amount 2 BTC and price 10000 USD
    When the form is updated
    Then the total should be 20000 USD

  Scenario: Buy order reserves USD balance
    Given the user has 10000 USD available
    When the user submits a buy order with amount 1 BTC and price 10000 USD
    Then the user should have 0 USD available
    And the user should have 10000 USD reserved

  Scenario: Sell order reserves BTC balance
    Given the user has 2 BTC available
    When the user submits a sell order with amount 2 BTC and price 10000 USD
    Then the user should have 0 BTC available
    And the user should have 2 BTC reserved

  Scenario: Reject buy order with insufficient USD
    Given the user has 5000 USD available
    When the user submits a buy order with amount 1 BTC and price 10000 USD
    Then the order should be rejected with insufficient balance

  Scenario: Reject sell order with insufficient BTC
    Given the user has 0.5 BTC available
    When the user submits a sell order with amount 1 BTC and price 10000 USD
    Then the order should be rejected with insufficient balance

  Scenario: Prevent double spending on buy orders
    Given the user has 10000 USD available
    And the user has an open buy order of 1 BTC at 10000 USD
    When the user submits another buy order with amount 1 BTC and price 10000 USD
    Then the second order should be rejected with insufficient balance

  Scenario: Prevent double spending on sell orders
    Given the user has 1 BTC available
    And the user has an open sell order of 1 BTC at 10000 USD
    When the user submits another sell order with amount 1 BTC at price 10000 USD
    Then the second order should be rejected with insufficient balance

  Scenario: Total balance invariant after reservation
    Given the user has 10000 USD available and 0 USD reserved
    When the user submits a buy order with amount 1 BTC and price 10000 USD
    Then the total USD balance should still be 10000 USD