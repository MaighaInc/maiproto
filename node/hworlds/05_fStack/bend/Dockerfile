FROM node:20

# Create app directory
WORKDIR /app

# Install dependencies first (better layer caching)
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Expose API port
EXPOSE 4000

# Start the app
CMD ["node", "server.js"]