FROM node:22-alpine
RUN apk add --no-cache ffmpeg
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY . .
EXPOSE 3000
CMD ["node", "--expose-gc", "--max-old-space-size=128", "--optimize-for-size", "src/app.js"]
