-- The table holds Refund Requests (the learner's ask), not Refunds — see GLOSSARY.md.
ALTER TABLE `refunds` RENAME TO `refund_requests`;
--> statement-breakpoint
DROP INDEX `refunds_purchase_idx`;
--> statement-breakpoint
CREATE INDEX `refund_requests_purchase_idx` ON `refund_requests` (`purchase_id`);
