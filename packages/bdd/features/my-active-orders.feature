Feature: Active Orders

  Scenario: View active orders
    Given the user has active orders
    When the user accesses "My active orders"
    Then all active orders should be listed

  Scenario: Cancel order
    Given the user has an active order
    When the user cancels the order
    Then the order should be removed from active orders

  Scenario: Cancel pending buy order returns reserved USD balance
    Given the user has 10000 USD available
    And the user has an open buy order of 1 BTC at 10000 USD
    When the user cancels the pending order
    Then the order should be cancelled
    And the user should have 10000 USD available

  Scenario: Cancel pending sell order returns reserved BTC balance
    Given the user has 2 BTC available
    And the user has an open sell order of 2 BTC at 10000 USD
    When the user cancels the pending order
    Then the order should be cancelled
    And the user should have 2 BTC available