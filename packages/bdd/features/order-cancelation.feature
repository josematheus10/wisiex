Feature: Order Cancelation

  @cancel-unfilled-buy
  Scenario: Cancel a buy order that was not executed
    Given the user has an open buy order of 1 BTC at 10000 USD
    And 10000 USD is reserved
    When the user cancels the order
    Then the order status should be "CANCELLED"
    And the 10000 USD should be returned to the available balance
    And the reserved USD balance should be zero

  @cancel-unfilled-sell
  Scenario: Cancel a sell order that was not executed
    Given the user has an open sell order of 1 BTC
    And 1 BTC is reserved
    When the user cancels the order
    Then the order status should be "CANCELLED"
    And the 1 BTC should be returned to the available balance
    And the reserved BTC balance should be zero

  @cancel-partial
  Scenario: Cancel a partially filled buy order
    Given the user created a buy order of 1 BTC at 10000 USD
    And 10000 USD was reserved
    And 0.4 BTC has already been executed
    And 4000 USD has already been spent
    And 6000 USD is still reserved
    When the user cancels the order
    Then the order status should be "CANCELLED"
    And the remaining 6000 USD should be returned to the available balance
    And the reserved USD balance should be zero
    And the user should keep the 0.4 BTC already acquired

  @cancel-fully-filled
  Scenario: Attempt to cancel a fully filled order
    Given the user has a fully filled order
    When the user attempts to cancel the order
    Then the system should reject the request

  @cancel-concurrent
  Scenario: Cancel order while matching engine is processing it
    Given an order is partially filled
    And the matching engine is processing the order
    When the user requests cancellation at the same time
    Then the system must ensure data consistency
    And the order must not be executed twice
    And the final balances must be correct

  @cancel-ownership
  Scenario: Only the owner can cancel an order
    Given a user "alice" created an order with id "order-123"
    And another user "bob" is authenticated
    When "bob" attempts to cancel the order "order-123"
    Then the system should reject the request
    And the error message should be "Unauthorized to cancel this order"
    And the order status should remain unchanged

  @cancel-ownership
  Scenario: Owner cancels their own order
    Given a user "alice" created an order with id "order-123"
    And "alice" is authenticated
    When "alice" cancels the order "order-123"
    Then the order status should be "CANCELLED"
