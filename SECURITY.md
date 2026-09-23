# Security Policy

## Reporting

Do not open a public issue for a suspected vulnerability. Send a private report to the repository owner through GitHub Security Advisories. Include affected versions, reproduction steps, impact, and a minimal proof of concept.

## Security model

This library treats clear signing as a fail-closed presentation layer. Parsing, schema, provenance, formatting, sanitization, or interpolation failures return `raw_dump`; callers must not treat that result as clear-sign authorization.

`decodeVerifiedInstruction` verifies a canonical SHA-256 IDL digest before parsing. The caller remains responsible for obtaining the expected digest and program identity from a trusted source such as verified on-chain metadata, embedded firmware, or an authenticated registry.

The library does not verify transaction signatures, executable program ownership, upgrade authority, account contents, or the correctness of external token metadata.

## Supported versions

Until the first stable release, only the latest commit is supported. The underlying sRFC is a draft, so incompatible schema changes may be required as it evolves.
