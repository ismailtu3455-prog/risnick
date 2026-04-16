FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN node -e "const fs=require('fs');const p='package.json';const b=fs.readFileSync(p);if(b[0]===0xEF&&b[1]===0xBB&&b[2]===0xBF){fs.writeFileSync(p,b.slice(3));console.log('Removed BOM from package.json');}" && npm run prisma:generate && npm run build

FROM node:20-alpine AS release
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm install --omit=dev
COPY --from=base /app/dist ./dist
COPY --from=base /app/prisma ./prisma
COPY --from=base /app/node_modules/.prisma ./node_modules/.prisma
COPY .env.example ./.env.example
EXPOSE 3000
CMD ["sh", "-c", "node dist/src/main.js"]
