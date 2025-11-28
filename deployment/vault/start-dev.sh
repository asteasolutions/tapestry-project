#!/bin/sh
set -e

# Start Vault in background
vault server -dev -dev-root-token-id=root -dev-listen-address=0.0.0.0:8200 &
VAULT_PID=$!

export VAULT_ADDR='http://127.0.0.1:8200'
export VAULT_TOKEN='root'

# Wait for Vault to be ready
until wget -qO- http://127.0.0.1:8200/v1/sys/health 2>/dev/null | grep -q '"initialized":true'; do
  sleep 1
done

# Enable approle authentication if not already enabled.
if ! vault auth list | grep -q "approle"; then
  vault auth enable approle
fi

echo ROLE, $ROLE_ID

# Update the approle policy. We need the app to be able to read/write user secrets.
vault policy write tapestries-policy - <<EOF
path "secret/data/users/*" {
  capabilities = ["create", "update", "read", "delete"]
}
EOF

# Create the role used by the Tapestries backend.
if ! vault read auth/approle/role/tapestries >/dev/null 2>&1; then
  vault write auth/approle/role/tapestries \
      token_policies="tapestries-policy" \
      token_ttl=1h \
      token_max_ttl=4h \
      role_id=$ROLE_ID

  vault write auth/approle/role/tapestries/custom-secret-id secret_id=$SECRET_ID >/dev/null
fi

# Keep Vault running
wait $VAULT_PID
