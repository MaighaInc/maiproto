const { kafka, TOPIC } = require('../kafka');
const { insertMessage, updateMessage, deleteMessage } = require('../db');
const eventBus = require('../eventBus');

async function startDbConsumer() {
  const consumer = kafka.consumer({ groupId: 'db-group' });
  await consumer.connect();
  await consumer.subscribe({ topic: TOPIC, fromBeginning: true });

  consumer.run({
    eachMessage: async ({ message }) => {
      const event = JSON.parse(message.value.toString());
      console.log('[DB Consumer] received:', event.type);

      if (event.type === 'message.created') {
        await insertMessage(event.content);
      } else if (event.type === 'message.updated') {
        await updateMessage(event.id, event.content);
      } else if (event.type === 'message.deleted') {
        await deleteMessage(event.id);
      }

      // Notify all SSE clients that DB has been updated
      eventBus.emit('db-updated', { type: event.type });
    },
  });

  console.log('[DB Consumer] started');
}

module.exports = { startDbConsumer };
