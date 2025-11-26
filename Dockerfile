FROM ghcr.io/puppeteer/puppeteer:21.5.0

# 1. Switch to root
USER root
WORKDIR /usr/src/app

# 2. FIX: Delete the broken Google Chrome repo list (Correct Filename)
RUN rm -f /etc/apt/sources.list.d/google-chrome.list
RUN rm -f /etc/apt/sources.list.d/google.list

# 3. Now install the libraries for 'canvas'
RUN apt-get update && apt-get install -y \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev

# 4. Skip Chrome download
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# 5. Install Node dependencies
COPY package.json ./
RUN npm install --build-from-source=false

# 6. Copy app files
COPY . .

# 7. Fix permissions
RUN chown -R pptruser:pptruser /usr/src/app

# 8. Switch to safe user
USER pptruser

CMD [ "node", "index.js" ]
