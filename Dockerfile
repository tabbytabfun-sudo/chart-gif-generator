FROM ghcr.io/puppeteer/puppeteer:21.5.0

# 1. Switch to root to install dependencies
USER root
WORKDIR /usr/src/app

# 2. Tell Puppeteer to skip downloading Chrome (we use the built-in one)
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
# We let the base image set the executable path automatically

# 3. Install dependencies
COPY package.json ./
RUN npm install

# 4. Copy app files
COPY . .

# 5. CRITICAL: Give permission to the non-root user
RUN chown -R pptruser:pptruser /usr/src/app

# 6. Switch to the safe user to run Chrome
USER pptruser

CMD [ "node", "index.js" ]
