# Security Policy

## Reporting a vulnerability

Please report security issues **privately** via GitHub Security Advisories
("Report a vulnerability" under the repository's **Security** tab). We aim to
acknowledge reports within a few business days.

Do not open a public issue for a suspected vulnerability.

## Scope

Counsel OS is a set of skills, prompts, and knowledge that runs inside
[Claude Code](https://docs.claude.com/en/docs/claude-code) or Claude Desktop on
your own machine, over your own markdown vault. It runs with your local
credentials and shell. When reporting, please note:

- Counsel OS operates on the documents and vault you point it at, with the
  permissions of the invoking user. Treat the machine and vault as the trust
  boundary.
- Your practice profile, client documents, and any secrets belong in your local
  vault / environment — never commit them here.
- Counsel OS is **not legal advice** and does not replace a licensed attorney's
  judgment. Security reports about incorrect legal output are better filed as
  regular issues unless they enable a concrete exploit.

## Supported versions

Fixes land on the latest released version. Pin a tag if you need stability.
