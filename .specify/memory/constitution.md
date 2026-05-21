<!--
Sync Impact Report
==================
Version change: TEMPLATE (placeholders) → 1.0.0
Rationale: Initial ratification. Bumping from template skeleton to first
governed version constitutes a MAJOR baseline (1.0.0) rather than 0.x —
the document is now binding for all downstream artifacts.

Modified principles:
  - [PRINCIPLE_1_NAME] → I. Spec-First (NON-NEGOTIABLE)
  - [PRINCIPLE_2_NAME] → II. Test-First (NON-NEGOTIABLE)
  - [PRINCIPLE_3_NAME] → III. Independent Testability of User Stories
  - [PRINCIPLE_4_NAME] → IV. Simplicity & YAGNI
  - [PRINCIPLE_5_NAME] → V. Observability & Semantic Versioning

Added sections:
  - Quality Gates & Constraints (was [SECTION_2_NAME])
  - Development Workflow (was [SECTION_3_NAME])
  - Governance (filled)

Removed sections: none.

Templates requiring updates:
  - ✅ .specify/templates/plan-template.md — Constitution Check section is
    a free-form gate; principles below are directly testable, no edit needed.
  - ✅ .specify/templates/spec-template.md — already aligned with Principle I
    (spec mandatory) and Principle III (prioritized, independently testable
    user stories).
  - ✅ .specify/templates/tasks-template.md — already aligned with Principle
    III (per-story phases) and Principle II (tests-first ordering note).
  - ✅ .specify/templates/checklist-template.md — generic, no edit needed.
  - ✅ CLAUDE.md — references "current plan", no principle-specific text to
    update at this version.

Follow-up TODOs: none.
-->

# Spec-Kit Project Constitution

## Core Principles

### I. Spec-First (NON-NEGOTIABLE)

Every feature MUST originate from a written specification produced via the
`/speckit-specify` workflow before any planning, task generation, or
implementation begins. Specs MUST describe user-observable behaviour,
prioritized user stories, acceptance scenarios, and measurable success
criteria — and MUST exclude implementation details (languages, frameworks,
APIs, schemas).

**Rationale**: Specs are the single source of truth that downstream
artifacts (`plan.md`, `tasks.md`, code, tests) trace back to. Skipping
the spec breaks traceability and collapses the value of the rest of the
workflow.

### II. Test-First (NON-NEGOTIABLE)

When tests are in scope, they MUST be written before the implementation
they cover, MUST be observed failing first, and MUST drive the
Red-Green-Refactor cycle. Contract tests precede service code; integration
tests precede cross-component wiring. Tests MAY be deferred only when the
spec explicitly opts out (e.g., spike, prototype) — and that opt-out MUST
be recorded in the spec.

**Rationale**: Tests written after the fact codify whatever was built,
not what was required. Writing them first turns the spec's acceptance
scenarios into an executable contract.

### III. Independent Testability of User Stories

Each user story in a spec MUST be independently developable, testable, and
deliverable as a standalone MVP slice. Task plans MUST group work by user
story (one phase per story) and MUST NOT introduce cross-story
dependencies that prevent shipping story N without story N+1. Foundational
work shared by all stories belongs in a dedicated Foundational phase.

**Rationale**: Independent slices let teams ship value incrementally,
parallelize across developers, and stop at any checkpoint with a working
product. Coupled stories defeat both incremental delivery and parallel
execution.

### IV. Simplicity & YAGNI

Start with the simplest design that satisfies the current spec. New
projects, abstractions, frameworks, or patterns MUST be justified against
a concrete requirement from the spec — speculative future needs are not
sufficient. Violations MUST be recorded in the plan's Complexity Tracking
table with an explicit "why simpler alternative was rejected" entry.

**Rationale**: Premature abstraction is the dominant source of accidental
complexity in spec-driven projects. The Complexity Tracking table makes
deviations visible and reviewable rather than invisible.

### V. Observability & Semantic Versioning

Every shipped component MUST expose enough observable behaviour
(structured logs, exit codes, error messages, or equivalent) to diagnose
failures without attaching a debugger. Public interfaces (CLIs, APIs,
library exports, file formats) MUST be versioned using Semantic
Versioning (MAJOR.MINOR.PATCH); breaking changes require a MAJOR bump
and a migration note.

**Rationale**: Without observability, bugs in spec-driven systems hide
behind the abstraction layers introduced by spec → plan → tasks → code.
Without SemVer, consumers cannot tell a safe upgrade from a breaking one.

## Quality Gates & Constraints

The following gates apply to every feature, regardless of size:

- **Spec gate**: No `/speckit-plan` run until `spec.md` exists and contains
  prioritized user stories, acceptance scenarios, and measurable success
  criteria. Ambiguities MUST be marked `[NEEDS CLARIFICATION: …]` and
  resolved (e.g., via `/speckit-clarify`) before planning.
- **Constitution gate**: `plan.md` MUST include a Constitution Check
  result. Violations MUST be either removed or recorded in the plan's
  Complexity Tracking table with justification.
- **Test gate**: For features with tests in scope, `tasks.md` MUST place
  test tasks before the implementation tasks they cover within each user
  story phase.
- **Cross-artifact consistency**: `/speckit-analyze` MUST be run before
  `/speckit-implement` on any non-trivial feature; reported inconsistencies
  MUST be resolved or explicitly waived in the spec.

## Development Workflow

The standard flow for any feature is:

1. `/speckit-specify` → produces `specs/[###-feature]/spec.md`.
2. `/speckit-clarify` (as needed) → resolves `[NEEDS CLARIFICATION]` markers.
3. `/speckit-plan` → produces `plan.md`, `research.md`, `data-model.md`,
   `contracts/`, `quickstart.md`; runs Constitution Check.
4. `/speckit-tasks` → produces `tasks.md`, grouped by user story (Principle III).
5. `/speckit-analyze` → cross-artifact consistency check.
6. `/speckit-implement` → executes tasks; tests-first within each story.

Deviations from this flow (e.g., skipping `/speckit-clarify` on a
trivial change) MUST be defensible against Principles I–V. PR reviewers
MUST verify that the committed `spec.md`, `plan.md`, and `tasks.md`
reflect the shipped code, not an earlier draft.

## Governance

This constitution supersedes ad-hoc practices and informal conventions
within the project. In any conflict between this document and a
template, command, README, or reviewer comment, this document wins until
it is amended.

**Amendment procedure**: Open a change against `.specify/memory/constitution.md`
via `/speckit-constitution`. Amendments MUST include (a) the rationale,
(b) the version bump and its justification, and (c) a Sync Impact Report
listing every downstream template, command, and doc that needs updating.

**Versioning policy** (Semantic Versioning applied to this document):

- **MAJOR**: A principle is removed, renamed in a backward-incompatible
  way, or its meaning is redefined; or a governance rule is removed.
- **MINOR**: A new principle or section is added, or an existing
  principle's guidance is materially expanded.
- **PATCH**: Wording, clarifications, typo fixes, or non-semantic
  refinements that do not change what is required.

**Compliance review**: Every PR description MUST state which principles
the change touches and confirm Constitution Check passes (or link to the
Complexity Tracking entry that justifies the deviation). Reviewers MUST
block merges that silently bypass a principle.

**Version**: 1.0.0 | **Ratified**: 2026-05-21 | **Last Amended**: 2026-05-21
