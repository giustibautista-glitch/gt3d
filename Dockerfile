FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production PORT=3000 GT3D_DATA_DIR=/tmp/gt3d-demo GT3D_DEMO_MODE=1
COPY package.json index.html styles.css app.js server.js ./
COPY assets ./assets
RUN mkdir -p /tmp/gt3d-demo && chown -R node:node /tmp/gt3d-demo /app
USER node
EXPOSE 3000
# Además se deben establecer ADMIN_PASSWORD y SESSION_SECRET en el proveedor.
CMD ["node","server.js"]
