# Specification profile

This repository targets a security-focused subset of the instruction-display layer described by the draft sRFC 39 discussion. The draft can change. Compatibility is measured against the source-content pin in `spec/srfc39-pin.json`, and CI fails when the upstream discussion changes without an explicit review and pin update. A release of this package is evidence for the behavior in its tests, not a claim that the proposal is final or that this profile is wire-compatible with every current display node.

## Compatibility boundary

The prototype schema uses `mode`, `template`, and `fields` as a compact representation for exercising strict decoding and rendering behavior. The evolving sRFC discussion currently describes a broader Codama-oriented node representation, including `intent`, `interpolatedIntent`, account display nodes, and contextual metadata resolution. Translating to that representation is future work and is not claimed by this release.

## Implemented

- Strict instruction, argument, account, type, display, and formatter validation
- Borsh-compatible scalar, option, array, vector, byte, string, public-key, and defined-struct decoding
- Exact discriminator, account-count, buffer-boundary, and trailing-byte checks
- Interpolated and structured fallback rendering
- Amount, unit, string, flat-struct, datetime, duration, and raw numeric formatting
- BoundedSlice and SizedSlice handling on source or formatted values
- ASCII, UTF-8, base58, base64, and hexadecimal output
- Invisible-control, bidirectional-control, mixed-script, and unsafe-path rejection
- Canonical SHA-256 IDL digest verification bound to the observed instruction program ID
- Exception-safe `raw_dump` behavior
- Standalone JSON conformance vectors with complete inputs and expected modes
- A Rust corpus consumer proving that non-JavaScript tooling can ingest the committed vectors
- Latency regression testing

## Wallet responsibilities

- Establish that an IDL belongs to the program being signed
- Select a trusted source for expected IDL digests and token metadata
- Verify transaction signatures, program identity, executable ownership, upgrade authority, and account state
- Distinguish `raw_dump` from clear signing and require an explicit blind-signing policy
- Preserve an expert view of the original instruction and account data

## Draft-dependent work

- Align the profile with the final sRFC and Codama node representation
- Implement account display nodes and contextual metadata resolution
- Track changes to the sRFC node representation and normative language
- Validate interoperability with a wallet or hardware-wallet implementation
- Add property-based fuzzing and independent security review
- Publish compatibility releases tied to reviewed sRFC snapshot pins

## Conformance rule

Every accepted behavior must have a unit test or JSON vector. Every rejected behavior must produce either a schema error or `raw_dump`. Display failures must never silently fall back to a different human-readable intent.
