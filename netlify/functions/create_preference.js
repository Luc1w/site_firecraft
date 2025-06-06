const fetch = require('node-fetch');
const mercadopago = require('mercadopago');

mercadopago.configure({ access_token: process.env.MP_ACCESS_TOKEN });

exports.handler = async (event) => {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  const siteUrl = process.env.SITE_URL;

  try {
    const body = JSON.parse(event.body);
    const { nickname, email, produto } = body;

    const preference = {
      items: [
        {
          title: produto,
          unit_price: produto === 'VIP' ? 10 :
                      produto === 'VIP+' ? 25 : 50,
          quantity: 1,
        },
      ],
      back_urls: {
        success: `${siteUrl}/sucesso.html`,
        failure: `${siteUrl}/erro.html`,
        pending: `${siteUrl}/pendente.html`,
      },
      auto_return: 'approved',
      payer: {
        email: email,
      },
      metadata: {
        nickname: nickname,
        produto: produto
      },
      description: produto,
    };

    const response = await mercadopago.preferences.create(preference);
    const initPoint = response.body.init_point;

    // Notifica no Discord
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [
          {
            title: '🛒 Nova tentativa de compra!',
            color: 0x00ff00,
            fields: [
              { name: 'Nickname', value: nickname, inline: true },
              { name: 'Email', value: email, inline: true },
              { name: 'Produto', value: produto, inline: true },
              { name: 'Status', value: 'Aguardando pagamento...', inline: true },
            ],
            timestamp: new Date(),
          },
        ],
      }),
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ init_point: initPoint }),
    };
  } catch (error) {
    console.error('Erro:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
