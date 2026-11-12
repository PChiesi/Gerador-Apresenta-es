# Gerador de Apresentações

Monta prompts completos para criar apresentações executivas com IA. Você escreve (ou dita) o conteúdo, e a ferramenta junta o resto: estrutura de cada slide, padrão visual, imagens em alta resolução, gráficos editáveis e um checklist de qualidade. O prompt funciona no Copilot do PowerPoint, no ChatGPT, no Claude, no Gemini ou em qualquer IA que gere arquivos .pptx.

**Use online:** https://pchiesi.github.io/Gerador-Apresenta-es/

É uma página HTML única, sem servidor e sem cadastro. O que você digita fica salvo no seu navegador.

## O que ela faz

- **Exemplos prontos** de resultados trimestrais, proposta de projeto, lançamento de produto e status de projeto. Os números dos exemplos são marcadores como `[X]`, e um aviso conta quantos faltam preencher.
- **Oito tipos de slide** (capa, tese em pilares, indicadores, portfólio, próximos passos, comparativo, recomendação e livre). Cada tipo já diz à IA como desenhar o slide.
- **Ditado por voz** nos campos de texto (Chrome e Edge).
- **Nome da empresa e classificação** do documento, que entram na capa e no rodapé.
- **Imagens por slide**, como fundo ou como parte do slide. Ao escolher um arquivo, a ferramenta mede a resolução e avisa quando ela está baixa. Sem arquivo, o prompt pede uma fotografia em 3840 × 2160 px.
- **Gráficos editáveis** de colunas, barras, rosca ou linha, com os dados digitados, colados do Excel ou tirados de uma planilha importada (.xlsx ou .csv). O prompt exige gráfico nativo do PowerPoint, com os dados na planilha do próprio gráfico, e proíbe imagem de gráfico. Para IAs que geram o arquivo com código, ele indica o tipo exato no python-pptx (`XL_CHART_TYPE`).
- **Rascunho .pptx**: um botão gera na hora um arquivo do PowerPoint com seus títulos, textos e gráficos já nativos e editáveis (com [PptxGenJS](https://github.com/gitbrent/PptxGenJS)). Se a IA insistir em colar gráfico como imagem, os gráficos do rascunho resolvem.
- **Estilos visuais**: quatro paletas prontas, as cores e a fonte da sua empresa, ou o seu template .pptx/.potx. Do template, a ferramenta lê as cores do tema, as fontes, o tamanho e os layouts.
- **Montar slides com IA** (opcional): com a sua chave da API da Anthropic, o Claude monta a estrutura de slides a partir do título, do contexto, dos números e das planilhas.
- Salvar várias apresentações, exportar e importar em .json, tema claro e escuro e um manual dentro da própria página.

## Privacidade

Planilhas, templates e imagens são lidos no seu navegador e não são enviados a lugar nenhum. A única chamada externa com os seus dados é o "Montar slides com IA", e só quando você usa: ela vai direto do navegador para `api.anthropic.com` com a sua chave. A chave fica guardada só no seu navegador (localStorage) e pode ser apagada em "Configurar IA". Evite usar a chave num computador compartilhado.

## Rodar localmente

Abra o `index.html` no navegador. Não precisa instalar nada.

Testes do motor (Node 22 ou mais novo):

```bash
node test/engine.test.js
```

## Licença

MIT. Veja [LICENSE](LICENSE).
