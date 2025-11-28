#!/bin/bash

. $(dirname $0)/utils.sh

setup_deploy_env

docker build \
  --platform linux/x86_64 \
  --cache-from $SERVER_TAG_LATEST \
  --target server \
  --tag $SERVER_TAG_LATEST \
  --tag $SERVER_TAG_COMMIT \
  --file Dockerfile.server .

docker build \
  --platform linux/x86_64 \
  --cache-from $WORKER_TAG_LATEST \
  --target worker \
  --tag $WORKER_TAG_LATEST \
  --tag $WORKER_TAG_COMMIT \
  --file Dockerfile.server .

aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_URL

docker push $SERVER_TAG_LATEST
docker push $SERVER_TAG_COMMIT

docker push $WORKER_TAG_LATEST
docker push $WORKER_TAG_COMMIT
