Feature: Global Matches

  Scenario: Display recent matches
    Given there are executed trades
    When the user opens the global matches section
    Then the system should display a list of matches
    And the most recent match should be first
    And each match should include price and volume