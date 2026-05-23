variable "subscription_id" { default = "17ac91fc-5d36-4623-a282-f583042b5fe3" }
variable "tenant_id"       { default = "926ba124-fe11-40bd-be2e-b8d25885d5e8" }
variable "client_id"       { default = "6085f9bd-f348-40f5-914a-db4825e460d7" }
variable "client_secret"   { sensitive = true }
variable "resource_group"  { default = "humana-aks-rg" }
variable "location"        { default = "eastus" }
