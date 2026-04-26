Feature: Active Orders

  Scenario: View active orders
    Given the user has active orders
    When the user accesses "My active orders"
    Then all active orders should be listed

  Scenario: Cancel order
    Given the user has an active order
    When the user cancels the order
    Then the order should be removed from active orders