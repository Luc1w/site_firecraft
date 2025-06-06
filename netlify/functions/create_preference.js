const mercadopago = require('mercadopago');

mercadopago.configure({
  access_token: process.env.MP_ACCESS_TOKEN
});

exports.handler = async function (event, context) {
  console.log("create_preference chamado");

  const { nickname, email, produto } = JSON.parse(event.body || '{}');
  const SITE_URL = process.env.SITE_URL || 'https://fire-craft.netlify.app';

  const valores = {
    'VIP': 10,
    'VIP+': 25,
    'VIP+ Permanente': 50
  };

  const price = valores[produto] || 0;
  if (!price) return { statusCode: 400, body: 'Produto inválido' };

  const preference = {
    items: [{
      title: `Compra de ${produto} – Fire Craft`,
      quantity: 1,
      unit_price: price
    }],
    back_urls: {
      success: `${SITE_URL}/sucesso.html`,
      failure: `${SITE_URL}/erro.html`,
      pending: `${SITE_URL}/aguardando.html`
    },
    auto_return: "approved",
    metadata: {
      nickname,
      email,
      produto
    }
  };

  try {
    const response = await mercadopago.preferences.create(preference);
    return {
      statusCode: 200,
      body: JSON.stringify({ init_point: response.body.init_point })
    };
  } catch (error) {
    console.error("Erro ao criar preferência:", error);
    return { statusCode: 500, body: 'Erro ao criar link de pagamento' };
  }
};
