Feature: Colocação e execução de ordens
  Como trader autenticado
  Quero criar e gerenciar ordens de compra e venda
  Para negociar BTC/USD na exchange

  Background:
    Given estou autenticado como "trader_bdd"

  @backend
  Scenario: Trader cria uma ordem de compra limitada
    When coloco uma ordem de compra de 0.5 BTC a 50000 USD
    Then a ordem é criada com status "PENDING"
    And a ordem aparece nas minhas ordens ativas

  @backend
  Scenario: Trader cria uma ordem de venda limitada
    When coloco uma ordem de venda de 0.1 BTC a 65000 USD
    Then a ordem é criada com status "PENDING"
    And a ordem aparece nas minhas ordens ativas

  @backend
  Scenario: Trader cancela uma ordem ativa
    Given tenho uma ordem de compra ativa de 0.1 BTC a 45000 USD
    When cancelo a ordem
    Then o status da ordem é "CANCELLED"
    And a ordem aparece no meu histórico

  @backend
  Scenario: Ordens compatíveis são executadas automaticamente
    Given o usuário "maker_bdd" tem uma ordem de venda de 0.1 BTC a 50000 USD
    When coloco uma ordem de compra de 0.1 BTC a 50000 USD
    Then as ordens são casadas
    And uma negociação é registrada ao preço de 50000 USD

  @backend
  Scenario: Ordem parcialmente executada permanece no livro
    Given o usuário "maker2_bdd" tem uma ordem de venda de 1.0 BTC a 50000 USD
    When coloco uma ordem de compra de 0.3 BTC a 50000 USD
    Then as ordens são casadas
    And a ordem do maker tem status "PARTIAL"

  @frontend
  Scenario: Trader preenche o formulário clicando no livro de ordens
    Given estou autenticado na web como "ui_trader_bdd"
    And existe pelo menos uma ordem no livro de ofertas
    When clico no primeiro preço de venda no livro de ordens
    Then o formulário de compra é preenchido com aquele preço

  @frontend
  Scenario: Trader submete uma ordem pela interface web
    Given estou autenticado na web como "ui_trader2_bdd"
    When preencho o formulário de compra com 0.01 BTC a 40000 USD
    And submeto o formulário de ordem
    Then a ordem aparece na tabela de ordens ativas
