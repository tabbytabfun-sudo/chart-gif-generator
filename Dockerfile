FROM ghcr.io/puppeteer/puppeteer:21.5.0

# 1. Switch to root to install system dependencies
USER root
WORKDIR /usr/src/app

# 2. Install libraries required for 'canvas' to build correctly
# This prevents the build from hanging/freezing
RUN apt-get update && apt-get install -y \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev

# 3. Skip Chrome download (we use the base image's Chrome)
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# 4. Install Node dependencies
COPY package.json ./
# We add --verbose so we can see exactly what it's doing
RUN npm install --build-from-source=false --verbose

# 5. Copy app files
COPY . .

# 6. Fix permissions for the safe user
RUN chown -R pptruser:pptruser /usr/src/app

# 7. Switch to safe user
USER pptruser

CMD [ "node", "index.js" ]
