#!/bin/bash

. $(dirname $0)/utils.sh

assume_deploy_role

DOCKER_RUN_ENV="-e VAULT_ADDR=\\\"http://127.0.0.1:8200\\\" \
  -e ROLE_ID="${VAULT_ROLE_ID}" \
  -e SECRET_ID="${VAULT_SECRET_ID}" \
  -e VAULT_TOKEN="${VAULT_ROOT_TOKEN}" \
  -e VAULT_SEAL_TYPE="awskms" \
  -e AWS_REGION="${VAULT_AWS_REGION}" \
  -e VAULT_AWSKMS_SEAL_KEY_ID="${VAULT_KMS_KEY_ARN}" \
  -e AWS_ACCESS_KEY_ID="${VAULT_AWS_ACCESS_KEY_ID}" \
  -e AWS_SECRET_ACCESS_KEY="${VAULT_AWS_SECRET_ACCESS_KEY}" \
  -e VAULT_LOCAL_CONFIG='ui = true disable_mlock = false storage \\\"file\\\" { path=\\\"/vault/data\\\" } listener \\\"tcp\\\" { address=\\\"0.0.0.0:8200\\\" tls_disable = true }'"

aws ssm send-command \
  --instance-ids "${DEPLOY_AWS_INSTANCE_ID}" \
  --document-name "AWS-RunShellScript" \
  --parameters "{\"commands\": [\
  \"#!/bin/bash\",\
  \"docker stop vault || true\",
  \"docker rm vault || true\",
  \"docker run -d ${DOCKER_RUN_ENV} --restart=unless-stopped --cap-add IPC_LOCK --expose 8200 -v vault-data:/vault/data -v /deployment/vault:/scripts --network tapestries-server --name vault hashicorp/vault:1.20 /scripts/start-vault.sh\",\
  \"docker image prune -f\"\
  ]}"
