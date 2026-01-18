FROM node:18-slim
RUN npm install -g artillery@2.0.21 --unsafe-perm
RUN apt-get update && apt-get install -y curl unzip && \
    curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" && \
    unzip awscliv2.zip && ./aws/install && rm -rf awscliv2.zip aws/
WORKDIR /artillery
RUN useradd -m -u 1001 artilleryuser
RUN mkdir -p /artillery/reports && chown -R artilleryuser /artillery
COPY --chown=artilleryuser entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
USER 1001
ENTRYPOINT ["/entrypoint.sh"]
