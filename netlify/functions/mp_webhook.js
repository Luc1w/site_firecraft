import mercadopago from 'mercadopago';
import fetch from 'node-fetch';

mercadopago.configure({
  access_token: process.env.MP_ACCESS_TOKEN,
});

export async function handler(event) {
  try {
    const body = JSON.parse(event.body);
    if (body.type !== 'payment') {
      return { statusCode: 200, body: 'Evento não é de pagamento' };
    }

    const payment = await mercadopago.payment.findById(body.data.id);
    if (payment.response.status !== 'approved') {
      return { statusCode: 200, body: 'Pagamento não aprovado' };
    }

    const [nickname] = payment.response.external_reference.split('__');

    const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL;
    const payload = {
      content: `🛒 **Nova compra aprovada!**
• Nick: **${nickname}**
• Email: **${payment.response.payer.email}**
• Produto: **${payment.response.description || '—'}**
• Valor: **R$ ${payment.response.transaction_amount.toFixed(2)}**
• Status: **Aprovado ✅**`,
    };

    await fetch(discordWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    return { statusCode: 200, body: 'Notificação enviada ao Discord' };
  } catch (error) {
    console.error('Erro no webhook:', error);
    return { statusCode: 500, body: 'Erro interno' };
  }
}
