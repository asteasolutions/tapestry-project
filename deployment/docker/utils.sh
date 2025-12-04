#!/bin/bash

assume_deploy_role () {
  DEPLOY_ROLE=$(AWS_ACCESS_KEY_ID=$DEPLOY_AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY=$DEPLOY_AWS_SECRET_ACCESS_KEY aws sts assume-role \
    --role-arn arn:aws:iam::${AWS_ACCOUNT_ID}:role/${AWS_DEPLOY_ROLE_NAME} \
    --role-session-name gitlab-runner-deploy)

  export AWS_REGION=$DEPLOY_AWS_REGION
  export AWS_ACCESS_KEY_ID=$(echo $DEPLOY_ROLE | jq -r '.Credentials''.AccessKeyId')
  export AWS_SECRET_ACCESS_KEY=$(echo $DEPLOY_ROLE | jq -r '.Credentials''.SecretAccessKey')
  export AWS_SESSION_TOKEN=$(echo $DEPLOY_ROLE | jq -r '.Credentials''.SessionToken')
}

setup_deploy_env () {
  assume_deploy_role

  SHORT_SHA=${GITHUB_SHA:0:8}
  export ECR_URL=${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com
  export SERVER_TAG_LATEST=${ECR_URL}/${DEPLOY_AWS_ECR_API_REPO}:latest
  export SERVER_TAG_COMMIT=${ECR_URL}/${DEPLOY_AWS_ECR_API_REPO}:api-${SHORT_SHA}
  export WORKER_TAG_LATEST=${ECR_URL}/${DEPLOY_AWS_ECR_WORKER_REPO}:latest
  export WORKER_TAG_COMMIT=${ECR_URL}/${DEPLOY_AWS_ECR_WORKER_REPO}:worker-${SHORT_SHA}
}
