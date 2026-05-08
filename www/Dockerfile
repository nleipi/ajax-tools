FROM debian:trixie AS builder
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

ARG version=v24.15.0

ENV UV_COMPILE_BYTECODE=1
ENV UV_LINK_MODE=copy
ENV UV_NO_DEV=1
ENV UV_PYTHON_INSTALL_DIR=/python
ENV UV_PYTHON_PREFERENCE=only-managed

RUN uv python install 3.12

RUN apt update -y && apt install curl -y \
&& curl -fsSL https://nodejs.org/dist/$version/node-$version-linux-x64.tar.gz -o node.tar.gz \
&& tar -xzvf node.tar.gz && rm node.tar.gz

ENV PATH="/node-$version-linux-x64/bin:$PATH"

WORKDIR /app

RUN --mount=type=cache,target=/root/.cache/uv \
    --mount=type=bind,source=uv.lock,target=uv.lock \
    --mount=type=bind,source=pyproject.toml,target=pyproject.toml \
    uv sync --locked --no-install-project --no-python-downloads

RUN --mount=type=cache,target=/root/.npm/_cacache \
    --mount=type=bind,source=package-lock.json,target=package-lock.json \
    --mount=type=bind,source=package.json,target=package.json \
    npm ci

COPY . /app

RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --locked

RUN npm run build > build.log

FROM debian:trixie

RUN apt update -y && apt install less -y

RUN groupadd --system --gid 999 nonroot \
 && useradd --system --gid 999 --uid 999 --create-home nonroot

COPY --from=builder /python /python

COPY --from=builder --chown=nonroot:nonroot --exclude=node_modules/ /app /app
COPY --from=builder --chown=nonroot:nonroot /app/build.log /app/build.log

ENV PATH="/app/.venv/bin:$PATH"

USER nonroot

WORKDIR /app

RUN python manage.py collectstatic --noinput

CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
