import { describe, it, expect, beforeEach } from "vitest";
import { createTestDb, seedBaseData } from "~/test/setup";
import * as schema from "~/db/schema";
import { CourseStatus, LessonProgressStatus, UserRole } from "~/db/schema";
import {
  getInstructorAnalytics,
  type AnalyticsRequest,
} from "./analytics.server";

// Every test runs against a fresh in-memory database and a fixed `now`, so
// "seven days ago" means the same thing on every run.

type TestDb = ReturnType<typeof createTestDb>;

const NOW = new Date("2026-11-06T12:00:00.000Z");
const DAY = 86_400_000;

function ago(days: number) {
  return new Date(NOW.getTime() - days * DAY).toISOString();
}

let db: TestDb;
let base: ReturnType<typeof seedBaseData>;
let seq = 0;

beforeEach(() => {
  db = createTestDb();
  base = seedBaseData(db);
});

// ─── Builders ───

function addUser(role = UserRole.Student, name = `User ${++seq}`) {
  return db
    .insert(schema.users)
    .values({ name, email: `user${++seq}@example.com`, role })
    .returning()
    .get();
}

function addCourse(
  instructorId: number,
  { title = `Course ${++seq}`, status = CourseStatus.Published } = {}
) {
  return db
    .insert(schema.courses)
    .values({
      title,
      slug: `course-${++seq}`,
      description: "A course",
      salesCopy: "Sales copy",
      instructorId,
      categoryId: base.category.id,
      status,
    })
    .returning()
    .get();
}

function purchase(
  userId: number,
  courseId: number,
  amountPaid: number,
  { daysAgo = 1, country = "US" as string | null } = {}
) {
  return db
    .insert(schema.purchases)
    .values({ userId, courseId, amountPaid, country, createdAt: ago(daysAgo) })
    .returning()
    .get();
}

function enroll(userId: number, courseId: number, daysAgo = 1) {
  db.insert(schema.enrollments)
    .values({ userId, courseId, enrolledAt: ago(daysAgo) })
    .run();
}

/** A team purchase that minted `seats` coupons, redeemed by `redeemers`. */
function teamPurchase(
  buyerId: number,
  courseId: number,
  amountPaid: number,
  seats: number,
  redeemers: number[]
) {
  const bought = purchase(buyerId, courseId, amountPaid);
  const team = db.insert(schema.teams).values({}).returning().get();
  for (let seat = 0; seat < seats; seat++) {
    db.insert(schema.coupons)
      .values({
        teamId: team.id,
        courseId,
        code: `SEAT-${++seq}`,
        purchaseId: bought.id,
        redeemedByUserId: redeemers[seat] ?? null,
        redeemedAt: redeemers[seat] ? ago(1) : null,
      })
      .run();
  }
}

function addModule(courseId: number, position: number) {
  return db
    .insert(schema.modules)
    .values({ courseId, title: `Module ${position}`, position })
    .returning()
    .get();
}

function addLesson(moduleId: number, position: number) {
  return db
    .insert(schema.lessons)
    .values({ moduleId, title: `Lesson ${position}`, position })
    .returning()
    .get();
}

function progress(
  userId: number,
  lessonId: number,
  status: LessonProgressStatus
) {
  db.insert(schema.lessonProgress).values({ userId, lessonId, status }).run();
}

function comment(
  userId: number,
  lessonId: number,
  {
    daysAgo = 1,
    parentId = null as number | null,
    deletedAt = null as string | null,
  } = {}
) {
  return db
    .insert(schema.comments)
    .values({
      userId,
      lessonId,
      parentId,
      body: "Question?",
      createdAt: ago(daysAgo),
      deletedAt,
    })
    .returning()
    .get();
}

/** The analytics an instructor sees for themselves, with overrides. */
function analyticsFor(
  viewer: { id: number; role: UserRole },
  overrides: Partial<AnalyticsRequest> = {}
) {
  return getInstructorAnalytics(db, {
    viewer: { userId: viewer.id, isAdmin: viewer.role === UserRole.Admin },
    range: "30d",
    tab: "overview",
    requestedInstructorId: null,
    requestedCourseId: null,
    now: NOW,
    ...overrides,
  });
}

// ─── Tests ───

describe("getInstructorAnalytics", () => {
  describe("who the viewer may see", () => {
    let other: typeof schema.users.$inferSelect;
    let otherCourse: typeof schema.courses.$inferSelect;

    beforeEach(() => {
      other = addUser(UserRole.Instructor, "Other Instructor");
      otherCourse = addCourse(other.id);
      purchase(base.user.id, base.course.id, 1000);
      purchase(base.user.id, otherCourse.id, 5000);
    });

    it("pins an instructor to their own figures, whatever the URL asks", () => {
      const result = analyticsFor(base.instructor, {
        requestedInstructorId: other.id,
      });

      expect(result.instructorId).toBe(base.instructor.id);
      expect(result.summary.grossCents).toBe(1000);
      expect(result.courseOptions.map((c) => c.courseId)).toEqual([
        base.course.id,
      ]);
      expect(result.instructors).toEqual([]);
    });

    it("shows an admin platform-wide figures when no instructor is picked", () => {
      const admin = addUser(UserRole.Admin);
      const result = analyticsFor(admin);

      expect(result.instructorId).toBeNull();
      expect(result.summary.grossCents).toBe(6000);
      expect(result.instructors.map((i) => i.id).sort()).toEqual(
        [base.instructor.id, other.id].sort()
      );
      // The platform-wide view always has courses, so no empty state.
      expect(result.unpublished).toBe(false);
    });

    it("lets an admin look at one instructor", () => {
      const admin = addUser(UserRole.Admin);
      const result = analyticsFor(admin, { requestedInstructorId: other.id });

      expect(result.instructorId).toBe(other.id);
      expect(result.summary.grossCents).toBe(5000);
    });

    it("ignores a course the viewer doesn't own, and reads no course panels", () => {
      const result = analyticsFor(base.instructor, {
        tab: "course",
        requestedCourseId: otherCourse.id,
      });

      expect(result.selectedCourseId).toBeNull();
      expect(result.progress).toBeNull();
      expect(result.funnel).toBeNull();
      expect(result.quizzes).toBeNull();
      expect(result.countries).toBeNull();
    });

    it("reads the course panels for a course the viewer owns", () => {
      const result = analyticsFor(base.instructor, {
        tab: "course",
        requestedCourseId: base.course.id,
      });

      expect(result.selectedCourseId).toBe(base.course.id);
      expect(result.progress).not.toBeNull();
      expect(result.funnel).not.toBeNull();
      expect(result.quizzes).not.toBeNull();
      expect(result.countries).not.toBeNull();
    });

    it("prompts an instructor with nothing published to publish", () => {
      const newcomer = addUser(UserRole.Instructor);
      addCourse(newcomer.id, { status: CourseStatus.Draft });

      expect(analyticsFor(newcomer).unpublished).toBe(true);
      expect(analyticsFor(base.instructor).unpublished).toBe(false);
    });
  });

  describe("the range", () => {
    it("includes a sale exactly on the boundary, and not one a moment before", () => {
      const start = NOW.getTime() - 7 * DAY;
      for (const createdAt of [start, start - 1]) {
        db.insert(schema.purchases)
          .values({
            userId: base.user.id,
            courseId: base.course.id,
            amountPaid: createdAt === start ? 100 : 9999,
            createdAt: new Date(createdAt).toISOString(),
          })
          .run();
      }

      const result = analyticsFor(base.instructor, { range: "7d" });

      expect(result.summary).toEqual({
        grossCents: 100,
        feeCents: 20,
        netCents: 80,
        purchaseCount: 1,
      });
    });

    it("counts everything for all time", () => {
      purchase(base.user.id, base.course.id, 1000, { daysAgo: 400 });
      purchase(base.user.id, base.course.id, 1000, { daysAgo: 1 });

      expect(
        analyticsFor(base.instructor, { range: "all" }).summary.purchaseCount
      ).toBe(2);
      expect(
        analyticsFor(base.instructor, { range: "30d" }).summary.purchaseCount
      ).toBe(1);
    });
  });

  describe("revenue", () => {
    it("splits gross into the platform fee and the instructor's net", () => {
      purchase(base.user.id, base.course.id, 4999);

      expect(analyticsFor(base.instructor).summary).toEqual({
        grossCents: 4999,
        feeCents: 1000,
        netCents: 3999,
        purchaseCount: 1,
      });
    });

    it("lists courses biggest earner first, leaving out courses with no sales", () => {
      const big = addCourse(base.instructor.id, { title: "Big" });
      addCourse(base.instructor.id, { title: "Unsold" });
      purchase(base.user.id, base.course.id, 1000);
      purchase(base.user.id, big.id, 3000);

      const result = analyticsFor(base.instructor);

      expect(result.courses.map((c) => [c.title, c.grossCents])).toEqual([
        ["Big", 3000],
        ["Test Course", 1000],
      ]);
    });

    it("charts every day of a fixed range, including days with no sales", () => {
      purchase(base.user.id, base.course.id, 500, { daysAgo: 2 });

      const { series } = analyticsFor(base.instructor, { range: "7d" });

      expect(series.granularity).toBe("day");
      expect(series.points.map((p) => p.bucket)).toEqual([
        "2026-10-30",
        "2026-10-31",
        "2026-11-01",
        "2026-11-02",
        "2026-11-03",
        "2026-11-04",
        "2026-11-05",
        "2026-11-06",
      ]);
      expect(series.points.find((p) => p.bucket === "2026-11-04")).toEqual({
        bucket: "2026-11-04",
        grossCents: 500,
        netCents: 400,
      });
    });

    it("charts all time by month, from the first sale, or not at all", () => {
      expect(analyticsFor(base.instructor, { range: "all" }).series).toEqual({
        granularity: "month",
        points: [],
      });

      purchase(base.user.id, base.course.id, 500, { daysAgo: 70 });
      const { series } = analyticsFor(base.instructor, { range: "all" });

      expect(series.points.map((p) => p.bucket)).toEqual([
        "2026-08",
        "2026-09",
        "2026-10",
        "2026-11",
      ]);
    });
  });

  describe("audience and buyers", () => {
    it("counts one team purchase as one buyer, and shares its price across seat holders", () => {
      const teamBuyer = addUser(UserRole.Student, "Team Buyer");
      const soloBuyer = addUser(UserRole.Student, "Solo Buyer");
      const seatA = addUser();
      const seatB = addUser();

      purchase(soloBuyer.id, base.course.id, 5000);
      enroll(soloBuyer.id, base.course.id);
      // Three seats, two claimed. Each claimed seat carries a third of 3333.
      teamPurchase(teamBuyer.id, base.course.id, 3333, 3, [seatA.id, seatB.id]);
      enroll(seatA.id, base.course.id);
      enroll(seatB.id, base.course.id);

      const result = analyticsFor(base.instructor);

      expect(result.audience).toEqual({
        buyerCount: 2,
        studentCount: 3,
        revenuePerStudentCents: Math.round((5000 + 1111 + 1111) / 3),
      });

      expect(result.buyers).toEqual([
        {
          userId: soloBuyer.id,
          name: "Solo Buyer",
          email: soloBuyer.email,
          spendCents: 5000,
          purchaseCount: 1,
          seatsBought: 0,
          seatsUnredeemed: 0,
          enrolled: true,
        },
        {
          userId: teamBuyer.id,
          name: "Team Buyer",
          email: teamBuyer.email,
          spendCents: 3333,
          purchaseCount: 1,
          seatsBought: 3,
          seatsUnredeemed: 1,
          enrolled: false,
        },
      ]);
    });

    it("has no revenue per student when nobody is enrolled", () => {
      expect(analyticsFor(base.instructor).audience).toEqual({
        buyerCount: 0,
        studentCount: 0,
        revenuePerStudentCents: null,
      });
    });
  });

  describe("unanswered questions", () => {
    it("counts only top-level, live, student questions with no staff reply", () => {
      const lesson = addLesson(addModule(base.course.id, 1).id, 1);
      const student = base.user.id;
      const classmate = addUser().id;
      const admin = addUser(UserRole.Admin).id;

      // Counted: unanswered, in range.
      comment(student, lesson.id, { daysAgo: 2 });
      // Counted: a classmate's reply isn't an answer.
      const helped = comment(student, lesson.id, { daysAgo: 3 });
      comment(classmate, lesson.id, { parentId: helped.id });
      // Counted, but older than the range.
      comment(student, lesson.id, { daysAgo: 60 });

      // Not counted: answered by the instructor, or by an admin.
      const answered = comment(student, lesson.id);
      comment(base.instructor.id, lesson.id, { parentId: answered.id });
      const adminAnswered = comment(student, lesson.id);
      comment(admin, lesson.id, { parentId: adminAnswered.id });
      // Not counted: deleted, or asked by staff.
      comment(student, lesson.id, { deletedAt: ago(1) });
      comment(base.instructor.id, lesson.id);
      comment(admin, lesson.id);

      expect(analyticsFor(base.instructor).questions).toEqual({
        inRange: 2,
        older: 1,
      });
    });

    it("still counts a question whose only staff reply was deleted", () => {
      const lesson = addLesson(addModule(base.course.id, 1).id, 1);
      const question = comment(base.user.id, lesson.id);
      comment(base.instructor.id, lesson.id, {
        parentId: question.id,
        deletedAt: ago(1),
      });

      expect(analyticsFor(base.instructor).questions.inRange).toBe(1);
    });
  });

  describe("ratings", () => {
    it("averages ratings in range to one decimal place", () => {
      for (const [rating, daysAgo] of [
        [5, 1],
        [4, 2],
        [4, 3],
        [1, 90],
      ]) {
        db.insert(schema.courseRatings)
          .values({
            userId: addUser().id,
            courseId: base.course.id,
            rating,
            createdAt: ago(daysAgo),
          })
          .run();
      }

      expect(analyticsFor(base.instructor).ratings).toEqual({
        average: 4.3,
        count: 3,
      });
    });

    it("has no average with no ratings", () => {
      expect(analyticsFor(base.instructor).ratings).toEqual({
        average: null,
        count: 0,
      });
    });
  });

  describe("the course tab", () => {
    let lessonIds: number[];
    let finisher: number;
    let starter: number;
    let idler: number;

    beforeEach(() => {
      const first = addModule(base.course.id, 1);
      const second = addModule(base.course.id, 2);
      lessonIds = [
        addLesson(first.id, 1).id,
        addLesson(first.id, 2).id,
        addLesson(second.id, 1).id,
      ];

      finisher = addUser().id;
      starter = addUser().id;
      idler = addUser().id;
      for (const id of [finisher, starter, idler]) enroll(id, base.course.id);

      for (const lessonId of lessonIds) {
        progress(finisher, lessonId, LessonProgressStatus.Completed);
      }
      progress(starter, lessonIds[0], LessonProgressStatus.InProgress);

      // Never enrolled: their progress must not inflate the funnel.
      const stray = addUser().id;
      for (const lessonId of lessonIds) {
        progress(stray, lessonId, LessonProgressStatus.Completed);
      }
    });

    function courseTab(overrides: Partial<AnalyticsRequest> = {}) {
      return analyticsFor(base.instructor, {
        tab: "course",
        requestedCourseId: base.course.id,
        ...overrides,
      });
    }

    it("summarises progress across every enrollee, including ones who never started", () => {
      expect(courseTab().progress).toEqual({
        enrolledCount: 3,
        totalLessons: 3,
        averageProgressPercent: 33,
        finishedCount: 1,
      });
    });

    it("shows how many enrollees reached each lesson, and where they dropped", () => {
      const { funnel } = courseTab();

      expect(funnel?.enrolledCount).toBe(3);
      expect(
        funnel?.modules.map((m) => ({
          reached: m.reachedCount,
          dropWithin: m.dropWithin,
          lessons: m.lessons.map((l) => [l.reachedCount, l.dropFromPrevious]),
        }))
      ).toEqual([
        {
          reached: 2,
          dropWithin: 1,
          lessons: [
            [2, 1],
            [1, 1],
          ],
        },
        { reached: 1, dropWithin: 0, lessons: [[1, 0]] },
      ]);
    });

    it("judges each student's quiz by their best attempt in range", () => {
      const quiz = db
        .insert(schema.quizzes)
        .values({
          lessonId: lessonIds[0],
          title: "Check-in",
          passingScore: 0.7,
        })
        .returning()
        .get();
      const attempt = (
        userId: number,
        score: number,
        passed: boolean,
        daysAgo = 1
      ) =>
        db
          .insert(schema.quizAttempts)
          .values({
            userId,
            quizId: quiz.id,
            score,
            passed,
            attemptedAt: ago(daysAgo),
          })
          .run();

      attempt(finisher, 0.5, false);
      attempt(finisher, 0.9, true);
      attempt(starter, 0.6, false);
      attempt(idler, 1, true, 60); // outside 30d

      expect(courseTab().quizzes).toEqual([
        {
          quizId: quiz.id,
          title: "Check-in",
          moduleTitle: "Module 1",
          lessonTitle: "Lesson 1",
          passingScorePercent: 70,
          studentCount: 2,
          passedCount: 1,
          passRatePercent: 50,
          averageBestScorePercent: 75,
        },
      ]);
    });

    it("breaks revenue down by country, flagging PPP-discounted sales", () => {
      purchase(base.user.id, base.course.id, 12000, { country: "US" });
      purchase(base.user.id, base.course.id, 5000, { country: "IN" });
      purchase(base.user.id, base.course.id, 5000, { country: "IN" });
      purchase(base.user.id, base.course.id, 99999, {
        country: "IN",
        daysAgo: 60,
      });

      const { countries } = courseTab();

      expect(countries).toMatchObject({
        grossCents: 22000,
        netCents: 17600,
        purchaseCount: 3,
        discountedGrossCents: 10000,
        discountedNetCents: 8000,
        discountedSharePercent: 45,
      });
      expect(countries?.rows).toEqual([
        {
          country: "US",
          purchaseCount: 1,
          grossCents: 12000,
          netCents: 9600,
          sharePercent: 55,
          averagePaidCents: 12000,
          discountPercent: 0,
        },
        {
          country: "IN",
          purchaseCount: 2,
          grossCents: 10000,
          netCents: 8000,
          sharePercent: 45,
          averagePaidCents: 5000,
          discountPercent: 50,
        },
      ]);
    });
  });
});
