/**
 * create_preference.js
 *
 * Tenta importar o SDK do Mercado Pago cobrindo várias formas de exportação:
 *  - require("mercadopago").MercadoPago (classe CJS antiga)
 *  - require("mercadopago").default.MercadoPago (ESM)
 *  - require("mercadopago") como objeto flat com configure() ou configurations.setAccessToken()
 *
 * Uma vez inicializado, tenta chamar `preferences.create()` ou `createPreference()`,
 * dependendo do que estiver disponível.
 */

const mpPkg = require("mercadopago");

// 1) Descobre o “handler” correto para a biblioteca
let mercadopagoClient;
const token = process.env.MP_ACCESS_TOKEN;

// (a) Se existir mpPkg.MercadoPago, usamos como classe
if (mpPkg.MercadoPago && typeof mpPkg.MercadoPago === "function") {
  mercadopagoClient = new mpPkg.MercadoPago({ access_token: token });

// (b) Se existe mpPkg.default.MercadoPago (ESM em .default), usamos também
} else if (
  mpPkg.default &&
  mpPkg.default.MercadoPago &&
  typeof mpPkg.default.MercadoPago === "function"
) {
  mercadopagoClient = new mpPkg.default.MercadoPago({ access_token: token });

// (c) Se mpPkg.default existe diretamente como “cliente” (módulo ESM)
} else if (mpPkg.default && typeof mpPkg.default === "object") {
  mercadopagoClient = mpPkg.default;
  // configurar token via configurações ESM
  if (
    mercadopagoClient.configurations &&
    typeof mercadopagoClient.configurations.setAccessToken === "function"
  ) {
    mercadopagoClient.configurations.setAccessToken(token);
  } else if (typeof mercadopagoClient.configure === "function") {
    mercadopagoClient.configure({ access_token: token });
  } else {
    throw new Error(
      "SDK Mercado Pago: não encontrou método para setar o token em mpPkg.default"
    );
  }

// (d) Se mpPkg for diretamente o objeto “flat” (CJS), configuramos também
} else if (typeof mpPkg === "object") {
  mercadopagoClient = mpPkg;
  if (
    mercadopagoClient.configurations &&
    typeof mercadopagoClient.configurations.setAccessToken === "function"
  ) {
    mercadopagoClient.configurations.setAccessToken(token);
  } else if (typeof mercadopagoClient.configure === "function") {
    mercadopagoClient.configure({ access_token: token });
  } else {
    throw new Error(
      "SDK Mercado Pago: não encontrou método para setar o token em mpPkg"
    );
  }

} else {
  throw new Error("Impossível importar SDK Mercado Pago (formato desconhecido)");
}

// 2) Função “helper” para criar uma preferência, testando várias assinaturas:
async function criarPreferencia(preferenceData) {
  // (a) Se existir mercadopagoClient.preferences.create, usamos
  if (
    mercadopagoClient.preferences &&
    typeof mercadopagoClient.preferences.create === "function"
  ) {
    return await mercadopagoClient.preferences.create(preferenceData);
  }
  // (b) Se existir método alternativo `createPreference`
  if (typeof mercadopagoClient.createPreference === "function") {
    return await mercadopagoClient.createPreference(preferenceData);
  }
  // (c) Se existir `create` direto
  if (typeof mercadopagoClient.create === "function") {
    return await mercadopagoClient.create(preferenceData);
  }
  throw new Error("SDK Mercado Pago: não encontrou método para criar preferência");
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

    const response = await criarPreferencia(preference);
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
