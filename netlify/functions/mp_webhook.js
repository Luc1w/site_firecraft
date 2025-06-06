const fetch = require("node-fetch");
const { RESEND_API_KEY, DISCORD_WEBHOOK_URL } = process.env;

exports.handler = async function (event) {
  try {
    const body = JSON.parse(event.body);
    const topic = body.type;
    const data = body.data;

    // Filtra apenas eventos de pagamento aprovado
    if (topic === "payment" && data?.id) {
      const paymentId = data.id;

      // Consulta o pagamento
      const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
        },
      });

      const paymentInfo = await mpResponse.json();

      if (paymentInfo.status === "approved") {
        const nickname = paymentInfo.additional_info?.items?.[0]?.title || "Desconhecido";
        const email = paymentInfo.payer?.email || "Sem Email";
        const produto = paymentInfo.additional_info?.items?.[0]?.description || "Sem Produto";
        const status = paymentInfo.status || "Desconhecido";

        // Envia para o Discord
        if (DISCORD_WEBHOOK_URL) {
          await fetch(DISCORD_WEBHOOK_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              embeds: [{
                title: "📦 Novo Pagamento Aprovado!",
                color: 0x2ecc71,
                fields: [
                  { name: "Jogador", value: nickname, inline: true },
                  { name: "Email", value: email, inline: true },
                  { name: "Produto", value: produto, inline: true },
                  { name: "Status", value: status, inline: true }
                ],
                timestamp: new Date().toISOString()
              }]
            })
          });
        }

        // Envia e-mail pelo Resend
        if (RESEND_API_KEY) {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${RESEND_API_KEY}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              from: "FireCraft <onboarding@resend.dev>",
              to: email,
              subject: "✅ Pagamento Aprovado – Fire Craft",
              html: `
                <h1>Olá ${nickname}!</h1>
                <p>Recebemos o seu pagamento do produto <strong>${produto}</strong>.</p>
                <p>Agora sua compra será validada pela equipe e aplicada no servidor.</p>
                <p>Obrigado por apoiar o Fire Craft!</p>
              `
            })
          });
        }
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true })
    };
  } catch (err) {
    console.error("Erro no webhook:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Erro interno" })
    };
  }
};
