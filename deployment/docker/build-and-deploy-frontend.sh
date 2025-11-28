#!/bin/bash

. $(dirname $0)/utils.sh

assume_deploy_role

# TODO: Make docker use build cache when building this image. Probably upload it to ECR to use as cache later?
docker build \
  --build-arg VITE_API_URL=${EXTERNAL_SERVER_URL} \
  --build-arg VITE_AUTH_PROVIDER=${AUTH_PROVIDER} \
  --build-arg VITE_GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID} \
  --build-arg VITE_BUG_REPORT_FORM_URL=${BUG_REPORT_FORM_URL} \
  --build-arg VITE_AI_CHAT_EXPIRES_IN=${AI_CHAT_EXPIRES_IN} \
  --build-arg VITE_WEBPAGE_LOADER_TIMEOUT=${WEBPAGE_LOADER_TIMEOUT} \
  --build-arg VITE_STUN_SERVER=${STUN_SERVER} \
  --tag tapestries-client:latest \
  --file Dockerfile.client-aws .

docker run --rm -v ./build:/app/build tapestries-client:latest \
  /bin/sh -c "cp -a /app/client/dist/. /app/build/; chown -R `id -u $USER`:`id -g $USER` /app/build/"

aws s3 sync build/ s3://${DEPLOY_FRONTEND_S3_BUCKET} --delete
aws s3 cp \
  s3://${DEPLOY_FRONTEND_S3_BUCKET}/index.html \
  s3://${DEPLOY_FRONTEND_S3_BUCKET}/index.html \
  --metadata-directive REPLACE \
  --cache-control max-age=0,no-cache,no-store,must-revalidate \
  --content-type text/html
aws cloudfront create-invalidation \
    --distribution-id $DEPLOY_FRONTEND_CF_DISTRIBUTION_ID \
    --paths "/*"
