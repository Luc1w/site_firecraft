/**
 * mp_webhook.js
 *
 * Webhook que o Mercado Pago chama quando o pagamento muda de status.
 * Usa a mesma classe MercadoPago exportada por require("mercadopago").MercadoPago.
 */

const MercadoPagoSDK = require("mercadopago").MercadoPago;
const mp = new MercadoPagoSDK({
  access_token: process.env.MP_ACCESS_TOKEN,
});
const fetch = require("node-fetch");

exports.handler = async function (event) {
  try {
    const body = JSON.parse(event.body);
    // Se não for notificação de pagamento, ignora
    if (body.type !== "payment") {
      return { statusCode: 200, body: "Evento não é de pagamento" };
    }

    const paymentId = body.data.id;
    const paymentResponse = await mp.payment.findById(paymentId);
    const payment = paymentResponse.body;

    if (payment.status !== "approved") {
      return { statusCode: 200, body: "Pagamento não aprovado" };
    }

    // Esperamos que external_reference seja "nickname__timestamp"
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
