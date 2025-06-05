const fetch = require('node-fetch');

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body);

    // Verificar se é um pagamento aprovado
    const { data, type } = body;

    if (type === 'payment' && data && data.id) {
      const content = {
        embeds: [
          {
            title: '🛒 Nova Compra Aprovada!',
            color: 0x00ff00,
            fields: [
              { name: 'ID do Pagamento', value: `${data.id}`, inline: true },
              { name: 'Tipo', value: type, inline: true },
            ],
            timestamp: new Date(),
          },
        ],
      };

      const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

      if (!webhookUrl.startsWith('http')) {
        throw new Error('Webhook URL inválida! Ela precisa ser uma URL absoluta.');
      }

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(content),
      });

      if (!response.ok) {
        throw new Error(`Falha ao enviar para Discord: ${response.statusText}`);
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Webhook processado com sucesso' }),
    };
  } catch (error) {
    console.error('Erro no webhook:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
