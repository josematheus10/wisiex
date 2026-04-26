Feature: Estatísticas do mercado e saldos do utilizador
  Como trader autenticado
  Quero visualizar estatísticas do mercado e os meus saldos
  Para tomar decisões de trading informadas

  Background:
    Given estou autenticado como "stats_trader"

  @backend
  Scenario: Visualizar estatísticas do mercado sem negociações nas últimas 24h
    Given não existem negociações nas últimas 24 horas
    When consulto as estatísticas
    Then o último preço é nulo ou zero
    And o volume BTC nas últimas 24h é zero
    And o volume USD nas últimas 24h é zero
    And o máximo nas últimas 24h é nulo ou zero
    And o mínimo nas últimas 24h é nulo ou zero

  @backend
  Scenario: Último preço reflete a negociação mais recente
    Given existem negociações registadas com os preços 48000, 50000 e 52000 USD
    When consulto as estatísticas
    Then o último preço é 52000 USD

  @backend
  Scenario: Volume BTC acumula todas as negociações das últimas 24h
    Given existem negociações nas últimas 24h com volumes de 0.5 BTC, 0.3 BTC e 0.2 BTC
    When consulto as estatísticas
    Then o volume BTC nas últimas 24h é 1.0 BTC

  @backend
  Scenario: Volume USD acumula todas as negociações das últimas 24h
    Given existem negociações nas últimas 24h com valores de 25000 USD, 15000 USD e 10000 USD
    When consulto as estatísticas
    Then o volume USD nas últimas 24h é 50000 USD

  @backend
  Scenario: Máximo e mínimo das últimas 24h são calculados corretamente
    Given existem negociações nas últimas 24h com preços 48000, 52000 e 50000 USD
    When consulto as estatísticas
    Then o máximo nas últimas 24h é 52000 USD
    And o mínimo nas últimas 24h é 48000 USD

  @backend
  Scenario: Saldo do utilizador é retornado nas estatísticas
    Given o utilizador "stats_trader" possui 80 BTC e 90000 USD
    When consulto as estatísticas
    Then o saldo BTC do utilizador é 80 BTC
    And o saldo USD do utilizador é 90000 USD

  @frontend
  Scenario: Painel de estatísticas exibe todos os campos na interface
    Given estou autenticado na web como "ui_stats_trader"
    When acedo à página de Orders
    Then o painel de estatísticas exibe o último preço
    And o painel de estatísticas exibe o volume BTC 24h
    And o painel de estatísticas exibe o volume USD 24h
    And o painel de estatísticas exibe o máximo 24h
    And o painel de estatísticas exibe o mínimo 24h
    And o painel de estatísticas exibe o saldo BTC do utilizador
    And o painel de estatísticas exibe o saldo USD do utilizador

  @frontend
  Scenario: Estatísticas são atualizadas em tempo real via WebSocket
    Given estou autenticado na web como "ui_stats_rt_trader"
    And estou na página de Orders
    When uma nova negociação é realizada por outro utilizador
    Then o painel de estatísticas é atualizado sem recarregar a página
