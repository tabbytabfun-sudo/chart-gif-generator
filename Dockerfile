FROM ghcr.io/puppeteer/puppeteer:21.5.0

# Switch to root user to install your app
USER root

WORKDIR /usr/src/app

# Copy package files
COPY package.json ./

# Install dependencies (Chrome is already in the base image, so this is fast)
RUN npm install

# Copy the rest of your code
COPY . .

# Run the app
CMD [ "node", "index.js" ]
