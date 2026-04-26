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