# How to initialize vault server for the first time

## Demo environment

Prerequisites:
- Ensure that a customer managed symmetric key is available in AWS KMS for both encryption and decryption
- Set the CI/CD variables for VAULT_ADDR, VAULT_ROLE_ID, VAULT_SECRET_ID, VAULT_AWS_REGION, VAULT_AWS_REGION, VAULT_AWS_REGION, VAULT_AWS_SECRET_ACCESS_KEY

1. Start the container via the `aws-deploy-vault` manual job after a deploy to branch `demo`
2. Connect to the EC2 instance with Session Manager
3. Exec into the container and run `vault operator init -recovery-shares=1 -recovery-threshold=1`
4. Save the Root Token as a hidden CI/CD variable and store the Recovery Key
5. Re-run the `aws-deploy-vault` manual job

After a successful initialization the `vault status` command will display:
```
Key                      Value
---                      -----
Seal Type                awskms
Recovery Seal Type       shamir
Initialized              true
Sealed                   false
Total Recovery Shares    1
Threshold                1
```

If the initialization is succsessful, but the keys are forgotten or set to a higher threshold, delete the docker volume for vault-data and try again.

### Important

Since vault is deployed via SSM commands for the Demo environment, the `vault-start.sh` script needs to be manually copied to the /deployment/vault directory in EC2.

## Dev environment

Prerequisites:
- Ensure that a customer managed symmetric key is available in AWS KMS for both encryption and decryption
- Set the CI/CD variables for VAULT_ADDR, VAULT_ROLE_ID, VAULT_SECRET_ID, VAULT_AWS_REGION, VAULT_AWS_REGION, VAULT_AWS_REGION, VAULT_AWS_SECRET_ACCESS_KEY

1. The vault container will strat automatically after deploy to branch `main`
2. Using the GUI at http://tapestries:8200 set the Key shares and Key threshold to 1
3. Save the Root Token as a hidden CI/CD variable and store the Recovery Key
4. Re-run the deploy job

After a successful initialization the `vault status` command will display:
```
Key                      Value
---                      -----
Seal Type                awskms
Recovery Seal Type       shamir
Initialized              true
Sealed                   false
Total Recovery Shares    1
Threshold                1
```

If the initialization is succsessful, but the keys are forgotten or set to a higher threshold, delete the docker volume for vault-data and try again. 
