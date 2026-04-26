Feature: Trading Fees

  Scenario: Apply maker fee
    Given an order exists in the order book
    When it is matched by another order
    Then a 0.5 percent maker fee should be applied

  Scenario: Apply taker fee
    Given a new order matches an existing order
    When the trade is executed
    Then a 0.3 percent taker fee should be applied