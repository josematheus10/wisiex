Feature: Autenticação de Utilizador
  Como um utilizador da plataforma Wisiex
  Quero autenticar-me apenas com o meu nome de utilizador
  Para que eu possa aceder ao sistema de trading BTC/USD

  Background:
    Given que a página de autenticação está acessível
    And o sistema está operacional

  Scenario: Registo automático de novo utilizador
    Given que o utilizador "alice" não existe no sistema
    When o utilizador submete o nome "alice" no formulário de login
    Then o sistema regista automaticamente o utilizador "alice"
    And o utilizador "alice" recebe um saldo inicial de 100 BTC
    And o utilizador "alice" recebe um saldo inicial de 100000 USD
    And um token JWT é gerado para a sessão de "alice"
    And o utilizador é redirecionado para a página de Orders

  Scenario: Login de utilizador já registado
    Given que o utilizador "bob" já existe no sistema
    And "bob" possui um saldo de 80 BTC e 95000 USD
    When o utilizador submete o nome "bob" no formulário de login
    Then o sistema não cria um novo registo para "bob"
    And os saldos de "bob" permanecem inalterados (80 BTC e 95000 USD)
    And um token JWT é gerado para a sessão de "bob"
    And o utilizador é redirecionado para a página de Orders

  Scenario: Token JWT é gerado e usado como Bearer
    Given que o utilizador "carol" se autentica com sucesso
    When o sistema gera o token JWT
    Then o token JWT deve ser válido
    And o token deve conter o identificador do utilizador "carol"
    And todas as requisições subsequentes devem incluir o header:
      """
      Authorization: Bearer <token>
      """

  Scenario: Tentativa de login com nome vazio
    Given que a página de autenticação está aberta
    When o utilizador submete um nome de utilizador vazio ""
    Then o sistema não realiza autenticação
    And o utilizador permanece na página de autenticação
    And uma mensagem de erro é exibida: "O nome de utilizador é obrigatório"

  Scenario: Acesso à página de Orders sem autenticação
    Given que o utilizador não possui um token JWT válido
    When tenta aceder diretamente à página de Orders
    Then o sistema rejeita o acesso com status 401
    And o utilizador é redirecionado para a página de autenticação

  Scenario: Sessão expirada por token JWT inválido
    Given que o utilizador "dave" possui um token JWT expirado
    When tenta realizar uma operação autenticada
    Then o sistema rejeita a requisição com status 401
    And o utilizador é redirecionado para a página de autenticação
    And é exibida a mensagem "Sessão expirada. Por favor, autentique-se novamente."