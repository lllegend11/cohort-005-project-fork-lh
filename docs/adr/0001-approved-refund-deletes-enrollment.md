# An Approved Refund deletes the enrollment

When a Support Team Member approves a Refund Request, we end the learner's access by deleting their enrollment for that course, rather than keeping the enrollment and making every access check also ask "has this Purchase been Refunded?". Access is resolved in one place (`app/lib/access.server.ts`) from the enrollment alone, and we wanted Refunds to need no change there and leave no way for a forgotten check to grant access after a Refund.

## Considered Options

- **Delete the enrollment (chosen).** Access logic stays unchanged; buying again simply creates a fresh enrollment.
- **Keep the enrollment, gate access on the Purchase's Refund status.** Preserves the row, but every path that reads enrollments (access, dashboards, instructor student lists, enrollment counts) would need to learn about Refunds.

## Consequences

- The enrollment's `completedAt` is lost. This is acceptable because a Refund keeps the learner's progress history, which lives in `lesson_progress` and `video_watch_events`, both untouched; completion can be re-derived from them.
- Enrollment counts for a course drop when a Refund is approved.
- A Refund removes only the enrollment the refunded Purchase granted. Team licence Purchases grant no enrollment to the buyer (seats are enrolled on redemption), and team licence Refunds are out of scope today.
