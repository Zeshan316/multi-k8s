FROM node:alpine3.18 as builder


WORKDIR /app

COPY ./package.json ./
RUN npm install -g pnpm
RUN pnpm install

COPY . .
RUN pnpm run build


FROM nginx
EXPOSE 3000
COPY ./nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/build /usr/share/nginx/html