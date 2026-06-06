FROM node:20-alpine

WORKDIR /app

# Installer les dépendances d'abord (cache Docker)
COPY package*.json ./
RUN npm ci --only=production

# Copier le code
COPY . .

# Créer le dossier logs
RUN mkdir -p logs

EXPOSE 3001

CMD ["node", "server.js"]
