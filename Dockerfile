FROM node:24-bookworm-slim

WORKDIR /app

COPY package.json ./
COPY frontend/package.json frontend/package.json
COPY backend/package.json backend/package.json

RUN npm install

COPY . .

RUN npm run build && npx prisma generate --schema backend/prisma/schema.prisma

EXPOSE 5000

CMD ["npm", "start"]
