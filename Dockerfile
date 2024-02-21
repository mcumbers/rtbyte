# Use Node v18
FROM node:18.18

# Create app directory
WORKDIR /usr/app

# Copy/Cache source for building
COPY package*.json ./
COPY tsconfig*.json ./
COPY src ./src
COPY prisma ./prisma

# Install Deps & Build
RUN npm install --omit-dev
RUN npm run build

# Run
EXPOSE 4000
CMD ["npm","run","start"]
