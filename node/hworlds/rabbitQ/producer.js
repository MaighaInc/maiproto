const amqp = require('amqplib');

async function sendMessage() {
  try {
    const connection = await amqp.connect('amqp://localhost:5672');
    const channel = await connection.createChannel();

    const queue = 'task_queue';

    await channel.assertQueue(queue, { durable: true });

    const msg = process.argv.slice(2).join(' ') || 'Hello RabbitMQ';

    channel.sendToQueue(queue, Buffer.from(msg), {
      persistent: true // message survives restart
    });

    console.log("Sent:", msg);

    setTimeout(() => {
      connection.close();
      process.exit(0);
    }, 500);
  } catch (err) {
    console.error(err);
  }
}

sendMessage();