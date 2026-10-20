# US-LIB-101 — Renovação de empréstimo pelo portal

**Como** leitor da Acme Library
**Quero** renovar meus empréstimos pelo portal
**Para** não precisar ir até a biblioteca.

## Descrição

Será criada a tela "Meus empréstimos" no portal, listando os empréstimos ativos do leitor, com o botão "Renovar" em cada linha.

## Critérios de aceite

- **CA1:** O leitor pode renovar um empréstimo ativo até 2 vezes.
- **CA2:** A renovação adiciona 14 dias ao prazo de devolução.
- **CA3:** Não é possível renovar empréstimo em atraso.
- **CA4:** Usuário autorizado pode renovar empréstimos de outros leitores.
- **CA5:** Ao renovar, o leitor recebe um e-mail de confirmação.
- **CA6:** Professores podem renovar até 3 vezes.

## Regras de negócio relacionadas

- **RN.010:** Itens com reserva ativa de outro leitor não podem ser renovados.
- **RN.011:** A data de devolução nunca pode cair em feriado; quando cair, deve ser adiada para o próximo dia útil.
