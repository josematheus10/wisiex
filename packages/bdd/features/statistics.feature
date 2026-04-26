Feature: Market Statistics

  Scenario: View market statistics
    Given there are trades in the last 24 hours
    When the user accesses the statistics section
    Then the last price should be displayed
    And the BTC volume should be displayed
    And the USD volume should be displayed
    And the high price should be displayed
    And the low price should be displayed

  Scenario: View user balances
    Given the user is logged in
    When the user views statistics
    Then the USD balance should be displayed
    And the BTC balance should be displayed