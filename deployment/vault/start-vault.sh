#!/bin/sh
set -e

/usr/local/bin/docker-entrypoint.sh server &
VAULT_PID=$!

# Wait for Vault to be ready
until wget -qO- "${VAULT_ADDR}/v1/sys/health" | grep -q '"initialized":true'; do
  sleep 1
done

# Wait for Vault to be unsealed
until wget -qO- "${VAULT_ADDR}/v1/sys/health" | grep -q '"sealed":false'; do
  sleep 1
done

if ! vault secrets enable -path=secret kv-v2 &>/dev/null; then
    echo "Secret of type KeyValueV2 already exists on this path, skipping" 2>/dev/null
fi

if ! vault auth list -format=json | grep -q "approle/"; then
  vault auth enable approle
fi

vault policy write tapestries-policy - <<EOF
path "secret/data/users/*" {
  capabilities = ["create", "update", "read", "delete"]
}
EOF

if ! vault read -format=json auth/approle/role/tapestries >/dev/null 2>&1; then
  vault write auth/approle/role/tapestries \
      token_policies="tapestries-policy" \
      token_ttl=1h \
      token_max_ttl=4h \
      role_id="$ROLE_ID"

  vault write auth/approle/role/tapestries/custom-secret-id secret_id="$SECRET_ID" >/dev/null
fi

wait $VAULT_PID

