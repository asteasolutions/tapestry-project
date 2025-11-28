terraform {
  backend "s3" {
    bucket         = "tapestries-opentofu-state"
    key            = "staging/terraform.tfstate"
    region         = "us-east-1"
    profile        = "tapestries"
    encrypt        = true
    dynamodb_table = "opentofu-state-locking"
  }
}
