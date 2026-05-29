# Security Policy

## Supported Versions

As a web application, only the most recent version on the master branch receives security updates.

| Version          | Supported |
| ---------------- | --------- |
| Latest on master | ✅        |
| Older branches   | ❌        |

## Scope

**In scope**

- The Admobi web application (`apps/web`) and its API routes
- Authentication, authorization, and session handling
- Database access and data exposure bugs
- Email and notification flows
- Infrastructure misconfigurations directly under our control (e.g. Vercel project settings we manage)

**Out of scope**

- Social engineering or phishing against Admobi staff or partners
- Denial-of-service or load-testing without prior written approval
- Physical access attacks
- Vulnerabilities in third-party services we do not control (e.g. Resend, Vercel platform bugs — report those vendors directly)
- Issues in dependencies with no practical exploit path in our deployment
- Spam or abuse of public forms without a security impact

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

- Do not open a public issue for security vulnerabilities.
- Email your findings to **security@admobihq.com**
- Include a clear description of the vulnerability, steps to reproduce, and any suggested fix if you have one.

**What to expect**

- You should receive an acknowledgement within **48 hours**.
- We will keep you informed on progress and whether the vulnerability has been accepted or declined.
- Target remediation timelines after triage:
  - **Critical** (remote code execution, auth bypass, data breach): fix within **7 days**
  - **High** (significant data exposure, privilege escalation): fix within **30 days**
  - **Medium / Low**: fix in a regular release cycle
- If accepted, we will work on a fix and coordinate public disclosure timing with you.

## Safe Harbor

We support good-faith security research. If you follow this policy — including giving us reasonable time to investigate and remediate before public disclosure — we will not pursue legal action against you for your research activities.

Please do not access, modify, or delete data belonging to other users. Use test accounts you own, or ask us to provision a sandbox.

## Recognition

We do not currently operate a paid bug bounty programme. We are happy to acknowledge researchers who report valid, in-scope issues with their permission after a fix is deployed.
