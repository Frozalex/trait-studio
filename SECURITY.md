# Security policy

## Supported versions

Security fixes go into the latest Trait Studio release. Download updates from [GitHub Releases](https://github.com/Frozalex/trait-studio/releases); automatic updates are disabled in this fork.

## Reporting a vulnerability

Please report security problems privately, never in a public issue or on Discord.

- **Preferred:** use GitHub's [private vulnerability reporting](https://github.com/Frozalex/trait-studio/security/advisories/new).

Include the version and platform, what an attacker could do, and the steps or a file that reproduces it. Please give us a reasonable chance to fix the problem before you disclose it publicly. We will credit you in the release notes if you'd like.

## Scope

In scope:

- **Opening files:** any way a crafted `.styk`, `.piv`, `.stk`, Stick Nodes file or image can run code, read or write files it shouldn't, or crash the app repeatedly.
- **The Electron app:** escaping context isolation or the preload API, and `traitstudio://` link handling.
- **Updates:** the update path and installers.
- **The browser build:** its service worker.

Upstream websites and community services are not operated by this project.

## Release checks

Publication requires successful dependency audits and a ClamAV scan of the exact Windows and Linux distribution files and their extracted payloads. The npm audit includes development dependencies because Electron is shipped inside the application. The Python build environment is audited separately. Scan reports and the antivirus signature version are retained as CI artifacts; a failed scan blocks publication.

These checks detect known vulnerabilities and malware signatures. They do not prove that software is free of all vulnerabilities or bugs. Release checks also exercise installation, restart, saving and video export. SHA-256 checksums establish file integrity, not safety. Download only the files attached to the verified release.
