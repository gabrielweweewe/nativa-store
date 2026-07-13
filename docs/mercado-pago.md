# Mercado Pago — ativação

A loja usa Checkout Transparente com a Orders API. Cartões são tokenizados pelo Card Payment
Brick; Pix e boleto são exibidos no próprio checkout.

## 1. Banco de dados

No SQL Editor do Supabase, execute nesta ordem:

1. `supabase/orders.sql` (se ainda não tiver sido aplicado);
2. `supabase/admin_notifications.sql` (se ainda não tiver sido aplicado);
3. `supabase/mercado_pago.sql`.

O último script cria configurações por ambiente, tentativas idempotentes, campos de conciliação,
RPCs de checkout e a notificação que dispara somente quando o pagamento é aprovado.

## 2. Variável obrigatória

Gere um valor aleatório com no mínimo 32 caracteres e configure localmente e no Vercel:

```env
MERCADO_PAGO_ENCRYPTION_KEY=valor-aleatorio-longo
```

Não altere essa chave depois de salvar credenciais. Se ela for perdida, os tokens precisarão ser
informados novamente no admin.

## 3. Aplicação Mercado Pago

1. Crie ou abra a aplicação em **Suas integrações** no Mercado Pago.
2. Copie Public Key e Access Token de teste.
3. No site, acesse `/admin/integracoes`, abra Mercado Pago e salve as credenciais de teste.
4. Copie a URL de webhook mostrada no admin.
5. No Mercado Pago, abra **Webhooks**, cadastre essa URL e habilite o tópico **Orders**.
6. Copie a assinatura secreta gerada e salve-a no admin.
7. Use **Testar conexão** antes de habilitar o ambiente no checkout.

Para Pix, a conta vendedora deve ter uma chave Pix cadastrada.

## 4. Homologação

Teste antes de ativar produção:

- cartão aprovado e recusado com os cartões de teste oficiais;
- Pix criado, QR Code/copia-e-cola visíveis e confirmação pelo webhook;
- boleto criado, link/linha digitável visíveis e expiração;
- recarga da página e consulta do pedido pendente;
- reenvio do mesmo checkout sem duplicar cobrança;
- webhook repetido e assinatura inválida.

Depois, repita a configuração na opção **Produção**, usando as credenciais produtivas. Ativar um
ambiente desativa o outro automaticamente.
