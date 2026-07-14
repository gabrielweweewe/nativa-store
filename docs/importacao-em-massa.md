# Importação em massa de produtos

> Guia de uso da tela **Admin → Produtos → Importar em massa** (`/admin/produtos/importar`).

Esse recurso permite cadastrar ou atualizar várias peças de uma vez só, preenchendo uma planilha
em vez de usar o formulário produto por produto.

---

## Passo a passo

1. Acesse `/admin/produtos/importar` (logado no painel admin).
2. Clique em **"Baixar modelo CSV"** para obter a planilha de exemplo com as colunas corretas.
3. Abra o arquivo no Excel, Google Sheets ou LibreOffice e preencha uma linha por produto
   (veja a explicação de cada coluna abaixo). Você pode manter as duas linhas de exemplo como
   referência e depois excluí-las.
4. Salve/exporte como **.csv** (recomendado) ou **.xlsx**.
5. Volte na tela de importação e clique em **"Enviar planilha"**, escolhendo o arquivo salvo.
6. Revise a **pré-visualização**: cada linha aparece com um status:
   - 🟢 **Novo** — produto será criado.
   - 🟠 **Atualização** — já existe um produto com o mesmo *slug*; será sobrescrito se a opção
     "Atualizar produtos existentes" estiver ligada.
   - 🔴 **Erro** — a linha tem algum problema (veja a coluna "Detalhes") e **não será importada**.
7. Corrija erros direto na planilha e envie o arquivo novamente, se necessário.
8. Clique em **"Importar N produto(s)"** para confirmar. Ao final, um resumo mostra quantos
   produtos foram criados e quantos foram atualizados.

Nada é salvo no banco de dados até você clicar em "Importar" — a pré-visualização é só local, no
seu navegador.

---

## Colunas do modelo

| Coluna | Obrigatória | Descrição |
|---|---|---|
| `nome` | Sim | Nome do produto. |
| `categoria` | Sim | Preferencialmente `Bolsas` (a loja vende apenas bolsas artesanais). Valores técnicos aceitos: `Roupas`, `Bolsas` ou `Acessórios`. |
| `preco` | Sim | Preço de venda atual. Use ponto ou vírgula como separador decimal (ex: `129.90`). |
| `preco_original` | Não | Preço "de" (antes da promoção). Deixe vazio se não houver promoção. |
| `sku` | Não | Código interno do produto. Se vazio, usa o slug gerado. |
| `estoque` | Não | Quantidade em estoque (número). |
| `em_estoque` | Não | `SIM` ou `NAO`. Se vazio, considera `SIM`. |
| `destaque` | Não | `SIM` para aparecer nas seções de destaque da loja. |
| `badge` | Não | Selo exibido no produto (ex: "Mais vendido"). |
| `imagens` | Sim | Uma ou mais URLs de imagem **separadas por `\|`** (barra vertical). A primeira é a capa. |
| `tamanhos` | Não | Tamanhos separados por `\|` (ex: `P\|M\|G`). Se vazio, usa "Único". |
| `descricao_curta` | Não | Resumo curto (usado em listagens/SEO). |
| `descricao` | Não | Descrição completa. Aceita HTML simples (`<h3>`, `<p>`, `<ul>`, `<li>`, `<strong>`). |
| `materiais` | Não | Materiais separados por `\|` (ex: `Algodão\|Palha`). |
| `cuidados` | Não | Instruções de cuidado separadas por `\|`. |
| `destaques` | Não | Tags/benefícios separados por `\|` (ex: `Frete grátis\|Feito à mão`). |
| `artesao_nome` | Não | Nome do artesão/marca responsável pela peça. |
| `artesao_regiao` | Não | Região de origem do artesão. |
| `artesao_historia` | Não | Pequeno texto sobre o artesão. |
| `slug` | Não | URL do produto. Se vazio, é gerado automaticamente a partir do nome. Preencha apenas se quiser **atualizar** um produto já existente com um slug específico. |

### Sobre as imagens na importação em massa

A planilha só aceita **URLs de imagens já hospedadas** (não é possível enviar arquivos de imagem
linha a linha por uma planilha). Para conseguir uma URL:

1. Cadastre a imagem uma vez em qualquer produto pelo formulário individual (`/admin/produtos/novo`),
   usando o botão "Enviar imagem" na aba Imagens — isso já hospeda a foto no Supabase Storage e
   gera uma URL pública.
2. Copie essa URL (clique com o botão direito na imagem → "Copiar endereço da imagem", ou abra o
   produto no site e copie o link da imagem).
3. Cole a URL na coluna `imagens` da planilha. Para mais de uma imagem no mesmo produto, separe
   as URLs com `|`.

Alternativamente, você pode usar qualquer URL de imagem pública já existente (ex: de outro site
ou CDN), desde que o link aponte diretamente para o arquivo da imagem.

---

## Limites e observações

- Tamanho de cada imagem enviada pelo formulário individual: JPG/PNG/WEBP até 4MB (via API); GIF até 15MB (upload direto ao Storage).
- Linhas com erro **não bloqueiam** as demais — apenas aquela linha específica é ignorada.
- Produtos são identificados pelo **slug** (gerado a partir do nome, ou informado manualmente).
  Duas linhas com o mesmo nome geram o mesmo slug e serão tratadas como o mesmo produto.
- Se "Atualizar produtos existentes" estiver **desligado**, linhas cujo slug já existe na loja
  são puladas (não sobrescrevem o produto atual).
- A importação usa o mesmo formulário de validação do cadastro individual — os mesmos campos
  obrigatórios se aplicam.
