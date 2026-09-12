# ADR — FollowCure: practitioner-led follow-up

**Status:** Accepted for the prototype. Business impact and operating assumptions remain to be validated.

FollowCure will surface patients whose supplement course may be nearing its end and let their practitioner decide whether to suggest a refill, an appointment, both, or neither. The prototype prioritizes practitioner control and a credible follow-up workflow; the pilot must establish whether that workflow produces incremental repeat purchases at an acceptable workload.

## Context and problem

Simplycure earns a margin on purchases initiated by practitioner prescriptions. According to the case brief, one in four prescriptions never converts into an order, courses typically last one to three months, and repeat purchasing is already a growth driver but has no structured support.

The practitioner is Simplycure's customer and owns the patient relationship. Direct marketing that undermines that relationship could lose both the practitioner and their patient base. Public prices are set by laboratories. Practitioners can allocate a 20% envelope between their commission and the patient's discount.

The funnel to investigate is:

```text
Prescription → first order → course started → estimated course end
             → decision to continue or reassess → repeat order
```

Potential leaks include an uncompleted first order, an inaccurate estimate of course completion, a forgotten follow-up, uncertainty about continuing, and friction when ordering again. A patient who has completed their course and does not need more is not a conversion failure.

Before prioritizing at scale, request prescription-to-order conversion, repeat-order timing by product and practitioner segment, delivery/start-date availability, existing reminders and appointment flows, and reasons patients stop. Link prescriptions, order lines, and practitioners to distinguish a refill from an unrelated purchase. Use Amplitude for behavioral analysis and order records for purchase outcomes.

## Decision and alternatives

Start with a practitioner-reviewed follow-up queue for patients who have already ordered and whose course may be ending. Recruit a small, willing cohort across high-volume and more typical active practitioners; compare their usage separately. Sporadic practitioners come later, once the workflow has demonstrated value without substantial onboarding.

This is a hypothesis about the first lever, not proof that refill outweighs first-order recovery. Compare the size of the eligible population, expected uplift, basket value, margin, and implementation effort for both. Revisit the priority if the data favors recovering the known 25% first-order leakage.

| Choice                                                | Rationale                                                                                       | Trade-off and revisit condition                                                                                                                                                                          |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Practitioner approval before each message             | Makes the patient relationship and the practitioner's judgment central to the first experiment. | Review effort may cap reach, especially for high-volume practitioners. Measure queue coverage and handling time; later test practitioner-configured rules or batch approval if workload limits adoption. |
| Follow-up before refill                               | Allows the practitioner to recommend an appointment, continuation, or no action.                | Fewer immediate purchases may be the right outcome. Course-end timing alone does not establish a need to continue.                                                                                       |
| Deterministic rules and message templates             | Makes the trigger and suggested message easy to explain and debug within a one-day prototype.   | Personalization is limited. Introduce more complexity only after identifying a concrete failure of the rules.                                                                                            |
| Existing practitioner discount settings               | Keeps the initial experiment focused on timing and convenience.                                 | Discounts could obscure the cause of uplift and reduce practitioner commission. Defer the editable slider and any incentive experiment.                                                                  |
| Practitioner interface plus a minimal patient preview | Keeps the main workflow small while showing what the patient receives and where the links lead. | The preview demonstrates the handoff, not evidence of real checkout conversion.                                                                                                                          |

Unapproved direct marketing and automatic subscriptions are excluded from this first experiment: they assume permissions and ongoing need that the prototype has not established. Practitioner-approved automation may become appropriate later; manual review is a learning mechanism, not a permanent scaling strategy.

## Product flow

```text
Eligible course nearing its estimated end
    ↓
Follow-up proposed with an explanation
    ↓
Practitioner review
    ├── Refill
    ├── Appointment
    ├── Refill + appointment
    ├── Snooze until a chosen date
    └── Dismiss with a reason
    ↓ (for a message action)
Review and edit message → simulate sending → status: sent
    ↓
Patient preview → simulated order or appointment outcome
```

No patient message is sent without practitioner approval. For the prototype, all sending and downstream outcomes are explicitly simulated.

The desktop interface has two navigation entries: **Patients** and **FollowCure**. Each queue entry shows the patient, current protocol, relevant order, estimated course-end date, trigger explanation, and status. Default ordering is by follow-up due date.

The follow-up dialog is the core of the demo. It includes patient and protocol context, the date estimate and its basis, the action choice, an editable template message, and previews of the relevant refill and appointment links. The message identifies the practitioner and makes the proposed next step clear. Preserve their existing commission/discount split; any displayed percentages must total 20%.

The patient preview shows the approved message and its destination, with a mocked order summary or appointment confirmation as appropriate. Include a simulated decline or contact-preference action. Real payment, booking, and messaging integrations remain out of scope.

## Domain and eligibility

Use the terms in [CONTEXT.md](../CONTEXT.md). Model only what the demo needs: `Practitioner`, `Patient`, `Protocol`, `Order`, and `FollowUp`. Associate each follow-up with a specific practitioner, patient, protocol, and source order so that an unrelated purchase does not suppress it.

Use deterministic rules:

```text
estimatedEndDate = knownCourseStartDate + protocolDuration
followUpAt = estimatedEndDate - configurableOffset
```

If the start date is unknown, use delivery date when available, then order date as a labeled fallback. These are estimates, not evidence of actual consumption. For the demo, assume one duration per protocol and a complete purchase; partial orders and products with different durations are limitations to investigate before a pilot. If the duration is missing, flag the record for review instead of inventing a date.

Exclude a candidate when the course is marked complete/stopped, contact preferences prohibit the message, or a matching follow-up has already been sent or dismissed for that course cycle. A relevant subsequent purchase supersedes the candidate. An appointment should suppress or defer it only when it addresses the same follow-up need; an unrelated appointment is not a reason to hide it.

Use a minimal workflow state:

```ts
type FollowUpStatus = 'pending' | 'sent' | 'snoozed' | 'dismissed'
```

Store `snoozedUntil` and a dismissal reason separately. When the snooze expires, recheck eligibility before returning to `pending`. Recheck eligibility before sending as well, so a purchase made since the queue loaded prevents a stale message. Repeated send attempts must not create duplicate messages. A failed simulated send leaves the follow-up pending and allows retry.

Keep message status separate from commercial outcomes. `sent` means the mock send succeeded; it does not mean delivered, read, or purchased. Record simulated purchases and appointments as separate events, and allow a future course cycle to produce a new follow-up.

## Technical approach

Retain the repository's TanStack Start, React, strict TypeScript, TanStack Query, and Tailwind/shadcn setup. Add Zod for boundary validation; it is a planned dependency, not currently installed. Retaining the existing stack minimizes setup work; this case does not require server rendering or a production backend.

Organize code by feature, with a small shared API boundary:

```text
src/
├── features/
│   ├── patients/
│   │   ├── components/
│   │   └── queries.ts
│   └── follow-cure/
│       ├── components/
│       ├── queries.ts
│       └── mutations.ts
├── api/
│   ├── schemas.ts
│   ├── patients.ts
│   ├── practitioners.ts
│   ├── follow-ups.ts
│   └── mock-store.ts
├── components/
└── routes/
```

All mock state lives behind asynchronous API functions such as `getPatients`, `getFollowUps`, `sendFollowUp`, `snoozeFollowUp`, and `dismissFollowUp`. Keep template generation as a pure function. UI components must not import fixtures or mutate the mock store directly.

Validate API inputs and outputs with Zod and infer TypeScript types from those schemas. Share the schemas at the API boundary; avoid a separate DTO layer and duplicated feature-specific definitions of the same entity. Keep eligibility checks and state transitions behind that boundary so components do not duplicate business rules.

Feature query and mutation hooks provide the UI's access to remote-style state. Invalidate or update affected queries after successful mutations, disable duplicate submissions, and show loading, empty, and error states. Local form drafts remain React state. This boundary should allow replacing the mock adapter later, although authentication, authorization, and real delivery guarantees would still require work.

Use an in-memory store with a fixed demo clock and resettable fixtures. Include an eligible refill, an appointment-only case, a snoozed case, a superseded purchase, and a send failure. A small artificial delay is useful only if it makes feedback visible.

## Success and experiment

The prototype validates whether the idea is understandable and usable. It cannot validate revenue impact. A subsequent pilot should track three measures:

1. **Incremental repeat GMV per eligible patient:** compare treatment with a holdout over the same prespecified course-relative window, including eligible patients who were never contacted. Use completed orders net of cancellations/refunds and check contribution margin alongside GMV. This avoids confusing link-attributed sales with purchases that would have happened anyway.
2. **Practitioner adoption and effort:** weekly share of eligible follow-ups reviewed, with handling time per review. This reveals whether manual approval is a workable distribution mechanism.
3. **Relationship guardrail:** patient complaints/opt-outs and practitioners disabling the feature, compared with baseline where available. Review qualitative feedback promptly; churn is too delayed to be the only warning signal.

For planning only, suppose repeat conversion rises from 20% to 25% among 1,000 eligible patients. That means 50 additional orders; incremental GMV is `50 × average repeat basket value`, assuming unchanged basket value and no purchase displacement. These numbers are illustrative assumptions, not Simplycure estimates. A later observation window must check whether the intervention merely brought purchases forward.

Begin with practitioner walkthroughs, then a small usability pilot. If usage is promising, randomize at practitioner level, stratified by volume, to reduce workflow contamination between treatment and control. Size the experiment using observed baseline conversion, practitioner clustering, and a minimum worthwhile effect. A handful of practitioners can provide directional learning, not a reliable causal estimate.

Before launching, agree on the eligibility rules, observation window, and quantitative complaint/opt-out stop thresholds from baseline data. Pause the affected workflow immediately if messages are sent without approval or after a recorded opt-out. Expand only if incremental value, practitioner workload, and relationship feedback are all acceptable.

Plan Amplitude events for eligibility, review, action selection, send outcome, patient link opening, repeat order, and opt-out. Use pseudonymous identifiers to connect the funnel; keep patient names and message bodies out of event properties. Real purchase events must come from order records. The prototype uses a local event log with simulated outcomes visibly labeled.

## Scope and demo priorities

Build the practitioner queue, decision dialog, deterministic eligibility, editable message, simulated send, minimal patient preview, and resettable demo data first. Defer real authentication, backend/database, SMS delivery, payment, booking, a complete patient application, AI, advanced permissions, a custom design system, and the editable commission slider.

The main demo path is:

```text
Open FollowCure → understand why a patient is listed → review context
→ choose refill + appointment → edit the message → simulate sending
→ inspect the patient preview → simulate a repeat order
→ verify that no duplicate follow-up is proposed for that course cycle
```

Also demonstrate snooze, dismissal, and a recoverable send failure. Prioritize explicit code, type safety, a clear UI/data boundary, and realistic behavior over abstractions for hypothetical future needs.

Before the interview, complete the requested patient and practitioner account walkthroughs on Simplycure and update assumptions about existing flows. This ADR does not claim that those walkthroughs or product validations have happened. Keep the broader strategy, segmentation analysis, and optional 90-day plan in the presentation; this record explains the first prototype and the decisions it tests.
