FROM node:16-bullseye

WORKDIR /usr/src/blacklistener

COPY package*.json ./

RUN npm install

COPY . .

CMD ["node", "index.js"]
