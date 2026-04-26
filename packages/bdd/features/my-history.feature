Feature: Order History

  Scenario: View order history
    Given the user has completed trades
    When the user accesses "My history"
    Then the system should display past trades
    And each trade should include price, volume and type