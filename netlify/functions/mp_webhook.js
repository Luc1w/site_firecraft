/**
 * mp_webhook.js
 *
 * Recebe notificações do Mercado Pago e envia mensagem ao Discord.
 * Também importa o SDK ajustando para o formato correto.
 */

const mpPackage = require("mercadopago");
const MercadoPagoSDK = mpPackage.default || mpPackage;
const mp = new MercadoPagoSDK(process.env.MP_ACCESS_TOKEN);

const fetch = require("node-fetch");

exports.handler = async function (event) {
  try {
    const body = JSON.parse(event.body);

    if (body.type !== "payment") {
      return { statusCode: 200, body: "Evento não é de pagamento" };
    }

    const paymentId = body.data.id;
    const paymentResponse = await mp.payment.findById(paymentId);
    const payment = paymentResponse.body;

    if (payment.status !== "approved") {
      return { statusCode: 200, body: "Pagamento não aprovado" };
    }

    // Espera que external_reference esteja no formato "nickname__timestamp"
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
