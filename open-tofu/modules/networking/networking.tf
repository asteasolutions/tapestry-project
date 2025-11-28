locals {
  list_subnet_objects = flatten([
    for az_index, az_name in var.azs : [
      for purpose_index, purpose_name in var.subnet_purposes : {
        key     = "${az_name}-${purpose_name}"
        az      = az_name
        index   = az_index * length(var.subnet_purposes) + purpose_index
        purpose = purpose_name
      }
    ]
  ])

  all_subnets = {
    for subnet in local.list_subnet_objects :
    subnet.key => subnet
  }

  public_subnets = {
    for key, value in local.all_subnets :
    key => value if startswith(value.purpose, "public")
  }

  private_subnets = {
    for key, value in local.all_subnets :
    key => value if startswith(value.purpose, "private")
  }
}

resource "aws_vpc" "this" {
  cidr_block                       = var.vpc_cidr
  assign_generated_ipv6_cidr_block = true
  enable_dns_support               = true
  enable_dns_hostnames             = true
  tags                             = merge(var.base_tags, { Name = "tapestries-${var.base_tags.Environment}-vpc" })
}

resource "aws_subnet" "subnets" {
  for_each = local.all_subnets

  vpc_id                          = aws_vpc.this.id
  availability_zone               = each.value.az
  cidr_block                      = cidrsubnet(var.vpc_cidr, 4, each.value.index)
  ipv6_cidr_block                 = cidrsubnet(aws_vpc.this.ipv6_cidr_block, 8, each.value.index)
  assign_ipv6_address_on_creation = true
  tags                            = merge(var.base_tags, { Name = "tapestries-${var.base_tags.Environment}-${each.key}-subnet" })
}

resource "aws_internet_gateway" "this" {
  vpc_id = aws_vpc.this.id
  tags   = merge(var.base_tags, { Name = "tapestries-${var.base_tags.Environment}-internet-gateway" })
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.this.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.this.id
  }

  route {
    ipv6_cidr_block = "::/0"
    gateway_id      = aws_internet_gateway.this.id
  }

  tags = merge(var.base_tags, { Name = "tapestries-${var.base_tags.Environment}-public_route_table" })
}

resource "aws_route_table" "private" {
  vpc_id = aws_vpc.this.id
  tags   = merge(var.base_tags, { Name = "tapestries-${var.base_tags.Environment}-private_route_table" })
}

resource "aws_route_table_association" "public" {
  for_each = local.public_subnets

  subnet_id      = aws_subnet.subnets[each.key].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "private" {
  for_each = local.private_subnets

  subnet_id      = aws_subnet.subnets[each.key].id
  route_table_id = aws_route_table.private.id
}
