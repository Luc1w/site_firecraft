const mercadopago = require("mercadopago");

exports.handler = async function (event) {
  console.log("create_preference chamado");

  // Variáveis de ambiente
  const accessToken = process.env.MP_ACCESS_TOKEN;
  const siteUrl = process.env.SITE_URL;

  if (!accessToken || !siteUrl) {
    return {
      statusCode: 500,
      body: "Chaves de ambiente não configuradas corretamente",
    };
  }

  mercadopago.configure({
    access_token: accessToken,
  });

  try {
    const body = JSON.parse(event.body);
    const { nickname, email, produto } = body;

    if (!nickname || !email || !produto) {
      return {
        statusCode: 400,
        body: "Campos obrigatórios não preenchidos",
      };
    }

    const preference = {
      items: [
        {
          title: nickname,
          quantity: 1,
          unit_price: produto === "VIP+" ? 25 :
                       produto === "VIP+ Permanente" ? 50 : 10,
          description: produto
        }
      ],
      payer: {
        email: email
      },
      back_urls: {
        success: `${siteUrl}sucesso.html`,
        failure: `${siteUrl}erro.html`,
        pending: `${siteUrl}pendente.html`
      },
      auto_return: "approved",
      notification_url: `${siteUrl}.netlify/functions/mp_webhook`
    };

    const response = await mercadopago.preferences.create(preference);
    return {
      statusCode: 200,
      body: JSON.stringify({ init_point: response.body.init_point })
    };
  } catch (err) {
    console.error("Erro em create_preference:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Erro ao criar preferência" })
    };
  }
};
