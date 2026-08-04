FROM python:3.12-slim-trixie AS libs_builder
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

ARG version=v24.15.0

ENV UV_COMPILE_BYTECODE=1
ENV UV_LINK_MODE=copy
ENV UV_NO_DEV=1
ENV UV_PYTHON_DOWNLOADS=0

WORKDIR /app/www

RUN --mount=type=cache,target=/root/.cache/uv \
    --mount=type=bind,source=www/uv.lock,target=uv.lock \
    --mount=type=bind,source=www/pyproject.toml,target=pyproject.toml \
    --mount=type=bind,source=www/pyproject.toml,target=pyproject.toml \
    uv sync --frozen --no-install-workspace

FROM libs_builder AS app_builder

COPY . /app

WORKDIR /app/www

RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --locked

FROM node:24-trixie-slim AS assets_builder

WORKDIR /app

RUN --mount=type=cache,target=/root/.npm/_cacache \
    --mount=type=bind,source=package-lock.json,target=package-lock.json \
    --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=ajt/package.json,target=ajt/package.json \
    --mount=type=bind,source=www/package.json,target=www/package.json \
    npm ci

COPY --from=app_builder --chown=nonroot:nonroot /app /app

WORKDIR /app/www

RUN npm run build

FROM python:3.12-slim-trixie

RUN groupadd --system --gid 999 nonroot \
 && useradd --system --gid 999 --uid 999 --create-home nonroot

COPY --from=libs_builder --chown=nonroot:nonroot /app/www /app/www

COPY --from=app_builder --chown=nonroot:nonroot /app/www/media /app/www/media

COPY --from=app_builder --chown=nonroot:nonroot /app/www /app/www

COPY --from=assets_builder --chown=nonroot:nonroot --exclude=**/node_modules /app/www /app/www

ENV PATH="/app/www/.venv/bin:$PATH"

USER nonroot

WORKDIR /app/www

CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
