ESCOPO — CRM SIMPLES PARA CONTROLE DE RESTITUIÇÃO DE SEGUROS

1\. Objetivo

Criar um CRM simples para controlar todo o processo de identificação, contato, conversão, cancelamento de seguros, recebimento dos valores e controle das comissões.

O sistema deve permitir acompanhar o cliente desde a entrada da lista até a conclusão financeira do processo, mantendo também o histórico para futuras oportunidades.

\---

2\. CADASTRO DO CLIENTE

Cada cliente deverá possuir um cadastro único, evitando cadastrar a mesma pessoa novamente.

Informações básicas:

\- Nome  
\- CPF  
\- Telefone/WhatsApp  
\- E-mail  
\- Cidade/UF  
\- Observações  
\- Status do cliente

Status do cliente:

\- Novo  
\- Em contato  
\- Em negociação  
\- Convertido  
\- Não aceitou  
\- Não contatar  
\- Finalizado

O sistema deverá manter o histórico do cliente, mesmo quando ele tiver novos seguros posteriormente.

\---

3\. CADASTRO DO SEGURO / CASO

Um mesmo cliente poderá possuir mais de um caso ao longo do tempo.

Cada caso deverá conter:

\- Cliente  
\- Número da apólice, se houver  
\- Seguradora  
\- Tipo do seguro  
\- Data de identificação  
\- Valor do seguro/restituição  
\- Quantidade de seguros  
\- Observações  
\- Documento/apólice anexado  
\- Status do caso

Status do caso:

1\. Identificado  
2\. Aguardando contato  
3\. Contatado  
4\. Aguardando resposta  
5\. Não aceitou  
6\. Convertido  
7\. Documentação pendente  
8\. Cancelamento iniciado  
9\. Cancelamento confirmado  
10\. Aguardando pagamento  
11\. Cliente recebeu  
12\. Pagamento à empresa pendente  
13\. Pagamento à empresa realizado  
14\. Finalizado  
15\. Perdido

\---

4\. CONTROLE DE CONTATOS

Preciso visualizar facilmente:

\- Quem ainda não foi contatado;  
\- Quem já foi contatado;  
\- Quem respondeu;  
\- Quem não respondeu;  
\- Quem não aceitou;  
\- Quem precisa de novo contato;  
\- Quem foi convertido.

Deve existir um campo de data do último contato e data do próximo contato/retorno.

Também deverá ser possível registrar uma observação simples sobre o contato.

\---

5\. ACOMPANHAMENTO DE CLIENTES QUE NÃO ACEITARAM

Clientes que não aceitaram inicialmente não devem desaparecer do sistema.

O CRM deverá permitir marcar uma data para novo contato.

Exemplo:

«Cliente não aceitou em setembro → programar novo contato em outubro.»

Na tela principal deverá ser possível visualizar os clientes que estão com retorno pendente.

\---

6\. NOVOS SEGUROS DO MESMO CLIENTE

O sistema deverá permitir cadastrar um novo caso para um cliente que já existe.

Exemplo:

«João já teve um seguro cancelado em setembro.  
Em dezembro apareceu um novo seguro no nome dele.»

Não criar outro João.

Apenas adicionar um novo caso/seguro ao cadastro existente.

Deve ser possível visualizar todo o histórico do cliente.

\---

7\. CLIENTES QUE NÃO DEVEM SER CONTATADOS

Criar uma opção:

“NÃO CONTATAR”

Quando marcada, o cliente deverá ficar bloqueado para novas abordagens.

Motivo do bloqueio:

\- Prejuízo  
\- Solicitação do cliente  
\- Outro

Esse cliente deverá aparecer em uma lista específica e não deverá ser confundido com clientes disponíveis para contato.

\---

8\. DOCUMENTOS

Possibilidade de anexar arquivos ao cadastro/caso, principalmente:

\- Apólice  
\- Termo/contrato  
\- Documentos enviados pelo cliente  
\- Comprovantes  
\- Outros documentos necessários

Não precisa ter sistema complexo de assinatura digital nesta primeira versão.

Apenas permitir anexar e visualizar/baixar os arquivos.

\---

9\. TERMO / CONTRATO

Após a conversão, o sistema deverá indicar que o cliente precisa preencher o termo/contrato.

Controle simples:

\- Pendente  
\- Enviado ao cliente  
\- Recebido  
\- Conferido

O documento recebido deverá poder ser anexado ao caso.

\---

10\. CANCELAMENTO

Após receber a documentação, deverá ser possível iniciar o processo de cancelamento.

Controlar:

\- Data de solicitação  
\- Status do cancelamento  
\- Data do cancelamento  
\- Observação  
\- Comprovante/documento, se houver

Status:

Pendente → Solicitação realizada → Cancelamento confirmado

É importante existir uma confirmação de que o seguro foi realmente cancelado antes de avançar para a etapa de pagamento.

\---

11\. PAGAMENTO AO CLIENTE

Após o cancelamento confirmado:

Registrar:

\- Valor previsto para o cliente  
\- Valor efetivamente recebido  
\- Data do recebimento  
\- Status do pagamento  
\- Comprovante enviado pelo cliente

Status:

\- Aguardando pagamento  
\- Cliente recebeu  
\- Não recebeu  
\- Perdido

\---

12\. PAGAMENTO À EMPRESA

Após o cliente receber, controlar o pagamento devido à empresa.

Registrar:

\- Valor devido à empresa  
\- Data de vencimento  
\- Data do pagamento  
\- Valor pago  
\- Comprovante  
\- Status

Status:

\- Pendente  
\- Pago  
\- Em atraso  
\- Perdido

\---

13\. CONTROLE FINANCEIRO

Preciso conseguir visualizar e filtrar os valores do CRM.

Principais informações:

\- Valor total dos seguros/restituições  
\- Valor previsto para clientes  
\- Valor efetivamente recebido pelos clientes  
\- Valor da comissão/taxa da empresa  
\- Minha comissão  
\- Valores pagos  
\- Valores pendentes  
\- Valores em atraso  
\- Valores perdidos

\---

14\. FILTROS

O sistema deverá possuir filtros simples por:

\- Período  
\- Cliente  
\- CPF  
\- Status  
\- Seguradora  
\- Tipo de seguro  
\- Responsável  
\- Valor  
\- Pagamento  
\- Cancelamento  
\- Clientes pendentes de contato  
\- Clientes pendentes de retorno  
\- Clientes convertidos  
\- Clientes perdidos  
\- Clientes que não devem ser contatados

\---

15\. DASHBOARD SIMPLES

A tela inicial deverá mostrar alguns números principais:

Clientes

\- Novos  
\- Aguardando contato  
\- Aguardando resposta  
\- Convertidos  
\- Não aceitos  
\- Não contatar

Processos

\- Cancelamentos pendentes  
\- Cancelamentos confirmados  
\- Aguardando pagamento  
\- Finalizados  
\- Perdidos

Financeiro

\- Valor total em processos  
\- Valor recebido  
\- Valor pendente  
\- Comissão da empresa  
\- Minha comissão

\---

16\. ROTINA MENSAL

O CRM deverá facilitar a revisão mensal.

Preciso conseguir identificar:

\- Clientes que possuem novos seguros;  
\- Clientes que precisam ser contatados novamente;  
\- Clientes que não aceitaram anteriormente;  
\- Clientes com processos pendentes;  
\- Clientes que já foram convertidos anteriormente e possuem novo caso.

\---

17\. PESQUISA

Uma barra de pesquisa simples para localizar rapidamente pelo:

\- Nome  
\- CPF  
\- Telefone  
\- Número da apólice

\---

18\. PRIORIDADE DO PROJETO

A ideia é fazer um MVP simples, sem excesso de funcionalidades.

ESSENCIAL NA PRIMEIRA VERSÃO:

✅ Cadastro de clientes  
✅ Cadastro de vários casos por cliente  
✅ Cadastro de seguros  
✅ Upload de documentos  
✅ Controle de contatos  
✅ Data de retorno  
✅ Funil/status dos processos  
✅ Controle de cancelamento  
✅ Controle de recebimento do cliente  
✅ Controle de pagamento à empresa  
✅ Controle de comissões  
✅ Filtros  
✅ Pesquisa  
✅ Histórico do cliente  
✅ Lista de clientes para não contatar  
✅ Dashboard básico

DEIXAR PARA UMA SEGUNDA ETAPA:

❌ Integração automática com WhatsApp  
❌ Disparo automático de mensagens  
❌ Assinatura digital integrada  
❌ Integração bancária  
❌ Emissão automática de boletos  
❌ Inteligência artificial  
❌ Aplicativo mobile próprio  
❌ Automações complexas  
❌ Relatórios muito avançados

\---

19\. FLUXO PRINCIPAL DO CRM

LISTA DE CLIENTES

↓

IDENTIFICAR SEGURO

↓

CADASTRAR CLIENTE \+ SEGURO \+ APÓLICE

↓

CONTATAR CLIENTE

↓

AGUARDAR RESPOSTA

↓

NÃO ACEITOU → PROGRAMAR NOVO CONTATO

OU

ACEITOU → CONVERSÃO

↓

ENVIAR TERMO/CONTRATO

↓

RECEBER DOCUMENTAÇÃO

↓

INICIAR CANCELAMENTO

↓

CONFIRMAR CANCELAMENTO

↓

AGUARDAR PAGAMENTO DO CLIENTE

↓

CLIENTE RECEBE

↓

PAGAMENTO À EMPRESA

↓

REGISTRAR COMPROVANTE

↓

CALCULAR/REGISTRAR COMISSÕES

↓

FINALIZAR CASO

\---

20\. REGRA MAIS IMPORTANTE

O sistema deve separar:

CLIENTE  
↓  
CASOS/SEGUROS DESSE CLIENTE

Um cliente pode ter vários casos ao longo do tempo.

Assim, mesmo que um cliente já tenha sido convertido ou não tenha aceitado anteriormente, ele continuará no CRM e poderá ser identificado novamente caso apareça um novo seguro.

O objetivo é que nenhum cliente seja esquecido e nenhum cliente que tenha dado prejuízo seja contatado novamente.  
