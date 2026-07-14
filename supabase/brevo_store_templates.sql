-- Templates de e-mail da loja (editáveis no admin).
-- O Brevo só dispara; o conteúdo fica no banco.

create table if not exists public.brevo_store_templates (
  event text primary key
    check (event in (
      'order_received',
      'order_received_merchant',
      'payment_approved'
    )),
  name text not null,
  subject text not null,
  html_content text not null,
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.brevo_store_templates enable row level security;
revoke all on table public.brevo_store_templates from anon, authenticated;

insert into public.brevo_store_templates (event, name, subject, html_content)
values
(
  'order_received',
  'Pedido criado → cliente',
  'Recebemos seu pedido {{ORDER_SHORT_ID}}',
  $html$
<div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #222; line-height: 1.5;">
  <h1 style="font-size: 22px; margin-bottom: 8px;">Pedido recebido</h1>
  <p>Olá, {{CUSTOMER_NAME}}!</p>
  <p>Recebemos o seu pedido <strong>#{{ORDER_SHORT_ID}}</strong>.</p>
  <p style="margin-top: 20px;"><strong>Resumo</strong></p>
  <p>
    Subtotal: {{SUBTOTAL}}<br>
    Frete: {{SHIPPING_AMOUNT}}<br>
    Total: <strong>{{TOTAL}}</strong><br>
    Pagamento: {{PAYMENT_METHOD}}
  </p>
  <p style="margin-top: 20px;"><strong>Itens</strong></p>
  <ul>{{ITEMS_HTML}}</ul>
  <p style="margin-top: 20px;"><strong>Entrega</strong><br>{{ADDRESS}}</p>
  <p style="margin-top: 24px;">
    <a href="{{ORDER_URL}}" style="display:inline-block;background:#111;color:#fff;padding:10px 16px;text-decoration:none;border-radius:4px;">
      Ver meus pedidos
    </a>
  </p>
  <p style="margin-top: 28px; font-size: 12px; color: #666;">Nativa Art</p>
</div>
$html$
),
(
  'order_received_merchant',
  'Pedido criado → loja',
  'Novo pedido #{{ORDER_SHORT_ID}} — {{TOTAL}}',
  $html$
<div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #222; line-height: 1.5;">
  <h1 style="font-size: 22px; margin-bottom: 8px;">Novo pedido na loja</h1>
  <p>Chegou um novo pedido.</p>
  <p>
    Pedido: <strong>#{{ORDER_SHORT_ID}}</strong><br>
    Cliente: {{CUSTOMER_NAME}}<br>
    Total: <strong>{{TOTAL}}</strong><br>
    Pagamento: {{PAYMENT_METHOD}}<br>
    Status: {{PAYMENT_STATUS}}
  </p>
  <p style="margin-top: 20px;"><strong>Itens</strong></p>
  <ul>{{ITEMS_HTML}}</ul>
  <p style="margin-top: 20px;"><strong>Endereço</strong><br>{{ADDRESS}}</p>
</div>
$html$
),
(
  'payment_approved',
  'Pagamento aprovado → cliente',
  'Pagamento confirmado — pedido {{ORDER_SHORT_ID}}',
  $html$
<div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #222; line-height: 1.5;">
  <h1 style="font-size: 22px; margin-bottom: 8px;">Pagamento confirmado</h1>
  <p>Olá, {{CUSTOMER_NAME}}!</p>
  <p>
    Confirmamos o pagamento do pedido <strong>#{{ORDER_SHORT_ID}}</strong>
    no valor de <strong>{{TOTAL}}</strong>.
  </p>
  <p>Já estamos preparando tudo para o envio.</p>
  <p style="margin-top: 20px;"><strong>Itens</strong></p>
  <ul>{{ITEMS_HTML}}</ul>
  <p style="margin-top: 24px;">
    <a href="{{ORDER_URL}}" style="display:inline-block;background:#111;color:#fff;padding:10px 16px;text-decoration:none;border-radius:4px;">
      Acompanhar pedido
    </a>
  </p>
  <p style="margin-top: 28px; font-size: 12px; color: #666;">Nativa Art</p>
</div>
$html$
)
on conflict (event) do nothing;
