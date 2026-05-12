FROM node:24-trixie

WORKDIR /app

RUN --mount=type=cache,target=/root/.npm/_cacache \
    --mount=type=bind,source=package-lock.json,target=package-lock.json \
    --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=ajt/package.json,target=ajt/package.json \
    --mount=type=bind,source=www/package.json,target=www/package.json \
    npm ci

COPY . /app

CMD ["npm", "run", "watch"]
