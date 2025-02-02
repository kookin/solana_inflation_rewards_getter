# Use an AMD64 base image
FROM --platform=linux/amd64 node:18-alpine

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the entire project into the container
COPY . .

# Expose the server port
EXPOSE 3000

# Start both the data-fetching script and the server
CMD ["sh", "-c", "node inflation-getter.js & node server.js"]
