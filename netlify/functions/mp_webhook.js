const fetch = require('node-fetch');
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

exports.handler = async function (event) {
  try {
    const body = JSON.parse(event.body);
    const paymentId = body.data?.id;

    if (!paymentId) throw new Error("ID do pagamento não encontrado");

    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`
      }
    });

    const paymentData = await mpResponse.json();

    const metadata = paymentData.metadata || {};
    const nickname = metadata.nickname || "Desconhecido";
    const email = metadata.email || "Desconhecido";
    const produto = metadata.produto || "Desconhecido";

    // Enviar mensagem ao Discord
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (webhookUrl?.startsWith("http")) {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [{
            title: "✅ Pagamento Aprovado",
            color: 0x00ff00,
            fields: [
              { name: "Jogador", value: nickname, inline: true },
              { name: "Email", value: email, inline: true },
              { name: "Produto", value: produto, inline: true },
              { name: "Status", value: "Aprovado", inline: true }
            ],
            timestamp: new Date().toISOString()
          }]
        })
      });
    }

    // Enviar e-mail via Resend
    await resend.emails.send({
      from: 'FireCraft <suporte@firecraft.com>',
      to: email,
      subject: 'Pagamento aprovado!',
      html: `
        <p>Olá <strong>${nickname}</strong>,</p>
        <p>Seu pagamento para o VIP <strong>${produto}</strong> foi confirmado com sucesso.</p>
        <p>Obrigado por apoiar o Fire Craft!</p>
      `
    });

    return { statusCode: 200, body: 'OK' };
  } catch (err) {
    console.error("Erro no webhook:", err);
    return { statusCode: 500, body: 'Erro interno no webhook' };
  }
};
