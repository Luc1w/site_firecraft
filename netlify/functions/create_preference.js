const mercadopago = require('mercadopago');

mercadopago.configure({
  access_token: process.env.MP_ACCESS_TOKEN,
});

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Método não permitido' };
  }

  try {
    const { nickname, email, produto } = JSON.parse(event.body);

    let price = 0;
    if (produto === 'VIP') price = 1;
    else if (produto === 'VIP+') price = 25;
    else if (produto === 'VIP+ Permanente') price = 50;
    else throw new Error('Produto inválido');

    const preference = {
      items: [
        {
          title: produto,
          quantity: 1,
          unit_price: price,
        },
      ],
      payer: {
        email,
      },
      back_urls: {
        success: `${process.env.SITE_URL}/success.html`,
        failure: `${process.env.SITE_URL}/failure.html`,
      },
      auto_return: 'approved',
      external_reference: `${nickname}__${Date.now()}`,
      notification_url: `${process.env.SITE_URL}/.netlify/functions/mp_webhook`,
    };

    const response = await mercadopago.preferences.create(preference);

    return {
      statusCode: 200,
      body: JSON.stringify({ init_point: response.body.init_point }),
    };
  } catch (error) {
    console.error('Erro ao criar preferência:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
