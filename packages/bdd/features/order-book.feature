Feature: Order Book

  Scenario: View order book
    Given there are active orders in the system
    When the user accesses the order book
    Then bids and asks should be displayed
    And orders with same price should be aggregated

  Scenario: Click bid fills sell form
    Given the user clicks a bid entry
    When the bid is selected
    Then the sell form should be filled with price and volume

  Scenario: Click ask fills buy form
    Given the user clicks an ask entry
    When the ask is selected
    Then the buy form should be filled with price and volume