const mercadopago = require("mercadopago");

exports.handler = async function (event) {
  console.log("create_preference chamado");

  const accessToken = process.env.MP_ACCESS_TOKEN;
  const siteUrl = process.env.SITE_URL;

  if (!accessToken || !siteUrl) {
    console.error("Variáveis de ambiente ausentes.");
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Variáveis de ambiente não configuradas." }),
    };
  }

  mercadopago.configure({
    access_token: accessToken,
  });

  try {
    const body = JSON.parse(event.body);
    const { nickname, email, produto } = body;

    console.log("Parâmetros recebidos:", body);

    let preco = 0;
    if (produto === "VIP") preco = 1;
    else if (produto === "VIP+") preco = 25;
    else if (produto === "VIP+ Permanente") preco = 50;
    else return { statusCode: 400, body: "Produto inválido" };

    const preference = {
      items: [{
        title: produto,
        quantity: 1,
        currency_id: "BRL",
        unit_price: preco
      }],
      back_urls: {
        success: `${siteUrl}sucesso.html`,
        failure: `${siteUrl}falha.html`,
      },
      auto_return: "approved",
      notification_url: `${siteUrl}.netlify/functions/mp_webhook`,
      payer: {
        email: email
      },
      description: produto,
      additional_info: {
        payer: {
          first_name: nickname
        }
      }
    };

    const response = await mercadopago.preferences.create(preference);

    return {
      statusCode: 200,
      body: JSON.stringify({ init_point: response.body.init_point })
    };

  } catch (error) {
    console.error("Erro em create_preference:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Erro ao criar preferência." })
    };
  }
};
