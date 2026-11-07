FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN mkdir -p data uploads backups && chown -R node:node /app
ENV NODE_ENV=production PORT=3000
# Mount persistent volumes on these three folders or everything is lost on redeploy
VOLUME ["/app/data","/app/uploads","/app/backups"]
EXPOSE 3000
USER node
CMD ["node","server.js"]
