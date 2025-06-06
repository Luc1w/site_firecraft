const mercadopago = require('mercadopago');

exports.handler = async function (event, context) {
  console.log("create_preference chamado");

  const mpToken = process.env.MP_ACCESS_TOKEN;
  const siteUrl = process.env.SITE_URL;

  if (!mpToken || !siteUrl) {
    console.error("Token do Mercado Pago ou SITE_URL não configurado.");
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "MP_ACCESS_TOKEN ou SITE_URL não configurado." }),
    };
  }

  mercadopago.configure({
    access_token: mpToken,
  });

  try {
    const { nickname, email, produto } = JSON.parse(event.body);
    console.log("Parâmetros recebidos:", { nickname, email, produto });

    const valores = {
      VIP: 10.00,
      "VIP+": 25.00,
      "VIP+ Permanente": 50.00,
    };

    const valor = valores[produto];
    if (!valor) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Produto inválido." }),
      };
    }

    const preference = {
      items: [{
        title: produto,
        quantity: 1,
        unit_price: valor,
      }],
      back_urls: {
        success: `${siteUrl}/sucesso.html`,
        failure: `${siteUrl}/falha.html`,
        pending: `${siteUrl}/pendente.html`,
      },
      auto_return: "approved",
      notification_url: `${siteUrl}/.netlify/functions/mp_webhook`,
      metadata: {
        nickname,
        email,
        produto
      }
    };

    const response = await mercadopago.preferences.create(preference);

    return {
      statusCode: 200,
      body: JSON.stringify({ init_point: response.body.init_point }),
    };

  } catch (error) {
    console.error("Erro em create_preference:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Erro ao criar preferência." }),
    };
  }
};
