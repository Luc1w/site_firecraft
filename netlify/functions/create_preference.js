/**
 * create_preference.js
 *
 * Cria uma preferência de pagamento no Mercado Pago, importando
 * o módulo da forma correta para que `new MercadoPagoSDK(...)` funcione.
 */

const mpPackage = require("mercadopago");
const MercadoPagoSDK = mpPackage.default || mpPackage; 
// Se cair em mpPackage.default (ESM), use isso, senão use mpPackage (CJS).

const mp = new MercadoPagoSDK(process.env.MP_ACCESS_TOKEN);

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Método não permitido" };
  }

  try {
    // DEBUG - remova depois
    console.log("create_preference chamado");
    console.log("MP_ACCESS_TOKEN definido?", !!process.env.MP_ACCESS_TOKEN);
    console.log("SITE_URL =", process.env.SITE_URL);
    console.log("Body raw:", event.body);

    const { nickname, email, produto } = JSON.parse(event.body);
    console.log("Parâmetros recebidos:", { nickname, email, produto });

    // Define o preço conforme o produto
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
      external_reference: external_reference,
      notification_url: `${process.env.SITE_URL}/.netlify/functions/mp_webhook`,
    };

    const response = await mp.preferences.create(preference);
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
