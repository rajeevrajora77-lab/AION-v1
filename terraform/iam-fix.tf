# Fix: Add EC2 tag permissions to Elastic Beanstalk service role
# This resolves the EIP creation failure issue

data "aws_iam_role" "eb_service_role" {
  name = "aws-elasticbeanstalk-service-role"
}

data "aws_iam_policy_document" "eb_ec2_tag_policy" {
  statement {
    sid    = "AllowElasticBeanstalkEC2Tagging"
    effect = "Allow"

    actions = [
      "ec2:CreateTags",
      "ec2:DeleteTags",
      "ec2:DescribeTags",
    ]

    resources = [
      "arn:aws:ec2:*:*:elastic-ip/*",
      "arn:aws:ec2:*:*:instance/*",
      "arn:aws:ec2:*:*:volume/*",
      "arn:aws:ec2:*:*:snapshot/*",
      "arn:aws:ec2:*:*:security-group/*",
    ]

    condition {
      test     = "StringEquals"
      variable = "aws:RequestTag/elasticbeanstalk:environment-name"
      values   = ["Aion-backend-env-1"]
    }
  }
}

resource "aws_iam_role_policy" "eb_ec2_tag_policy" {
  name   = "ElasticBeanstalk-EC2-Tagging"
  role   = data.aws_iam_role.eb_service_role.id
  policy = data.aws_iam_policy_document.eb_ec2_tag_policy.json
}

# Also ensure the service role has basic EC2 permissions
data "aws_iam_policy_document" "eb_ec2_policy" {
  statement {
    sid    = "EC2InstanceProfileActions"
    effect = "Allow"

    actions = [
      "ec2:AttachVolume",
      "ec2:CreateVolume",
      "ec2:DeleteVolume",
      "ec2:DescribeVolumes",
      "ec2:DescribeVolumeStatus",
      "ec2:DetachVolume",
      "ec2:ModifyVolume",
      "ec2:ModifyVolumeAttribute",
      "ec2:DescribeInstances",
      "ec2:DescribeImages",
      "ec2:DescribeSecurityGroups",
      "ec2:AllocateAddress",
      "ec2:AssociateAddress",
      "ec2:DisassociateAddress",
      "ec2:DescribeAddresses",
      "ec2:ReleaseAddress",
    ]

    resources = ["*"]
  }
}

resource "aws_iam_role_policy" "eb_ec2_policy" {
  name   = "ElasticBeanstalk-EC2-Basic"
  role   = data.aws_iam_role.eb_service_role.id
  policy = data.aws_iam_policy_document.eb_ec2_policy.json
}

output "eb_service_role_arn" {
  description = "ARN of the Elastic Beanstalk service role"
  value       = data.aws_iam_role.eb_service_role.arn
}

output "policies_attached" {
  description = "Policies attached to fix EC2 tagging"
  value = [
    aws_iam_role_policy.eb_ec2_tag_policy.name,
    aws_iam_role_policy.eb_ec2_policy.name,
  ]
}
