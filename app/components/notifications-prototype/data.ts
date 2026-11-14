// PROTOTYPE — throwaway. Issue #7: what does the in-app Notification inbox look like?
// In-memory mock Notifications built from the v1 triggers in issue #5. No DB, no persistence.

export type NotificationKind =
  | "refund-raised" // #1 → Platform Admins, waiting on you, transactional
  | "refund-approved" // #3 → buyer, transactional
  | "refund-declined" // #4 → buyer, transactional
  | "question" // #10 → Course Instructor (+ Platform Admins), waiting on you, optional
  | "reply"; // #11 → comment author, optional

export interface ProtoNotification {
  id: string;
  kind: NotificationKind;
  transactional: boolean;
  waitingOnYou: boolean;
  title: string;
  body: string;
  course: string;
  actor: string;
  href: string;
  minutesAgo: number;
  read: boolean;
  archived: boolean;
  /** Set when someone else already acted: a Resolved Notification. */
  resolvedBy?: string;
}

const COURSES = [
  { title: "Introduction to TypeScript", slug: "introduction-to-typescript" },
  { title: "Design Systems with Tailwind", slug: "design-systems-with-tailwind" },
  { title: "Building REST APIs with Node.js", slug: "building-rest-apis-with-nodejs" },
  { title: "Practical Data Visualisation", slug: "practical-data-visualisation" },
];

const LESSONS = [
  { id: 1, title: "What is TypeScript?" },
  { id: 4, title: "Primitive Types" },
  { id: 5, title: "Arrays and Tuples" },
  { id: 6, title: "Type Aliases and Interfaces" },
];

const STUDENTS = [
  "Emma Wilson", "James Park", "Olivia Martinez", "Liam Thompson", "Sophia Davis",
  "Ava Nakamura", "Noah Blackwood", "Isla Fernandes", "Ethan Okafor", "Mia Lindqvist",
];

const QUESTION_SNIPPETS = [
  "Why does `as const` make this array readonly?",
  "Is `interface` or `type` better for React props?",
  "The tuple example errors for me on TS 5.6, am I missing a flag?",
  "How would you type a function that returns either a string or undefined?",
  "Could you explain the difference between `unknown` and `any` again?",
  "My tsconfig has `strict: false`. Does that change anything in this lesson?",
  "Is there a way to make the tuple labels show up in hover?",
];

function ago(i: number) {
  return 7 + i * 47;
}

function question(i: number, opts: { resolvedBy?: string; read?: boolean } = {}): ProtoNotification {
  const course = COURSES[i % 2 === 0 ? 0 : 1];
  const lesson = LESSONS[i % LESSONS.length];
  const student = STUDENTS[i % STUDENTS.length];
  return {
    id: `q-${i}`,
    kind: "question",
    transactional: false,
    waitingOnYou: !opts.resolvedBy,
    title: `${student} asked a Question`,
    body: QUESTION_SNIPPETS[i % QUESTION_SNIPPETS.length],
    course: course.title,
    actor: student,
    href: `/courses/${course.slug}/lessons/${lesson.id}`,
    minutesAgo: ago(i),
    read: opts.read ?? false,
    archived: false,
    resolvedBy: opts.resolvedBy,
  };
}

function reply(i: number, actor: string, read = false): ProtoNotification {
  const lesson = LESSONS[(i + 1) % LESSONS.length];
  return {
    id: `r-${i}`,
    kind: "reply",
    transactional: false,
    waitingOnYou: false,
    title: `${actor} replied to your comment`,
    body: [
      "Good catch, I've updated the lesson notes with the TS 5.6 behaviour.",
      "Same thing happened to me, turning on `noUncheckedIndexedAccess` fixed it.",
      "Yes, `unknown` forces you to narrow before use. That's the whole point.",
    ][i % 3],
    course: COURSES[0].title,
    actor,
    href: `/courses/${COURSES[0].slug}/lessons/${lesson.id}`,
    minutesAgo: ago(i) + 13,
    read,
    archived: false,
  };
}

export type Volume = "normal" | "high";

export function buildNotifications(role: string | null, volume: Volume): ProtoNotification[] {
  if (role === "student") {
    return [
      {
        id: "ra-1",
        kind: "refund-approved",
        transactional: true,
        waitingOnYou: false,
        title: "Your Refund Request was approved",
        body: "Your Enrollment on Practical Data Visualisation has ended. A Refund of $49.00 is on its way.",
        course: COURSES[3].title,
        actor: "Alex Rivera",
        href: `/courses/${COURSES[3].slug}`,
        minutesAgo: 22,
        read: false,
        archived: false,
      },
      reply(0, "Sarah Chen"),
      reply(1, "James Park"),
      ...(volume === "high"
        ? Array.from({ length: 18 }, (_, i) => reply(i + 2, STUDENTS[(i + 1) % STUDENTS.length], i > 4))
        : []),
      {
        id: "rd-1",
        kind: "refund-declined",
        transactional: true,
        waitingOnYou: false,
        title: "Your Refund Request was declined",
        body: "You've watched past the Watch Limit on Building REST APIs with Node.js. You keep your Enrollment.",
        course: COURSES[2].title,
        actor: "Alex Rivera",
        href: `/courses/${COURSES[2].slug}`,
        minutesAgo: 60 * 24 * 9,
        read: true,
        archived: false,
      },
    ];
  }

  const qCount = volume === "high" ? 64 : 6;
  const questions = Array.from({ length: qCount }, (_, i) =>
    question(i, {
      // Every 5th Question was answered by a Platform Admin first → Resolved Notification.
      resolvedBy: i % 5 === 3 ? "Alex Rivera (Platform Admin)" : undefined,
      read: i > qCount * 0.6,
    })
  );

  if (role === "admin") {
    return [
      {
        id: "rr-1",
        kind: "refund-raised",
        transactional: true,
        waitingOnYou: true,
        title: "Emma Wilson raised a Refund Request",
        body: "“The course wasn't what I expected.” Practical Data Visualisation, $49.00.",
        course: COURSES[3].title,
        actor: "Emma Wilson",
        href: "/admin/refunds",
        minutesAgo: 35,
        read: false,
        archived: false,
      },
      {
        id: "rr-2",
        kind: "refund-raised",
        transactional: true,
        waitingOnYou: false,
        title: "Liam Thompson raised a Refund Request",
        body: "Team Licence for Introduction to TypeScript, 5 Seats, $245.00.",
        course: COURSES[0].title,
        actor: "Liam Thompson",
        href: "/admin/refunds",
        minutesAgo: 60 * 5,
        read: false,
        archived: false,
        resolvedBy: "Jordan Lee (Platform Admin) declined it",
      },
      ...questions,
    ];
  }

  // Instructor (and the fallback when nobody is signed in).
  return [
    ...questions,
    reply(0, "Olivia Martinez"),
    reply(1, "Noah Blackwood", true),
  ];
}

export function formatAgo(minutes: number) {
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)}h`;
  return `${Math.round(minutes / (60 * 24))}d`;
}

/** Prioritisation used by several variants: waiting-on-you, then transactional, then the rest; resolved last. */
export function priority(n: ProtoNotification) {
  if (n.resolvedBy) return 3;
  if (n.waitingOnYou) return 0;
  if (n.transactional) return 1;
  return 2;
}
