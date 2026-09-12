# ADR — FollowCure: practitioner-led follow-up

**Status:** prototype for the Simplycure case, built in a few hours. The workflow is real; the business impact is untested.

## Problem

Simplycure earns a margin on orders that start with a practitioner's prescription. The brief points at two leaks: one prescription in four never becomes an order, and courses last one to three months with nothing structured happening when they end. Repeat purchasing already drives growth, but nobody is told when a course is running out.

The practitioner is Simplycure's customer and owns the patient relationship. Marketing directly to patients risks losing both.

## Decision

Build the second leak first: a queue that shows a practitioner which patients' courses are ending, and lets them decide what to propose — a refill, an appointment, both, or nothing. No message reaches a patient without the practitioner approving it.

Why this one: those patients are known, they have already bought once, and the practitioner stays in the loop, so the experiment carries little relationship risk. It is a bet, not a proven priority. Recovering the 25 % of prescriptions that never convert may be worth more; comparing eligible volume, expected uplift and basket value for both is the first thing to do with real data.

Deliberately not in this experiment:

| Not doing                         | Why                                                                                                   |
| --------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Automatic messages, subscriptions | They assume a need the prototype has not established. Manual review is how we learn what to automate. |
| An editable discount slider       | It would confound any measured uplift and eat into the practitioner's commission.                     |
| A real patient application        | A preview is enough to show the handoff; the rest is integration work, not product learning.          |

## The rules

The end of a course is an estimate, never a fact:

```text
estimatedEnd = courseStart + protocolDuration
followUpDue  = estimatedEnd − 7 days
```

`courseStart` is the date the patient declared, else the delivery date, else the order date — the interface always says which one it used. If the protocol has no duration, no date is invented: the record is flagged for review.

A follow-up is proposed only when none of these applies. The first one that does becomes the explanation shown in the queue, so no patient appears — or disappears — without a reason:

- the patient refused follow-up messages;
- the course was stopped;
- a later order of the same protocol already exists (an unrelated purchase is not a refill);
- the message was already sent, the follow-up dismissed, or snoozed to a later date;
- the duration is unknown, or the follow-up is not due yet.

Statuses are `pending | sent | snoozed | dismissed`. Eligibility is derived when the queue is read, so a snooze simply expires and nothing runs in the background. It is rechecked at send time: a queue left open for an hour cannot send a message that a purchase has since made pointless, and sending twice sends once. `sent` means the message left — not delivered, read or bought. The repeat order is a separate event, and it is what closes the course cycle.

A patient who finished their course and needs nothing more is not a failed conversion.

## What the prototype is

One screen: the queue (_to handle_ / _sent_ / _no follow-up_), a review dialog with the course context and its date basis, the three possible actions, an editable template message, and a preview of what the patient receives with a simulated order or appointment. All state lives in memory behind an async API that owns the rules; the UI only renders what it returns.

Out of scope: authentication, a real backend, SMS, payment and booking, several concurrent courses per patient, partial orders, multi-practitioner data, AI-written messages.

## Measuring it

The prototype shows the idea is usable; it cannot show it earns money. A pilot should track three things:

1. **Incremental repeat GMV per eligible patient** — treatment against a holdout of eligible patients who are never contacted, over the same course-relative window, on completed orders net of refunds. Link-attributed sales alone would count purchases that would have happened anyway, and a later window must check that the follow-up did not simply pull purchases forward.
2. **Practitioner effort** — share of eligible follow-ups reviewed each week, and time per review. If manual approval does not fit into a practitioner's week, it does not scale, and that is a finding.
3. **Relationship guardrail** — patient opt-outs and complaints, practitioners disabling the feature, with stop thresholds agreed before launch. Churn shows up far too late to be the warning signal.

Illustrative only: 1 000 eligible patients and repeat conversion rising 20 % → 25 % is 50 extra orders × the average repeat basket. Assumptions, not Simplycure figures.

Start with a few willing practitioners across volume segments, then randomise at practitioner level. Instrument eligibility, review, action chosen, send, link opened, repeat order and opt-out, with pseudonymous ids and no patient names or message bodies in events; purchases come from order records, not from the front end.

## To ask Simplycure

Prescription-to-order conversion, repeat-order timing by protocol and practitioner segment, whether delivery and start dates exist, what reminders already run, and why patients stop.
