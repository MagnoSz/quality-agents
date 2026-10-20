# Input template

Copy, fill in and send to the agent. Original (pt-BR):

```text
========================================
📥 ENTRADA — PREENCHIMENTO (QA)
========================================

[DESCRIÇÃO DO ITEM]
- Fluxo:
- Ação executada:
- Resultado esperado:
- Resultado obtido:

[MOMENTO DA FALHA]
- Em qual etapa ocorreu o erro:

[DATA/HORA DA EVIDÊNCIA]
- Data e hora aproximada do erro:
(ex: 02/04/2026 16:24)

[OBSERVAÇÕES]
- O erro acontece sempre?
- Variações relevantes:

[LOG]
- trecho relevante (erro + stacktrace)

========================================
```

English version:

```text
========================================
📥 INPUT — FILLED IN BY QA
========================================

[ITEM DESCRIPTION]
- Flow:
- Action executed:
- Expected result:
- Obtained result:

[MOMENT OF FAILURE]
- Step where the error occurred:

[EVIDENCE DATE/TIME]
- Approximate date and time of the error:
(e.g. 02/04/2026 16:24)

[OBSERVATIONS]
- Does the error always happen?
- Relevant variations:

[LOG]
- relevant excerpt (error + stack trace)

========================================
```

Mandatory: item description (all four lines), moment of failure, evidence date/time, log. Observations are optional.
