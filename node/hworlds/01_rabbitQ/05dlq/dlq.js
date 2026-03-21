// dlq.js
const amqp = require('amqplib');

(async () => {
  const ch = await (await amqp.connect('amqp://localhost:5672')).createChannel();

  await ch.assertExchange('dlx', 'direct');

  await ch.assertQueue('main_q', {
    arguments: { 'x-dead-letter-exchange': 'dlx' }
  });

  await ch.assertQueue('dead_q');
  await ch.bindQueue('dead_q', 'dlx', '');

  ch.consume('main_q', msg => {
    console.log('Rejecting:', msg.content.toString());
    ch.nack(msg, false, false); // send to DLQ
  });
})();