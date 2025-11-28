#!/bin/bash

. $(dirname $0)/utils.sh

setup_deploy_env

DOCKER_RUN_ENV="-e DB_HOST=$DB_HOST \
-e DB_NAME=$DB_NAME \
-e DB_USER=$DB_USER \
-e DB_PASS=$DB_PASS \
-e DB_USE_SSL=$DB_USE_SSL \
-e DATABASE_URL=$DATABASE_URL \
-e GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID \
-e SECRET_KEY=$SECRET_KEY \
-e AWS_REGION=$AWS_REGION \
-e AWS_S3_BUCKET_NAME=$AWS_S3_BUCKET_NAME \
-e REDIS_HOST=$REDIS_HOST \
-e REDIS_PORT=$REDIS_PORT \
-e REDIS_USE_TLS=$REDIS_USE_TLS \
-e EXTERNAL_SERVER_URL=$EXTERNAL_SERVER_URL \
-e VIEWER_URL=$VIEWER_URL \
-e PUPPETEER_ARGS=$PUPPETEER_ARGS \
-e JOBS_ADMIN_NAME=$JOBS_ADMIN_NAME \
-e JOBS_ADMIN_PASSWORD=$JOBS_ADMIN_PASSWORD \
-e VAULT_ADDR=$VAULT_ADDR \
-e VAULT_ROLE_ID=$VAULT_ROLE_ID \
-e VAULT_SECRET_ID=$VAULT_SECRET_ID"

aws ssm send-command \
  --instance-ids "${DEPLOY_AWS_INSTANCE_ID}" \
  --document-name "AWS-RunShellScript" \
  --parameters "{\"commands\": [\
  \"#!/bin/bash\",\
  \"aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com\",\
  \"docker stop server && docker rm server\",
  \"docker stop worker && docker rm worker\",
  \"docker run -d $DOCKER_RUN_ENV --pull always --restart=unless-stopped -p 3000:3000 --network tapestries-server --name server $SERVER_TAG_LATEST\",\
  \"docker run -d $DOCKER_RUN_ENV --pull always --restart=unless-stopped --name worker $WORKER_TAG_LATEST\",\
  \"docker image prune -f\"\
  ]}"
