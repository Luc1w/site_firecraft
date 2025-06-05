/**
 * mp_webhook.js
 *
 * Recebe notificação do Mercado Pago e envia mensagem ao Discord.
 * Também detecta múltiplas formas de importar/configurar o SDK.
 */

const mpPkg = require("mercadopago");

// Mesma lógica de importação que em create_preference.js
let mercadopagoClient;
const token = process.env.MP_ACCESS_TOKEN;

if (mpPkg.MercadoPago && typeof mpPkg.MercadoPago === "function") {
  mercadopagoClient = new mpPkg.MercadoPago({ access_token: token });
} else if (
  mpPkg.default &&
  mpPkg.default.MercadoPago &&
  typeof mpPkg.default.MercadoPago === "function"
) {
  mercadopagoClient = new mpPkg.default.MercadoPago({ access_token: token });
} else if (mpPkg.default && typeof mpPkg.default === "object") {
  mercadopagoClient = mpPkg.default;
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
    throw new Error("SDK Mercado Pago: não encontrou método para setar token");
  }
} else {
  throw new Error("Impossível importar SDK Mercado Pago (formato desconhecido)");
}

// Função auxiliar para buscar pagamento por ID
async function buscarPagamentoPorId(paymentId) {
  // Se existir mercadopagoClient.payment.findById
  if (
    mercadopagoClient.payment &&
    typeof mercadopagoClient.payment.findById === "function"
  ) {
    return await mercadopagoClient.payment.findById(paymentId);
  }
  // Se existir método alternativo
  if (typeof mercadopagoClient.getPaymentById === "function") {
    return await mercadopagoClient.getPaymentById(paymentId);
  }
  throw new Error("SDK Mercado Pago: método para buscar pagamento não encontrado");
}

const fetch = require("node-fetch");

exports.handler = async function (event) {
  try {
    const body = JSON.parse(event.body);
    if (body.type !== "payment") {
      return { statusCode: 200, body: "Evento não é de pagamento" };
    }

    const paymentId = body.data.id;
    const paymentResponse = await buscarPagamentoPorId(paymentId);
    const payment = paymentResponse.body || paymentResponse; 
    // Alguns retornos já devolvem o objeto diretamente em .body, outros não

    if (payment.status !== "approved") {
      return { statusCode: 200, body: "Pagamento não aprovado" };
    }

    const [nickname, timestamp] = payment.external_reference.split("__");
    const dataPagamento = new Date(payment.date_approved);

    const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL;
    const payloadDiscord = {
      content: `🛒 **Nova compra aprovada!**
• Nick do Minecraft: **${nickname}**
• E-mail: **${payment.payer.email}**
• Produto: **${payment.description || "—"}**
• Valor: **R$ ${payment.transaction_amount.toFixed(2)}**
• Data/Hora: **${dataPagamento.toLocaleString("pt-BR")}**`,
    };

    await fetch(discordWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payloadDiscord),
    });

    return { statusCode: 200, body: "Notificação enviada ao Discord" };
  } catch (err) {
    console.error("Erro no webhook do Mercado Pago:", err);
    return { statusCode: 500, body: "Erro interno" };
  }
};
