Feature: Regras avançadas de execução de ordens
  Como trader autenticado
  Quero que o motor de matching respeite as regras de limite e prioridade de preço
  Para garantir execução justa e sem race conditions

  Background:
    Given estou autenticado como "matching_trader"

  @backend
  Scenario: Ordem de compra executa ao preço do vendedor quando melhor que o limite
    Given o utilizador "price_maker" tem uma ordem de venda de 0.5 BTC a 9000 USD
    When coloco uma ordem de compra de 0.5 BTC a 10000 USD
    Then a execução ocorre ao preço de 9000 USD
    And o comprador paga 9000 USD por 0.5 BTC (não 10000 USD)

  @backend
  Scenario: Ordem de venda executa ao preço do comprador quando melhor que o limite
    Given o utilizador "price_maker2" tem uma ordem de compra de 1.0 BTC a 55000 USD
    When coloco uma ordem de venda de 1.0 BTC a 50000 USD
    Then a execução ocorre ao preço de 55000 USD
    And o vendedor recebe 55000 USD por BTC (não 50000 USD)

  @backend
  Scenario: Ordem não é executada se o preço do livro for pior que o limite
    Given o utilizador "no_match_maker" tem uma ordem de venda de 0.5 BTC a 60000 USD
    When coloco uma ordem de compra de 0.5 BTC a 50000 USD
    Then as ordens não são casadas
    And a minha ordem fica pendente no livro com status "PENDING"

  @backend
  Scenario: Ordem totalmente executada fica com status COMPLETE
    Given o utilizador "complete_maker" tem uma ordem de venda de 0.5 BTC a 50000 USD
    When coloco uma ordem de compra de 0.5 BTC a 50000 USD
    Then as ordens são casadas
    And a minha ordem tem status "COMPLETE"
    And a ordem do maker tem status "COMPLETE"

  @backend
  Scenario: Execução parcial deixa a ordem remanescente com status PARTIAL
    Given o utilizador "partial_maker2" tem uma ordem de venda de 0.3 BTC a 50000 USD
    When coloco uma ordem de compra de 0.5 BTC a 50000 USD
    Then 0.3 BTC são casados
    And a minha ordem tem status "PARTIAL" com 0.2 BTC restantes no livro
    And a ordem do maker tem status "COMPLETE"

  @backend
  Scenario: Ordens são processadas uma de cada vez sem race conditions
    Given existem múltiplas ordens sendo submetidas simultaneamente
    When o sistema processa as ordens
    Then cada ordem é processada sequencialmente pela fila
    And não ocorrem execuções duplicadas

  @backend
  Scenario: Ordem é adicionada ao livro quando não há match disponível
    Given não existem ordens de venda no livro
    When coloco uma ordem de compra de 0.5 BTC a 48000 USD
    Then a ordem fica pendente no livro com status "PENDING"
    And a ordem aparece nos bids do livro de ordens

  @backend
  Scenario: Matching segue prioridade de preço-tempo (FIFO ao mesmo preço)
    Given o utilizador "fifo_maker1" colocou uma ordem de venda de 0.5 BTC a 50000 USD às 10:00
    And o utilizador "fifo_maker2" colocou uma ordem de venda de 0.5 BTC a 50000 USD às 10:01
    When coloco uma ordem de compra de 0.5 BTC a 50000 USD
    Then a ordem do "fifo_maker1" é executada primeiro por ter sido criada antes
