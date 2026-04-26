Feature: Formulários de compra e venda e tabela de ordens ativas
  Como trader autenticado
  Quero interagir com os formulários de ordem e visualizar as minhas ordens ativas
  Para gerir as minhas posições de trading

  Background:
    Given estou autenticado como "form_trader"

  @frontend
  Scenario: Total é calculado automaticamente ao preencher amount e price no formulário de compra
    Given estou autenticado na web como "ui_form_trader"
    When preencho o campo Amount com 0.5 BTC no formulário de compra
    And preencho o campo Price com 50000 USD no formulário de compra
    Then o campo Total exibe automaticamente 25000 USD

  @frontend
  Scenario: Total é atualizado ao alterar o amount no formulário de venda
    Given estou autenticado na web como "ui_form_trader2"
    When preencho o campo Amount com 1.0 BTC no formulário de venda
    And preencho o campo Price com 60000 USD no formulário de venda
    Then o campo Total exibe automaticamente 60000 USD
    When altero o campo Amount para 0.5 BTC
    Then o campo Total é atualizado automaticamente para 30000 USD

  @frontend
  Scenario: Tabela de ordens ativas exibe colunas Amount, Price, Type e botão de cancelar
    Given estou autenticado na web como "ui_active_orders_trader"
    And tenho uma ordem de compra ativa de 0.3 BTC a 48000 USD
    When acedo à página de Orders
    Then a tabela de ordens ativas exibe a coluna "Amount"
    And a tabela de ordens ativas exibe a coluna "Price"
    And a tabela de ordens ativas exibe a coluna "Type"
    And a tabela de ordens ativas exibe um botão de cancelar para cada ordem

  @frontend
  Scenario: Ordem ativa exibe tipo correto (Buy ou Sell)
    Given estou autenticado na web como "ui_order_type_trader"
    And tenho uma ordem de compra ativa de 0.2 BTC a 47000 USD
    And tenho uma ordem de venda ativa de 0.1 BTC a 55000 USD
    When acedo à página de Orders
    Then a tabela de ordens ativas exibe "Buy" para a ordem de compra
    And a tabela de ordens ativas exibe "Sell" para a ordem de venda

  @frontend
  Scenario: Cancelar ordem remove-a da tabela de ordens ativas em tempo real
    Given estou autenticado na web como "ui_cancel_trader"
    And tenho uma ordem de compra ativa de 0.5 BTC a 49000 USD
    When cancelo a ordem pela interface
    Then a ordem desaparece da tabela de ordens ativas sem recarregar a página

  @frontend
  Scenario: Formulário de compra não permite submissão com campos vazios
    Given estou autenticado na web como "ui_validation_trader"
    When submeto o formulário de compra sem preencher Amount nem Price
    Then o formulário não é submetido
    And mensagens de validação são exibidas nos campos obrigatórios

  @frontend
  Scenario: Formulário de venda não permite submissão com amount superior ao saldo BTC
    Given estou autenticado na web como "ui_balance_trader"
    And o meu saldo BTC é 0.1
    When preencho o formulário de venda com 1.0 BTC a 50000 USD
    And submeto o formulário de ordem
    Then o formulário não é submetido
    And é exibida uma mensagem de erro de saldo insuficiente

  @frontend
  Scenario: Ordens ativas são atualizadas em tempo real via WebSocket
    Given estou autenticado na web como "ui_rt_orders_trader"
    And estou na página de Orders
    When uma nova ordem minha é executada
    Then a tabela de ordens ativas é atualizada sem recarregar a página
