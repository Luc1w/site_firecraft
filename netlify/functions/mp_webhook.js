const fetch = require('node-fetch');
const mercadopago = require('mercadopago');

mercadopago.configure({
  access_token: process.env.MP_ACCESS_TOKEN,
});

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body);

    if (body.type !== 'payment') {
      return { statusCode: 200, body: 'Not a payment notification' };
    }

    const paymentId = body.data.id;
    if (!paymentId) return { statusCode: 400, body: 'Missing payment ID' };

    const payment = await mercadopago.payment.findById(paymentId);
    const data = payment.body;

    if (data.status === 'approved') {
      const email = data.payer?.email || 'Desconhecido';
      const produto = data.description || 'Desconhecido';
      let nickname = 'Desconhecido';

      if (typeof data.additional_info === 'string') {
        const match = data.additional_info.match(/nickname=([^&]+)/);
        if (match) nickname = decodeURIComponent(match[1]);
      }

      const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [
            {
              title: '✅ Pagamento Aprovado',
              color: 0x00ff00,
              fields: [
                { name: 'Jogador', value: nickname, inline: true },
                { name: 'Email', value: email, inline: true },
                { name: 'Produto', value: produto, inline: true },
                { name: 'Status', value: 'Aprovado' },
              ],
              timestamp: new Date(),
            },
          ],
        }),
      });
    }

    return { statusCode: 200, body: 'OK' };
  } catch (error) {
    console.error('❌ Erro no webhook:', error);
    return { statusCode: 500, body: 'Erro interno' };
  }
};
