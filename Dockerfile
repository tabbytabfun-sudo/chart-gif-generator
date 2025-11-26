FROM ghcr.io/puppeteer/puppeteer:21.5.0

# 1. Switch to root
USER root
WORKDIR /usr/src/app

# 2. Skip Chrome download (we use the base image's Chrome)
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# 3. Install Node dependencies
COPY package.json ./
# This will now be super fast because we removed 'canvas'
RUN npm install

# 4. Copy app files
COPY . .

# 5. Fix permissions
RUN chown -R pptruser:pptruser /usr/src/app

# 6. Switch to safe user
USER pptruser

CMD [ "node", "index.js" ]
