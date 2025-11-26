FROM ghcr.io/puppeteer/puppeteer:21.5.0

# Switch to root user
USER root

WORKDIR /usr/src/app

# --- THE FIX ---
# Tell Puppeteer: "Don't download Chrome, we already have it!"
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

# Copy package files
COPY package.json ./

# Install dependencies (This will be super fast now)
RUN npm install

# Copy the rest of your code
COPY . .

# Run the app
CMD [ "node", "index.js" ]
