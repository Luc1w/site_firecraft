/**
 * mp_webhook.js
 *
 * Webhook para notificações do Mercado Pago. 
 * Importa mercadopago de forma “flat” e busca o pagamento aprovado.
 */

const mercadopago = require("mercadopago");
const fetch = require("node-fetch");

// 1) Configura token do mesmo jeito que em create_preference.js
const token = process.env.MP_ACCESS_TOKEN;
if (typeof mercadopago.configure === "function") {
  mercadopago.configure({ access_token: token });
} else if (
  mercadopago.configurations &&
  typeof mercadopago.configurations.setAccessToken === "function"
) {
  mercadopago.configurations.setAccessToken(token);
} else {
  throw new Error("Não foi possível configurar o token do Mercado Pago (webhook)");
}

// 2) Helper para buscar pagamento por ID (usa mercadopago.payment.findById)
async function buscarPagamentoPorId(paymentId) {
  if (
    mercadopago.payment &&
    typeof mercadopago.payment.findById === "function"
  ) {
    return await mercadopago.payment.findById(paymentId);
  }
  // Em alguns casos, o método pode ser diferente:
  if (typeof mercadopago.getPaymentById === "function") {
    return await mercadopago.getPaymentById(paymentId);
  }
  throw new Error("SDK Mercado Pago: método para buscar pagamento não encontrado");
}

exports.handler = async function (event) {
  try {
    const body = JSON.parse(event.body);
    // Se não for notificação de pagamento, ignoramos
    if (body.type !== "payment") {
      return { statusCode: 200, body: "Evento não é de pagamento" };
    }

    const paymentId = body.data.id;
    const paymentResponse = await buscarPagamentoPorId(paymentId);
    // Em versões do SDK, o objeto final pode estar em response.body
    const payment = paymentResponse.body || paymentResponse;

    if (payment.status !== "approved") {
      return { statusCode: 200, body: "Pagamento não aprovado" };
    }

    // Espera que o external_reference tenha formato: "nickname__timestamp"
    const [nickname, timestamp] = payment.external_reference.split("__");
    const dataPagamento = new Date(payment.date_approved);

    // Monta mensagem para o Discord
    const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL;
    const payloadDiscord = {
      content: `🛒 **Nova compra aprovada!**
• Nick do Minecraft: **${nickname}**
• E-mail: **${payment.payer.email}**
• Produto: **${payment.description || "—"}**
• Valor: **R$ ${payment.transaction_amount.toFixed(2)}**
• Data/Hora: **${dataPagamento.toLocaleString("pt-BR")}**`,
    };

    // Envia mensagem para o seu webhook do Discord
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
