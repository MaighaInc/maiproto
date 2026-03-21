// topic_sub.js
const amqp = require('amqplib');

(async () => {
  const ch = await (await amqp.connect('amqp://localhost:5672')).createChannel();
  const ex = 'topic_logs';
  await ch.assertExchange(ex, 'topic', { durable: false });

  const q = await ch.assertQueue('', { exclusive: true });
  await ch.bindQueue(q.queue, ex, 'user.*');

  ch.consume(q.queue, msg => {
    console.log('User event:', msg.content.toString());
  }, { noAck: true });
})();