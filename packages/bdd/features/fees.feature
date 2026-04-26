Feature: Taxas de negociação (maker fee e taker fee)
  Como trader autenticado
  Quero que as taxas de negociação sejam aplicadas corretamente
  Para que eu entenda o custo real das minhas operações

  Background:
    Given estou autenticado como "fee_trader"

  @backend
  Scenario: Taker fee de 0.3% é deduzida do comprador que cria o match
    Given o utilizador "fee_maker" tem uma ordem de venda de 1.0 BTC a 50000 USD
    When coloco uma ordem de compra de 1.0 BTC a 50000 USD
    Then as ordens são casadas
    And a taxa do taker corresponde a 0.3% do volume negociado
    And o taker recebe 0.997 BTC (deduzida a taxa de 0.3%)

  @backend
  Scenario: Maker fee de 0.5% é deduzida do vendedor que estava no livro
    Given o utilizador "fee_maker2" tem uma ordem de venda de 1.0 BTC a 50000 USD
    When coloco uma ordem de compra de 1.0 BTC a 50000 USD
    Then as ordens são casadas
    And a taxa do maker corresponde a 0.5% do volume negociado
    And o maker recebe 49750 USD (deduzida a taxa de 0.5% sobre 50000 USD)

  @backend
  Scenario: Taker fee é aplicada quando comprador é o taker
    Given o utilizador "fee_maker3" tem uma ordem de compra de 1.0 BTC a 50000 USD no livro
    When o utilizador "fee_taker" coloca uma ordem de venda de 1.0 BTC a 50000 USD
    Then as ordens são casadas
    And a taxa do taker deduzida ao vendedor corresponde a 0.3% do valor em USD
    And o vendedor recebe 49850 USD (deduzida a taxa de 0.3% sobre 50000 USD)

  @backend
  Scenario: Maker fee é aplicada à ordem que estava pendente no livro
    Given o utilizador "fee_maker4" tem uma ordem de compra de 1.0 BTC a 50000 USD no livro
    When o utilizador "fee_taker2" coloca uma ordem de venda de 1.0 BTC a 50000 USD
    Then as ordens são casadas
    And a taxa do maker deduzida ao comprador corresponde a 0.5% do volume em BTC
    And o comprador recebe 0.995 BTC (deduzida a taxa de 0.5%)

  @backend
  Scenario: Taxas são aplicadas proporcionalmente em execução parcial
    Given o utilizador "fee_partial_maker" tem uma ordem de venda de 0.5 BTC a 50000 USD
    When coloco uma ordem de compra de 1.0 BTC a 50000 USD
    Then 0.5 BTC são casados
    And a taxa do taker incide apenas sobre os 0.5 BTC negociados
    And a taxa do maker incide apenas sobre os 25000 USD negociados
