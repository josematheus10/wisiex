Feature: Livro de ordens (Bid e Ask)
  Como trader autenticado
  Quero visualizar o livro de ordens com bids e asks agregados
  Para tomar decisões de trading baseadas na liquidez disponível

  Background:
    Given estou autenticado como "orderbook_trader"

  @backend
  Scenario: Livro de ordens está vazio quando não há ordens ativas
    Given não existem ordens ativas no sistema
    When consulto o livro de ordens
    Then a lista de bids está vazia
    And a lista de asks está vazia

  @backend
  Scenario: Bids listam ordens de compra ativas agregadas por preço
    Given existem ordens de compra ativas de 0.3 BTC a 49000 USD e 0.2 BTC a 49000 USD
    When consulto o livro de ordens
    Then os bids apresentam 0.5 BTC agregado ao preço de 49000 USD

  @backend
  Scenario: Asks listam ordens de venda ativas agregadas por preço
    Given existem ordens de venda ativas de 0.4 BTC a 51000 USD e 0.1 BTC a 51000 USD
    When consulto o livro de ordens
    Then os asks apresentam 0.5 BTC agregado ao preço de 51000 USD

  @backend
  Scenario: Bids são ordenados do preço mais alto para o mais baixo
    Given existem bids com preços 48000, 49000 e 47000 USD
    When consulto o livro de ordens
    Then o primeiro bid tem preço 49000 USD
    And o último bid tem preço 47000 USD

  @backend
  Scenario: Asks são ordenados do preço mais baixo para o mais alto
    Given existem asks com preços 52000, 51000 e 53000 USD
    When consulto o livro de ordens
    Then o primeiro ask tem preço 51000 USD
    And o último ask tem preço 53000 USD

  @backend
  Scenario: Ordens canceladas não aparecem no livro de ordens
    Given existe uma ordem de compra de 0.5 BTC a 49000 USD
    When a ordem é cancelada
    And consulto o livro de ordens
    Then a ordem cancelada não aparece nos bids

  @backend
  Scenario: Ordens completamente executadas não aparecem no livro de ordens
    Given existe uma ordem de venda de 0.1 BTC a 50000 USD totalmente executada
    When consulto o livro de ordens
    Then a ordem executada não aparece nos asks

  @frontend
  Scenario: Clicar num ask preenche o formulário de compra
    Given estou autenticado na web como "ui_ob_trader"
    And existe pelo menos uma ordem de venda ativa no livro de ordens
    When clico no primeiro ask do livro de ordens
    Then o formulário de compra é preenchido com o preço desse ask
    And o formulário de compra é preenchido com o volume desse ask

  @frontend
  Scenario: Clicar num bid preenche o formulário de venda
    Given estou autenticado na web como "ui_ob_trader2"
    And existe pelo menos uma ordem de compra ativa no livro de ordens
    When clico no primeiro bid do livro de ordens
    Then o formulário de venda é preenchido com o preço desse bid
    And o formulário de venda é preenchido com o volume desse bid

  @frontend
  Scenario: Livro de ordens é atualizado em tempo real via WebSocket
    Given estou autenticado na web como "ui_rt_ob_trader"
    And estou na página de Orders
    When uma nova ordem é colocada por outro utilizador
    Then o livro de ordens é atualizado sem recarregar a página
