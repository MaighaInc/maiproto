const client = require('prom-client');

const requestCounter = new client.Counter({
  name: 'api_requests_total',
  help: 'Total API requests',
});

module.exports = { client, requestCounter };