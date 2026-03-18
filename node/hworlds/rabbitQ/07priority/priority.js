// priority.js
const amqp = require('amqplib');

(async () => {
  const ch = await (await amqp.connect('amqp://localhost')).createChannel();

  await ch.assertQueue('priority_q', {
    maxPriority: 10
  });

  // send low priority
  ch.sendToQueue('priority_q', Buffer.from('low'), { priority: 1 });

  // send high priority
  ch.sendToQueue('priority_q', Buffer.from('HIGH'), { priority: 9 });

  ch.consume('priority_q', msg => {
    console.log('Received:', msg.content.toString());
  }, { noAck: true });
})();