// direct_sub.js
const amqp = require('amqplib');

(async () => {
  const ch = await (await amqp.connect('amqp://localhost:5672')).createChannel();
  const ex = 'logs_direct';
  await ch.assertExchange(ex, 'direct', { durable: false });

  const q = await ch.assertQueue('', { exclusive: true });
  await ch.bindQueue(q.queue, ex, 'error');

  ch.consume(q.queue, msg => {
    console.log('Error only:', msg.content.toString());
  }, { noAck: true });
})();