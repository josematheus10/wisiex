Feature: Trading Fees

  Scenario: Apply maker fee
    Given an order exists in the order book
    When it is matched by another order
    Then a 0.5 percent maker fee should be applied

  Scenario: Apply taker fee
    Given a new order matches an existing order
    When the trade is executed
    Then a 0.3 percent taker fee should be applied

  Scenario: Fees are correctly accumulated in the fee wallet after a trade
    Given the exchange fee wallet balance is 0 USD and 0 BTC
    And a trade of 1 BTC at 10000 USD is executed
    And the taker fee is 0.3 percent
    And the maker fee is 0.5 percent
    When the trade is completed
    Then 0.003 BTC should be collected as taker fee
    And 0.005 BTC should be collected as maker fee
    And the total 0.008 BTC should be added to the exchange fee wallet
