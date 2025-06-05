/**
 * create_preference.js
 *
 * Cria uma preferência de pagamento no Mercado Pago usando
 * o “flat import” (require("mercadopago")) e chamando direto
 * mercadopago.preferences.create(...)
 */

const mercadopago = require("mercadopago");

// 1) Configura o token de acesso de forma dinâmica:
const token = process.env.MP_ACCESS_TOKEN;
if (typeof mercadopago.configure === "function") {
  // Versões intermediárias (SDK antigo) usam configure({ access_token: ... })
  mercadopago.configure({ access_token: token });
} else if (
  mercadopago.configurations &&
  typeof mercadopago.configurations.setAccessToken === "function"
) {
  // Versões mais recentes usam configurations.setAccessToken()
  mercadopago.configurations.setAccessToken(token);
} else {
  throw new Error("Não foi possível configurar o token do Mercado Pago");
}

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Método não permitido" };
  }

  try {
    console.log("create_preference chamado");
    console.log("MP_ACCESS_TOKEN está definido?", !!process.env.MP_ACCESS_TOKEN);
    console.log("SITE_URL =", process.env.SITE_URL);
    console.log("Body raw:", event.body);

    const { nickname, email, produto } = JSON.parse(event.body);
    console.log("Parâmetros recebidos:", { nickname, email, produto });

    let price;
    if (produto === "VIP") price = 10.0;
    else if (produto === "VIP+") price = 25.0;
    else if (produto === "VIP+ Permanente") price = 50.0;
    else throw new Error("Produto inválido");

    const external_reference = `${nickname}__${Date.now()}`;

    const preference = {
      items: [
        {
          title: produto,
          unit_price: price,
          quantity: 1,
          currency_id: "BRL",
        },
      ],
      payer: {
        email: email,
      },
      back_urls: {
        success: `${process.env.SITE_URL}/success.html`,
        failure: `${process.env.SITE_URL}/failure.html`,
      },
      auto_return: "approved",
      external_reference,
      notification_url: `${process.env.SITE_URL}/.netlify/functions/mp_webhook`,
    };

    // 2) Cria a preferência através de mercadopago.preferences.create(...)
    const response = await mercadopago.preferences.create(preference);
    const init_point = response.body.init_point;

    return {
      statusCode: 200,
      body: JSON.stringify({ init_point }),
    };
  } catch (err) {
    console.error("Erro em create_preference:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
