Feature: Histórico global de negociações e histórico pessoal
  Como trader autenticado
  Quero visualizar as negociações mais recentes do mercado e o meu histórico pessoal
  Para acompanhar a atividade da exchange

  Background:
    Given estou autenticado como "trades_trader"

  @backend
  Scenario: Lista de negociações globais está vazia quando não há trades
    Given não existem negociações registadas
    When consulto as negociações globais
    Then a lista de negociações globais está vazia

  @backend
  Scenario: Negociações globais são listadas por ordem decrescente de data
    Given existem três negociações registadas com preços 48000, 50000 e 52000 USD
    When consulto as negociações globais
    Then a primeira negociação exibida é a mais recente com preço 52000 USD
    And cada negociação apresenta o preço e o volume em BTC

  @backend
  Scenario: Histórico pessoal está vazio quando o utilizador não tem trades
    Given o utilizador "trades_trader" nunca realizou negociações
    When consulto o meu histórico pessoal
    Then o meu histórico de negociações está vazio

  @backend
  Scenario: Histórico pessoal mostra apenas as negociações do utilizador autenticado
    Given existem negociações de vários utilizadores
    And o utilizador "trades_trader" participou em 2 negociações
    When consulto o meu histórico pessoal
    Then são exibidas apenas as 2 negociações do utilizador "trades_trader"

  @backend
  Scenario: Histórico pessoal exibe tipo de ordem (compra ou venda)
    Given o utilizador "trades_trader" comprou 0.5 BTC a 50000 USD
    And o utilizador "trades_trader" vendeu 0.2 BTC a 51000 USD
    When consulto o meu histórico pessoal
    Then a primeira negociação apresenta tipo "Buy"
    And a segunda negociação apresenta tipo "Sell"

  @frontend
  Scenario: Tabela de negociações globais é visível na interface
    Given estou autenticado na web como "ui_trades_trader"
    When acedo à página de Orders
    Then a tabela de negociações globais está visível
    And a tabela apresenta as colunas Preço e Volume

  @frontend
  Scenario: Tabela de histórico pessoal é visível na interface
    Given estou autenticado na web como "ui_history_trader"
    When acedo à página de Orders
    Then a tabela de histórico pessoal está visível
    And a tabela apresenta as colunas Preço, Volume e Tipo

  @frontend
  Scenario: Negociações globais são atualizadas em tempo real via WebSocket
    Given estou autenticado na web como "ui_rt_trades_trader"
    And estou na página de Orders
    When uma nova negociação é realizada por outro utilizador
    Then a nova negociação aparece no topo da tabela de negociações globais sem recarregar a página
