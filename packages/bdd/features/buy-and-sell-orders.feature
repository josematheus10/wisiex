Feature: Create Orders

  Scenario: Create buy order
    Given the user has sufficient USD balance
    When the user submits a buy order with amount 1 BTC and price 10000 USD
    Then the order should be created

  Scenario: Create sell order
    Given the user has sufficient BTC balance
    When the user submits a sell order with amount 1 BTC and price 10000 USD
    Then the order should be created

  Scenario: Auto calculate total
    Given the user enters amount 2 BTC and price 10000 USD
    When the form is updated
    Then the total should be 20000 USD

  Scenario: Buy order reserves USD balance
    Given the user has 10000 USD available
    When the user submits a buy order with amount 1 BTC and price 10000 USD
    Then the user should have 0 USD available
    And the user should have 10000 USD reserved

  Scenario: Sell order reserves BTC balance
    Given the user has 2 BTC available
    When the user submits a sell order with amount 2 BTC and price 10000 USD
    Then the user should have 0 BTC available
    And the user should have 2 BTC reserved

  Scenario: Reject buy order with insufficient USD
    Given the user has 5000 USD available
    When the user submits a buy order with amount 1 BTC and price 10000 USD
    Then the order should be rejected with insufficient balance

  Scenario: Reject sell order with insufficient BTC
    Given the user has 0.5 BTC available
    When the user submits a sell order with amount 1 BTC and price 10000 USD
    Then the order should be rejected with insufficient balance

  Scenario: Prevent double spending on buy orders
    Given the user has 10000 USD available
    And the user has an open buy order of 1 BTC at 10000 USD
    When the user submits another buy order with amount 1 BTC and price 10000 USD
    Then the second order should be rejected with insufficient balance

  Scenario: Prevent double spending on sell orders
    Given the user has 1 BTC available
    And the user has an open sell order of 1 BTC at 10000 USD
    When the user submits another sell order with amount 1 BTC at price 10000 USD
    Then the second order should be rejected with insufficient balance

  Scenario: Total balance invariant after reservation
    Given the user has 10000 USD available and 0 USD reserved
    When the user submits a buy order with amount 1 BTC and price 10000 USD
    Then the total USD balance should still be 10000 USD

  Scenario: Partial execution of a buy order when there is a sell order in the book
    Given there is a sell order in the order book of 0.5 BTC at 9000 USD
    And the user has 10000 USD available
    When the user creates a buy order of 1 BTC at 10000 USD
    Then 0.5 BTC should be matched at 9000 USD
    And 4500 USD should be deducted from the user balance
    And the user should receive 0.5 BTC
    And the remaining 0.5 BTC should remain as an open buy order
    And the corresponding USD amount should remain reserved
    And the order status should be "PARTIALLY_FILLED"

  Scenario: Partial execution of a sell order when there is a buy order in the book
    Given there is a buy order in the order book of 0.5 BTC at 10000 USD
    And the user has 1 BTC available
    When the user creates a sell order of 1 BTC at 9000 USD
    Then 0.5 BTC should be matched at 10000 USD
    And 0.5 BTC should be deducted from the user balance
    And the user should receive 5000 USD
    And the remaining 0.5 BTC should remain as an open sell order
    And the remaining BTC should stay reserved
    And the order status should be "PARTIALLY_FILLED"

  Scenario: Partial execution of sell order followed by cancellation of remaining amount
    Given a user "lina" is authenticated
    And a user "joem" is authenticated
    And "lina" has 2 BTC available
    And "joem" has 20 USD available
    When "lina" creates a sell order of 2 BTC at 20 USD
    And "joem" creates a buy order of 1 BTC at 20 USD
    Then the system should match 1 BTC between "lina" and "joem"
    And "lina" should sell 1 BTC and receive 20 USD
    And "joem" should buy 1 BTC and spend 20 USD
    And the trade should be recorded in both users' history
    And the remaining 1 BTC order from "lina" should remain open
    And the order status should be "PARTIALLY_FILLED"
    When "lina" cancels the remaining order
    Then the order status should be "CANCELLED"
    And the remaining 1 BTC should be returned to "lina" available balance

  Scenario: Partial execution of a sell order followed by cancellation of the remaining amount
    Given a user "lina" is authenticated
    And a user "joem" is authenticated
    And "lina" has 2 BTC available
    And "joem" has 20 USD available
    When "joem" creates a buy order of 1 BTC at 20 USD
    And "lina" creates a sell order of 2 BTC at 20 USD
    Then the system should match 1 BTC between "lina" and "joem"
    And "lina" should sell 1 BTC and receive 20 USD
    And "joem" should buy 1 BTC and spend 20 USD
    And the trade should be recorded in both users' history
    And "lina" should have 1 BTC still reserved in the open order
    And the sell order from "lina" should have status "PARTIALLY_FILLED"
    When "lina" cancels the remaining sell order
    Then the order status should be "CANCELLED"
    And the remaining 1 BTC should be released from reserved balance
    And the remaining 1 BTC should be returned to "lina" available balance

  Scenario: Prevent negative BTC values in input field
    Given the user is on the order creation form
    When the user enters "-0.01" in the BTC amount field
    Then the system should reject the input
    And an error message "Invalid amount" should be displayed
    And the field value should remain empty or reset to "0.000000000"

  Scenario: Enforce BTC input mask with fixed decimal precision
    Given the user is on the order creation form
    When the user enters "1" in the BTC amount field
    Then the field should automatically format to "1.000000000"
    When the user enters "0.123" in the BTC amount field
    Then the field should format to "0.123000000"

  Scenario: Limit BTC input to maximum allowed decimal places
    Given the user is on the order creation form
    When the user enters "0.123456789123" in the BTC amount field
    Then the value should be truncated or rounded to "0.123456789"

  Scenario: Prevent negative values even with input mask applied
    Given the BTC amount field uses a decimal mask
    When the user attempts to input a negative value using keyboard or paste
    Then the system should block the negative sign
    And the value should remain in a valid positive format "0.000000000"

  Scenario: Prevent zero or negative BTC orders
    Given the user is filling the order form
    When the user enters "0.000000000" as BTC amount
    Then the system should reject the order
    And display an error "Amount must be greater than zero"