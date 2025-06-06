const mercadopago = require("mercadopago");
const fetch = require("node-fetch");

exports.handler = async function (event) {
  try {
    const accessToken = process.env.MP_ACCESS_TOKEN;
    const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL;

    if (!accessToken || !discordWebhookUrl) {
      throw new Error("Variáveis de ambiente não configuradas.");
    }

    mercadopago.configure({ access_token: accessToken });

    const body = JSON.parse(event.body);
    const paymentId = body.data?.id;

    if (!paymentId) {
      throw new Error("ID do pagamento não encontrado.");
    }

    const payment = await mercadopago.payment.findById(paymentId);
    const paymentData = payment.body;

    if (paymentData.status !== "approved") {
      return { statusCode: 200, body: "Pagamento não aprovado." };
    }

    const nickname = paymentData.additional_info?.payer?.first_name || "Desconhecido";
    const email = paymentData.payer?.email || "Não informado";
    const produto = paymentData.description || "Não especificado";

    const discordPayload = {
      embeds: [
        {
          title: "✅ Pagamento Aprovado",
          color: 3066993,
          fields: [
            { name: "Jogador", value: nickname, inline: true },
            { name: "Email", value: email, inline: true },
            { name: "Produto", value: produto, inline: true },
            { name: "Status", value: paymentData.status, inline: true }
          ],
          timestamp: new Date().toISOString()
        }
      ]
    };

    await fetch(discordWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(discordPayload)
    });

    return { statusCode: 200, body: "Notificação enviada com sucesso." };

  } catch (error) {
    console.error("Erro no webhook:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Erro no Webhook" })
    };
  }
};
