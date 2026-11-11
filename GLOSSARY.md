# Cadence

An online course platform where learners buy courses, watch lessons and track their progress.

## Language

### Buying and access

**Purchase**:
One payment for a course. It is either an Individual Purchase or a Team Licence.
_Avoid_: Order, transaction

**Individual Purchase**:
A Purchase someone makes for themselves. It gives the buyer an Enrollment in the course.
_Avoid_: Self purchase, personal licence

**Team Licence**:
A Purchase of a number of Seats in a course, made by a Team Admin for other people. It gives the buyer Seats, not an Enrollment; to take the course themselves they claim one of their own Seats.
_Avoid_: Team purchase, bulk purchase, group licence

**Seat**:
One person's place in a course within a Team Licence. It is unclaimed until someone claims it, which gives them an Enrollment. Whoever claims a Seat pays nothing and owns no Purchase. While its Team Licence has a Refund Request that is Requested, an unclaimed Seat cannot be claimed. If the Refund is Approved, the Seat ends; if the Request is Declined, it can be claimed again.
_Avoid_: Coupon, code, voucher (those suggest a discount)

**Seat Price**:
What one Seat in a Team Licence cost: the amount paid for the Team Licence divided by its number of Seats.
_Avoid_: Unit price, per-seat cost

**Team Admin**:
The person who bought a Team Licence and hands out its Seats.
_Avoid_: Admin (on its own; that is Cadence staff), team owner, Team Member

**Enrollment**:
A learner's access to a course, gained either through an Individual Purchase or by claiming a Seat. A learner has at most one Enrollment in a course at a time.
_Avoid_: Registration, subscription

**Progress History**:
Everything a learner has done in a course: lessons completed, how far they watched, quiz attempts, comments and ratings. It belongs to the learner, not to their Enrollment, so it survives losing access and is all there again if they enroll again.
_Avoid_: Enrollment progress

### Money back

**Refund**:
A buyer's money for a Purchase given back through Cadence, at the buyer's request and with approval from a Support Team Member. Money is only ever given back in full for what it bought, and never while access remains. It never touches anyone's Progress History. For an Individual Purchase it gives back the whole amount paid and ends the Purchase and the Enrollment it granted. For a Team Licence it gives back the Seat Price of each unclaimed Seat, and those Seats end; claimed Seats, including one claimed by the Team Admin, keep their access and are not Refunded. Someone who claimed a Seat paid nothing, so can never get a Refund.
_Avoid_: Cancellation, reversal, money back, partial refund

**Refund Request**:
A buyer's ask for a Refund on one of their Purchases: a learner on an Individual Purchase, or a Team Admin on a Team Licence. It is Requested until a Support Team Member reviews it, then either Approved (which produces a Refund) or Declined (which changes nothing). It is judged as it stood when raised. A Purchase gets at most one Refund Request, so a Decline is final. A Support Team Member may not review their own Refund Request.
_Avoid_: Refund (for the ask itself), cancellation request, reversal request

**Request Reason**:
The buyer's own words, given when raising a Refund Request, on why they want a Refund.
_Avoid_: Reason (on its own), note

**Decline Note**:
A Support Team Member's explanation, sent to the buyer, of why a Refund Request was Declined. Every Decline has one; an Approval does not.
_Avoid_: Reason (on its own), decline reason, rejection message

**Refund Window**:
The period in which a buyer may raise a Refund Request on a Purchase, the same for every kind of Purchase: from the day of the Purchase through the fourteenth calendar day after it, with that last day included in full.
_Avoid_: Cancellation window, cancel window

**Refund Eligibility**:
Whether a buyer may raise a Refund Request on a Purchase right now. Every Purchase must be inside its Refund Window and must never have had a Refund Request before. For an Individual Purchase, among other conditions, the learner must never have had a Refund on that course: a learner may always buy a course again after a Refund, but gets at most one Refund per course, and a Declined Refund Request does not count toward that limit. For a Team Licence, the only other condition is that at least one Seat is unclaimed; a Team Licence Refund always covers all of its unclaimed Seats.
_Avoid_: Cancellation offer, cancellable

**Support Team Member**:
A Cadence staff member who reviews Refund Requests, deciding whether each is Approved or Declined. Today, any Admin is a Support Team Member.
_Avoid_: Team Member (that is a member of a learner's team), reviewer, support agent

**Revocation**:
Ending a learner's access to a course without giving money back. Out of scope: Cadence does not support Revocations today.
_Avoid_: Cancellation, ban

**Chargeback**:
Money for a Purchase pulled back by the learner's bank or card issuer through a dispute, without Cadence's approval. Distinct from a Refund. Out of scope: Cadence does not handle Chargebacks today.
_Avoid_: Refund, dispute refund
