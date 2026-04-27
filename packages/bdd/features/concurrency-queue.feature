Feature: Order Processing Queue

  Scenario: Process orders sequentially
    Given multiple orders are submitted
    When the matching engine processes orders
    Then only one order should be processed at a time

  Scenario: Prevent race conditions
    Given concurrent order submissions
    When orders are processed
    Then no order should be executed twice

  @frontend
  Scenario: Display BTC balance with fixed decimal format
    Given the user is authenticated
    And the user has 1 BTC in balance
    When the balance is displayed on screen
    Then it should be shown as "1.000000000"
    And it should not display negative values

  @frontend
  Scenario: Prevent displaying negative BTC balance
    Given the user has an invalid negative BTC balance "-0.5"
    When the system renders the balance
    Then the system should correct it to "0.000000000" or block the display
    And an error should be logged

  @frontend
  Scenario: Display USD balance as positive value
    Given the user has 1000 USD
    When the balance is displayed
    Then it should be shown as "1000.00"
    And it should never display a negative value

  @backend
  Scenario: Reject negative BTC balance update
    Given a wallet with 1 BTC
    When the system attempts to update the balance to "-0.5 BTC"
    Then the system should reject the operation
    And return an error "Invalid balance value"

  @backend
  Scenario: Reject negative USD balance update
    Given a wallet with 1000 USD
    When the system attempts to update the balance to "-100 USD"
    Then the system should reject the operation

  @backend
  Scenario: Prevent negative balance after trade execution
    Given a user has 1 BTC
    When the system processes trades
    Then the resulting BTC balance must not be negative

  @backend
  Scenario: Ensure total balance is never negative
    Given the system is processing multiple operations
    Then no user should have negative BTC balance
    And no user should have negative USD balance

  @backend
  Scenario: Prevent negative reserved balance
    Given a user has reserved balances
    When the system updates reservations
    Then reserved BTC and USD must never be negative

  @backend
  Scenario: Maintain consistency between available and reserved balances
    Given a user has available and reserved balances
    Then available balance must be greater than or equal to zero
    And reserved balance must be greater than or equal to zero
    And total balance must remain consistent

  @backend
  Scenario: Prevent negative balance through concurrent operations
    Given multiple operations are executed concurrently
    When balances are updated
    Then no race condition should produce negative balances

  @backend
  Scenario: Prevent negative balance via direct API manipulation
    Given a malicious request attempts to set BTC to "-1"
    When the backend processes the request
    Then the request must be rejected
    And the balance must remain unchanged
