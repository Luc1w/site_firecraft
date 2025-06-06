const fetch = require('node-fetch');
const mercadopago = require('mercadopago');

exports.handler = async function (event, context) {
  console.log("Webhook recebido:", event.body);

  try {
    const body = JSON.parse(event.body);

    if (!body || !body.data || !body.data.id) {
      console.log("Webhook sem dados de pagamento.");
      return { statusCode: 200, body: "OK" };
    }

    const paymentId = body.data.id;

    mercadopago.configure({
      access_token: process.env.MP_ACCESS_TOKEN,
    });

    const pagamento = await mercadopago.payment.findById(paymentId);
    const dados = pagamento.response;

    const nickname = dados.metadata?.nickname || 'Desconhecido';
    const email = dados.metadata?.email || 'Desconhecido';
    const produto = dados.metadata?.produto || 'Desconhecido';
    const status = dados.status;

    const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (!discordWebhookUrl?.startsWith("http")) {
      throw new Error("Webhook URL inválida");
    }

    const mensagem = {
      content: `**Novo pagamento aprovado!**`,
      embeds: [{
        title: "💰 Pagamento Recebido",
        color: 0x00ff00,
        fields: [
          { name: "Jogador", value: nickname, inline: true },
          { name: "Email", value: email, inline: true },
          { name: "Produto", value: produto, inline: true },
          { name: "Status", value: status, inline: true },
        ],
        timestamp: new Date().toISOString(),
      }],
    };

    await fetch(discordWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mensagem),
    });

    return {
      statusCode: 200,
      body: "Notificação processada com sucesso",
    };

  } catch (error) {
    console.error("Erro no webhook:", error);
    return {
      statusCode: 500,
      body: "Erro ao processar webhook",
    };
  }
};
