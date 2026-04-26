Feature: User Authentication

  Scenario: Register new user
    Given the user provides a username "john"
    And the user does not exist
    When the user logs in
    Then a new user should be created
    And the user should have 100 BTC balance
    And the user should have 100000 USD balance
    And a JWT token should be generated

  Scenario: Login existing user
    Given the user "john" already exists
    When the user logs in
    Then a JWT token should be generated
    And the user should be authenticated

  @frontend
  Scenario: Redirect after login
    Given the user is authenticated
    When the login is successful
    Then the user should be redirected to the orders page