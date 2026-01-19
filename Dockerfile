# Change from node:18-slim to node:20-slim
FROM node:20-slim

# Install Artillery & AWS CLI
RUN npm install -g artillery@2.0.21 --unsafe-perm && \
    apt-get update && apt-get install -y curl unzip && \
    curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" && \
    unzip awscliv2.zip && ./aws/install && \
    rm -rf awscliv2.zip aws/

WORKDIR /artillery

# Set up user and permissions
RUN useradd -m -u 1001 artilleryuser && \
    mkdir -p /artillery/reports && \
    chown -R artilleryuser /artillery

# Copy entrypoint
COPY --chown=artilleryuser entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

USER 1001
ENTRYPOINT ["/entrypoint.sh"]
