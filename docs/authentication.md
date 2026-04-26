# Feature: Autenticação

> Funcionalidade de autenticação do sistema de order matching da Wisiex.  
> Apenas o nome de utilizador é necessário para aceder à plataforma.

---

## Feature: Autenticação de Utilizador
gherkin : wisiex/packages/bdd/features/login.feature



## Resumo dos Critérios de Aceitação

| # | Critério                                                                 | Obrigatório |
|---|--------------------------------------------------------------------------|:-----------:|
| 1 | Login apenas com nome de utilizador (sem password)                       | ✅          |
| 2 | Registo automático se o utilizador não existir                           | ✅          |
| 3 | Saldo inicial de **100 BTC** e **100.000 USD** para novos utilizadores   | ✅          |
| 4 | Geração de token **JWT** após autenticação bem-sucedida                  | ✅          |
| 5 | Autenticação via **HTTP Bearer Token**                                   | ✅          |
| 6 | Redirecionamento para a página de **Orders** após login                  | ✅          |
| 7 | Proteção de rotas: acesso negado sem token válido                        | ✅          |
| 8 | Validação de nome de utilizador vazio                                    | ✅          |
```