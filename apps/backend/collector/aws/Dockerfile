FROM public.ecr.aws/lambda/nodejs:22 AS base

# Playwright Chromium の依存ライブラリ + 日本語フォント
RUN dnf install -y \
    nss atk at-spi2-atk cups-libs libdrm libxkbcommon \
    libXcomposite libXdamage libXfixes libXrandr mesa-libgbm \
    pango cairo alsa-lib google-noto-sans-cjk-jp-fonts && \
    dnf clean all

# pnpm をインストール
RUN corepack enable

WORKDIR ${LAMBDA_TASK_ROOT}

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/models/package.json packages/models/
COPY apps/backend/collector/package.json apps/backend/collector/
RUN pnpm install --frozen-lockfile

# models をビルド
COPY packages/models/ packages/models/
RUN pnpm --filter @sho/models build

# collector をビルド (tsdown)
COPY apps/backend/collector/ apps/backend/collector/
RUN pnpm --filter collector build

# Playwright Chromium をインストール
ENV PLAYWRIGHT_BROWSERS_PATH=${LAMBDA_TASK_ROOT}/pw-browsers
RUN pnpm --filter collector exec playwright install chromium

CMD ["apps/backend/collector/dist/job-number-handler.handler"]
