from typing import Dict, Any, List
import json

def generate_remediation_code(
    intervention_id: str,
    intervention_name: str,
    format_type: str = "terraform",
    affected_relationships: List[str] = None
) -> Dict[str, Any]:
    """
    Translates an intervention recommendation into actionable, copy-pasteable
    infrastructure-as-code or security automation scripts.
    Supported formats: 'terraform', 'iam', 'kubernetes', 'bash'.
    """
    fmt = format_type.lower()
    rel_str = ", ".join(affected_relationships or [])

    # 1. SSH / Perimeter Microsegmentation
    if "ssh" in intervention_id.lower() or "dmz" in intervention_id.lower() or "segment" in intervention_id.lower():
        if fmt == "terraform":
            code = f"""# Terraform / OpenTofu: Sever Insecure Perimeter Ingress
# Affected Relationships: {rel_str}

resource "aws_security_group_rule" "revoke_public_ssh" {{
  type              = "ingress"
  from_port         = 22
  to_port           = 22
  protocol          = "tcp"
  cidr_blocks       = ["10.0.0.0/16"] # Restricted to internal VPN subnet only
  security_group_id = aws_security_group.dmz_bastion.id
  description       = "Automated remediation: Restrict SSH from public internet"
}}
"""
            language = "hcl"
        elif fmt == "kubernetes":
            code = f"""# Kubernetes NetworkPolicy: Restrict Ingress
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: isolate-bastion-ssh
  namespace: perimeter
spec:
  podSelector:
    matchLabels:
      role: bastion
  policyTypes:
  - Ingress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: secure-vpn
    ports:
    - protocol: TCP
      port: 22
"""
            language = "yaml"
        elif fmt == "bash":
            code = f"""#!/usr/bin/env bash
# Host-Level Firewall Remediation (Linux UFW / iptables)
# Affected Relationships: {rel_str}

echo "[*] Applying perimeter hardening..."
sudo ufw delete allow 22/tcp
sudo ufw allow from 10.0.0.0/16 to any port 22 proto tcp comment 'Internal VPN only'
sudo ufw reload
echo "[+] Insecure public SSH severed successfully."
"""
            language = "bash"
        else: # Default IAM or json
            code = json.dumps({
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Sid": "DenyUnauthenticatedSSHNetworkAccess",
                        "Effect": "Deny",
                        "Action": "ec2-instance-connect:SendSSHPublicKey",
                        "Resource": "*",
                        "Condition": {
                            "NotIpAddress": {"aws:SourceIp": ["10.0.0.0/16"]}
                        }
                    }
                ]
            }, indent=2)
            language = "json"

    # 2. MFA / IAM Privilege Escalation Defense
    elif "mfa" in intervention_id.lower() or "admin" in intervention_id.lower() or "iam" in intervention_id.lower():
        if fmt == "iam" or fmt == "json":
            code = json.dumps({
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Sid": "EnforceMFAForAdminRoleAssumption",
                        "Effect": "Deny",
                        "Action": "sts:AssumeRole",
                        "Resource": "arn:aws:iam::*:role/Admin*",
                        "Condition": {
                            "BoolIfExists": {
                                "aws:MultiFactorAuthPresent": "false"
                            }
                        }
                    }
                ]
            }, indent=2)
            language = "json"
        elif fmt == "terraform":
            code = f"""# Terraform: Enforce Hardware MFA Condition on IAM Role
# Affected Relationships: {rel_str}

resource "aws_iam_role_policy" "enforce_mfa" {{
  name = "EnforceMFAForAdmin"
  role = aws_iam_role.cloud_admin.id

  policy = jsonencode({{
    Version = "2012-10-17"
    Statement = [
      {{
        Effect    = "Deny"
        Action    = ["*"]
        Resource  = ["*"]
        Condition = {{
          BoolIfExists = {{
            "aws:MultiFactorAuthPresent" = "false"
          }}
        }}
      }}
    ]
  }})
}}
"""
            language = "hcl"
        elif fmt == "bash":
            code = f"""#!/usr/bin/env bash
# AWS CLI Hardening: Attach MFA Enforcement Policy
aws iam put-role-policy \\
  --role-name IAM-Cloud-Admin-Role \\
  --policy-name DenyNonMFAAccess \\
  --policy-document file://mfa_enforcement_policy.json
echo "[+] MFA enforcement attached to Cloud Admin Role."
"""
            language = "bash"
        else:
            code = f"""# Kubernetes ServiceAccount Token Boundary
apiVersion: v1
kind: ServiceAccount
metadata:
  name: cloud-admin-sa
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/Admin
    eks.amazonaws.com/audience: "sts.amazonaws.com"
"""
            language = "yaml"

    # 3. WAF / Virtual Patching Rules
    elif "waf" in intervention_id.lower() or "patch" in intervention_id.lower():
        if fmt == "terraform":
            code = f"""# Terraform: Deploy AWS WAFv2 Virtual Patching Rule
resource "aws_wafv2_web_acl" "api_gateway_waf" {{
  name  = "api-gateway-virtual-patching"
  scope = "REGIONAL"

  default_action {{
    allow {{}}
  }}

  rule {{
    name     = "BlockSQLInjectionAndPathTraversal"
    priority = 1

    action {{
      block {{}}
    }}

    statement {{
      or_statement {{
        statements = [
          sqli_match_statement {{
            field_to_match {{ uri_path {{}} }}
            text_transformation {{ priority = 1, type = "URL_DECODE" }}
          }},
          sqli_match_statement {{
            field_to_match {{ body {{}} }}
            text_transformation {{ priority = 1, type = "URL_DECODE" }}
          }}
        ]
      }}
    }}

    visibility_config {{
      cloudwatch_metrics_enabled = true
      metric_name                = "WAFVirtualPatchBlock"
      sampled_requests_enabled   = true
    }}
  }}
}}
"""
            language = "hcl"
        elif fmt == "kubernetes":
            code = f"""# Ingress NGINX Virtual Patching Annotations
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: payment-ingress-waf
  annotations:
    nginx.ingress.kubernetes.io/enable-modsecurity: "true"
    nginx.ingress.kubernetes.io/enable-owasp-core-rules: "true"
    nginx.ingress.kubernetes.io/modsecurity-snippet: |
      SecRuleEngine On
      SecRequestBodyAccess On
"""
            language = "yaml"
        elif fmt in ("iam", "json"):
            code = json.dumps({
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Sid": "EnforceWAFProtectionOnPublicEndpoints",
                        "Effect": "Deny",
                        "Action": ["wafv2:GetWebACL", "wafv2:AssociateWebACL"],
                        "Resource": "*",
                        "Condition": {
                            "StringNotEquals": {"aws:RequestedRegion": "us-east-1"}
                        }
                    }
                ]
            }, indent=2)
            language = "json"
        else:
            code = """#!/usr/bin/env bash
# Deploy ModSecurity Virtual Patching Filter
echo "SecRule REQUEST_URI|ARGS '@detectSQLi' 'id:1001,phase:2,deny,status:403,log,msg:SQLi Attack Blocked'" | sudo tee -a /etc/modsecurity/rules/virtual_patch.conf
sudo nginx -s reload
"""
            language = "bash"

    # 4. Database Isolation / mTLS Enforcement
    else:
        if fmt == "kubernetes":
            code = f"""# Kubernetes NetworkPolicy: Strict Database Isolation
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: isolate-database-vault
  namespace: database
spec:
  podSelector:
    matchLabels:
      app: cardholder-vault
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: payment-processor
    ports:
    - protocol: TCP
      port: 5432
"""
            language = "yaml"
        elif fmt == "terraform":
            code = f"""# Terraform: Enforce TLS & Private Subnet on RDS Database
resource "aws_db_parameter_group" "enforce_tls" {{
  name   = "db-vault-enforce-tls"
  family = "postgres16"

  parameter {{
    name  = "rds.force_ssl"
    value = "1"
  }}
}}
"""
            language = "hcl"
        elif fmt in ("iam", "json"):
            code = json.dumps({
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Sid": "EnforceEncryptedDatabaseVaultConnections",
                        "Effect": "Deny",
                        "Action": ["rds-db:connect"],
                        "Resource": "arn:aws:rds-db:*:*:dbuser:*/*",
                        "Condition": {
                            "Bool": {"aws:SecureTransport": "false"}
                        }
                    }
                ]
            }, indent=2)
            language = "json"
        else:
            code = """#!/usr/bin/env bash
# Enforce SSL/TLS & Local Subnet in PostgreSQL pg_hba.conf
echo "hostssl all all 10.0.2.0/24 scram-sha-256" | sudo tee -a /var/lib/postgresql/data/pg_hba.conf
sudo systemctl reload postgresql
"""
            language = "bash"


    return {
        "intervention_id": intervention_id,
        "intervention_name": intervention_name,
        "format": fmt,
        "language": language,
        "code": code.strip(),
        "deployment_instruction": f"Apply this {fmt.upper()} configuration to permanently sever relationship(s): {rel_str}."
    }
