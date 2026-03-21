// retry.js
const amqp = require('amqplib');

(async () => {
  const ch = await (await amqp.connect('amqp://localhost')).createChannel();

  await ch.assertExchange('retry_ex', 'direct');

  await ch.assertQueue('retry_q', {
    arguments: {
      'x-message-ttl': 5000, // 5 sec delay
      'x-dead-letter-exchange': '',
      'x-dead-letter-routing-key': 'main_q'
    }
  });

  await ch.assertQueue('main_q');

  ch.consume('main_q', msg => {
    console.log('Fail, retry later:', msg.content.toString());
    ch.sendToQueue('retry_q', msg.content);
    ch.ack(msg);
  });
})();