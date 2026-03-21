const { EventEmitter } = require('events');

const eventBus = new EventEmitter();
eventBus.setMaxListeners(100); // support many concurrent SSE clients

module.exports = eventBus;
