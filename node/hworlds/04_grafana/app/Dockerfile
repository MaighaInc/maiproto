FROM node:18

WORKDIR /app
COPY server.js .

RUN npm init -y && npm install express prom-client

EXPOSE 3001
CMD ["node", "server.js"]