const fetch = require('node-fetch');
const mercadopago = require('mercadopago');

mercadopago.configure({
  access_token: process.env.MP_ACCESS_TOKEN,
});

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body);

    // Garante que é uma notificação de pagamento
    if (body.type !== 'payment') {
      return { statusCode: 200, body: 'Not a payment notification' };
    }

    const paymentId = body.data.id;

    if (!paymentId) {
      console.error('❌ ID de pagamento ausente');
      return { statusCode: 400, body: 'Missing payment ID' };
    }

    // Busca detalhes do pagamento
    const payment = await mercadopago.payment.findById(paymentId);
    const paymentData = payment.body;

    // Só envia se o pagamento estiver aprovado
    if (paymentData.status === 'approved') {
      const nickname = paymentData.additional_info?.payer?.first_name || 'Desconhecido';
      const email = paymentData.payer?.email || 'Email não informado';
      const produto = paymentData.description || 'Produto não especificado';

      // Envia pro Discord
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

    return { statusCode: 200, body: 'Webhook recebido com sucesso' };
  } catch (error) {
    console.error('❌ Erro no webhook:', error);
    return { statusCode: 500, body: 'Erro interno' };
  }
};
