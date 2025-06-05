const fetch = require('node-fetch');

exports.handler = async (event) => {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

  if (!webhookUrl || !webhookUrl.startsWith('https://')) {
    console.error('Webhook não configurado corretamente.');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Webhook não configurado corretamente.' }),
    };
  }

  try {
    const body = JSON.parse(event.body);
    const id = body?.data?.id || 'Sem ID';
    const type = body?.type || 'Desconhecido';

    const content = {
      embeds: [
        {
          title: '🛒 Nova Compra!',
          color: 0x00ff00,
          fields: [
            { name: 'ID do Pagamento', value: id, inline: true },
            { name: 'Tipo', value: type, inline: true },
          ],
          timestamp: new Date(),
        },
      ],
    };

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(content),
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Notificação enviada ao Discord' }),
    };
  } catch (error) {
    console.error('Erro no webhook:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
