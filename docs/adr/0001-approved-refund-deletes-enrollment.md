# An Approved Refund deletes the Enrollment, not the Progress History

When a Support Team Member approves a Refund, the learner is un-enrolled: we delete their Enrollment row for that course. We do **not** delete or change any of their Progress History. If they enroll again later, by buying again or by claiming a Seat, they get a new Enrollment and all of their earlier Progress History is there again.

This works because the Enrollment and the Progress History are stored separately. Access is decided from the Enrollment alone (`app/lib/access.server.ts`). Every piece of Progress History is stored against the learner and the lesson or course (`lesson_progress`, `video_watch_events`, `quiz_attempts`, `comments`, `course_ratings`, all keyed by `userId`), never against the Enrollment. So removing the Enrollment removes access and nothing else.

## Considered Options

- **Delete the Enrollment (chosen).** Access logic stays unchanged, and a forgotten check can't let a refunded learner back in.
- **Keep the Enrollment and gate access on the Purchase's Refund status.** This keeps the row, but every reader of enrollments (access, dashboard, course list, instructor student lists, enrollment counts) would have to learn about Refunds.

## Consequences

- `enrollments.completedAt` is lost with the row. Today the app never writes this column (only the seed data does), so in practice nothing is lost. If course-level completion is ever recorded on the Enrollment, it must move to a learner-keyed table or be derived from `lesson_progress`, or a Refund will erase it.
- A course's enrollment count drops when a Refund is approved.
- A Refund deletes only the Enrollment its Purchase granted. A Team Licence grants its buyer no Enrollment, and Team Licence Refunds are out of scope today.
