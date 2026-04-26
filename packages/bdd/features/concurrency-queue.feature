Feature: Order Processing Queue

  Scenario: Process orders sequentially
    Given multiple orders are submitted
    When the matching engine processes orders
    Then only one order should be processed at a time

  Scenario: Prevent race conditions
    Given concurrent order submissions
    When orders are processed
    Then no order should be executed twice