// PROTOTYPE — throwaway. Issue #7: what does the in-app Notification inbox look like for Students and Instructors?
// Four variants of the Notification entry point + inbox, mounted in the real app shell (layout.app.tsx),
// switchable with ?variant=A|B|C|D. Add ?volume=high to see an Instructor with many Questions.
// State is in memory only: reload resets it.
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router";
import {
  Activity,
  Archive,
  Bell,
  BellDot,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  Inbox,
  MailOpen,
  MessageCircleQuestion,
  Reply,
  X,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { PrototypeSwitcher } from "~/components/prototype-switcher";
import {
  buildNotifications,
  formatAgo,
  priority,
  type ProtoNotification,
  type Volume,
} from "./data";

const VARIANTS = [
  { key: "A", name: "Bell popover" },
  { key: "B", name: "Inbox page with triage" },
  { key: "C", name: "Banners + grouped drawer" },
  { key: "D", name: "No inbox: badges in place" },
];

// ---------- shared state ----------

interface Store {
  items: ProtoNotification[];
  open: (n: ProtoNotification) => void;
  setRead: (ids: string[], read: boolean) => void;
  archive: (ids: string[]) => void;
}

function useStore(role: string | null, volume: Volume): Store {
  const navigate = useNavigate();
  const [items, setItems] = useState(() => buildNotifications(role, volume));
  useEffect(() => setItems(buildNotifications(role, volume)), [role, volume]);

  const setRead = (ids: string[], read: boolean) =>
    setItems((xs) => xs.map((n) => (ids.includes(n.id) ? { ...n, read } : n)));
  return {
    items: items.filter((n) => !n.archived),
    setRead,
    archive: (ids) =>
      setItems((xs) => xs.map((n) => (ids.includes(n.id) ? { ...n, archived: true, read: true } : n))),
    open: (n) => {
      setRead([n.id], true);
      navigate(n.href);
    },
  };
}

function KindIcon({ n, className }: { n: ProtoNotification; className?: string }) {
  const c = cn("size-4 shrink-0", className);
  if (n.kind === "question") return <MessageCircleQuestion className={c} />;
  if (n.kind === "reply") return <Reply className={c} />;
  return <CircleDollarSign className={c} />;
}

function countBadge(n: number, tone: "red" | "muted" = "red") {
  if (n === 0) return null;
  return (
    <span
      className={cn(
        "ml-auto min-w-5 rounded-full px-1.5 text-center text-xs font-semibold leading-5",
        tone === "red" ? "bg-red-600 text-white" : "bg-sidebar-accent text-sidebar-foreground/70"
      )}
    >
      {n > 99 ? "99+" : n}
    </span>
  );
}

const unreadActive = (xs: ProtoNotification[]) => xs.filter((n) => !n.read && !n.resolvedBy);

// ---------- Variant A: bell popover ----------

function BellPopover({ store }: { store: Store }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"all" | "unread">("all");
  const unread = unreadActive(store.items);
  const list = (tab === "all" ? store.items : store.items.filter((n) => !n.read))
    .slice()
    .sort((a, b) => a.minutesAgo - b.minutesAgo);
  const shown = list.slice(0, 8);

  return (
    <div className="relative ml-auto">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-md p-1.5 text-sidebar-foreground/70 hover:bg-sidebar-accent"
        title="Notifications"
      >
        <Bell className="size-5" />
        {unread.length > 0 && (
          <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-red-600 px-1 text-[10px] font-bold leading-4 text-white">
            {unread.length > 9 ? "9+" : unread.length}
          </span>
        )}
      </button>
      {open && (
        <div className="fixed left-[14.5rem] top-2 z-50 flex max-h-[85vh] w-[26rem] flex-col rounded-lg border bg-popover text-popover-foreground shadow-2xl">
          <div className="flex items-center gap-2 border-b px-4 py-3">
            <span className="font-semibold">Notifications</span>
            <div className="ml-auto flex rounded-md bg-muted p-0.5 text-xs">
              {(["all", "unread"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={cn("rounded px-2 py-1 capitalize", tab === t && "bg-background shadow-sm")}
                >
                  {t}
                </button>
              ))}
            </div>
            <button onClick={() => setOpen(false)} className="rounded p-1 hover:bg-muted">
              <X className="size-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {shown.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">You're all caught up.</p>}
            {shown.map((n) => (
              <button
                key={n.id}
                onClick={() => {
                  store.open(n);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full gap-3 border-b px-4 py-3 text-left hover:bg-muted/60",
                  n.resolvedBy && "opacity-55"
                )}
              >
                <KindIcon n={n} className="mt-0.5 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className={cn("text-sm", !n.read && !n.resolvedBy && "font-semibold")}>{n.title}</div>
                  <div className="line-clamp-2 text-sm text-muted-foreground">{n.body}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {n.course} · {formatAgo(n.minutesAgo)}
                  </div>
                  {n.resolvedBy && (
                    <div className="mt-1 inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-xs">
                      <Check className="size-3" /> Handled by {n.resolvedBy}
                    </div>
                  )}
                </div>
                {!n.read && !n.resolvedBy && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-blue-600" />}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between border-t px-4 py-2 text-sm">
            <button onClick={() => store.setRead(store.items.map((n) => n.id), true)} className="text-primary hover:underline">
              Mark all as read
            </button>
            <span className="text-muted-foreground" title="This variant has no full inbox page: that's the point of it.">
              {list.length > shown.length ? `+${list.length - shown.length} older not shown` : ""}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Variant B: full inbox page with triage ----------

type Folder = "waiting" | "updates" | "replies" | "resolved" | "all";
const PAGE_SIZE = 15;

function InboxNavItem({ store }: { store: Store }) {
  const [params, setParams] = useSearchParams();
  const active = params.get("inbox") === "1";
  const waiting = store.items.filter((n) => n.waitingOnYou && !n.resolvedBy && !n.read).length;
  const unread = unreadActive(store.items).length;
  return (
    <button
      onClick={() => {
        const p = new URLSearchParams(params);
        p.set("inbox", "1");
        setParams(p);
      }}
      className={cn(
        "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      )}
    >
      <Inbox className="size-4" />
      Inbox
      {waiting > 0 ? countBadge(waiting) : countBadge(unread, "muted")}
    </button>
  );
}

function InboxPage({ store }: { store: Store }) {
  const [folder, setFolder] = useState<Folder>(() =>
    store.items.some((n) => n.waitingOnYou && !n.resolvedBy) ? "waiting" : "all"
  );
  const [course, setCourse] = useState("all");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);

  const inFolder = (n: ProtoNotification, f: Folder) =>
    f === "all"
      ? true
      : f === "resolved"
        ? !!n.resolvedBy
        : f === "waiting"
          ? n.waitingOnYou && !n.resolvedBy
          : f === "updates"
            ? n.transactional && !n.waitingOnYou && !n.resolvedBy
            : n.kind === "reply";

  const folders: { key: Folder; label: string; hint: string }[] = [
    { key: "waiting", label: "Waiting on you", hint: "Questions and Refund Requests only you (or your co-handlers) can act on" },
    { key: "updates", label: "Money & access", hint: "Transactional: can't be turned off" },
    { key: "replies", label: "Replies", hint: "Optional" },
    { key: "resolved", label: "Resolved", hint: "Someone else already handled it" },
    { key: "all", label: "All", hint: "" },
  ];
  const visibleFolders = folders.filter((f) => f.key === "all" || store.items.some((n) => inFolder(n, f.key)));
  const courses = Array.from(new Set(store.items.map((n) => n.course)));

  const list = store.items
    .filter((n) => inFolder(n, folder) && (course === "all" || n.course === course))
    .sort((a, b) => (sort === "newest" ? a.minutesAgo - b.minutesAgo : b.minutesAgo - a.minutesAgo));
  const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const pageItems = list.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const allOnPage = pageItems.length > 0 && pageItems.every((n) => selected.includes(n.id));

  useEffect(() => {
    setPage(0);
    setSelected([]);
  }, [folder, course, sort]);

  return (
    <div className="flex h-full">
      <div className="w-60 shrink-0 border-r p-4">
        <h1 className="mb-4 text-xl font-bold">Inbox</h1>
        <div className="space-y-1">
          {visibleFolders.map((f) => {
            const n = store.items.filter((x) => inFolder(x, f.key) && !x.read && !x.resolvedBy).length;
            return (
              <button
                key={f.key}
                onClick={() => setFolder(f.key)}
                title={f.hint}
                className={cn(
                  "flex w-full items-center rounded-md px-3 py-2 text-left text-sm",
                  folder === f.key ? "bg-accent font-semibold" : "hover:bg-accent/60"
                )}
              >
                {f.label}
                {n > 0 && <span className="ml-auto text-xs font-semibold text-muted-foreground">{n}</span>}
              </button>
            );
          })}
        </div>
        <p className="mt-6 px-3 text-xs text-muted-foreground">
          {folders.find((f) => f.key === folder)?.hint}
        </p>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2 border-b px-4 py-2 text-sm">
          <input
            type="checkbox"
            checked={allOnPage}
            onChange={() => setSelected(allOnPage ? [] : pageItems.map((n) => n.id))}
          />
          {selected.length > 0 ? (
            <>
              <span className="text-muted-foreground">{selected.length} selected</span>
              <button className="inline-flex items-center gap-1 rounded px-2 py-1 hover:bg-accent" onClick={() => { store.setRead(selected, true); setSelected([]); }}>
                <CheckCheck className="size-4" /> Mark read
              </button>
              <button className="inline-flex items-center gap-1 rounded px-2 py-1 hover:bg-accent" onClick={() => { store.setRead(selected, false); setSelected([]); }}>
                <MailOpen className="size-4" /> Mark unread
              </button>
              <button className="inline-flex items-center gap-1 rounded px-2 py-1 hover:bg-accent" onClick={() => { store.archive(selected); setSelected([]); }}>
                <Archive className="size-4" /> Archive
              </button>
            </>
          ) : (
            <span className="text-muted-foreground">{list.length} Notifications</span>
          )}
          <div className="ml-auto flex items-center gap-2">
            {courses.length > 1 && (
              <select className="rounded border bg-background px-2 py-1" value={course} onChange={(e) => setCourse(e.target.value)}>
                <option value="all">All courses</option>
                {courses.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            )}
            <select className="rounded border bg-background px-2 py-1" value={sort} onChange={(e) => setSort(e.target.value as "newest" | "oldest")}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest waiting first</option>
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {pageItems.length === 0 && <p className="p-10 text-center text-muted-foreground">Nothing here.</p>}
          {pageItems.map((n) => (
            <div
              key={n.id}
              className={cn(
                "flex items-center gap-3 border-b px-4 py-2.5 text-sm hover:bg-accent/40",
                !n.read && !n.resolvedBy && "bg-blue-50/60 dark:bg-blue-950/20"
              )}
            >
              <input
                type="checkbox"
                checked={selected.includes(n.id)}
                onChange={() => setSelected((s) => (s.includes(n.id) ? s.filter((x) => x !== n.id) : [...s, n.id]))}
              />
              <KindIcon n={n} className="text-muted-foreground" />
              <button onClick={() => store.open(n)} className="flex min-w-0 flex-1 items-baseline gap-2 text-left">
                <span className={cn("w-56 shrink-0 truncate", !n.read && !n.resolvedBy && "font-semibold")}>{n.title}</span>
                <span className="truncate text-muted-foreground">{n.body}</span>
              </button>
              {n.resolvedBy ? (
                <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs">✓ {n.resolvedBy}</span>
              ) : (
                <span className="w-44 shrink-0 truncate text-xs text-muted-foreground">{n.course}</span>
              )}
              <span className="w-10 shrink-0 text-right text-xs text-muted-foreground">{formatAgo(n.minutesAgo)}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-end gap-3 border-t px-4 py-2 pb-16 text-sm">
          <span className="text-muted-foreground">
            {list.length === 0 ? 0 : page * PAGE_SIZE + 1}–{Math.min(list.length, (page + 1) * PAGE_SIZE)} of {list.length}
          </span>
          <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="rounded border px-2 py-1 disabled:opacity-40">
            Prev
          </button>
          <button disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)} className="rounded border px-2 py-1 disabled:opacity-40">
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Variant C: transactional banners + grouped activity drawer ----------

function TransactionalBanners({ store }: { store: Store }) {
  const banners = store.items.filter((n) => n.transactional && !n.read && !n.resolvedBy);
  if (banners.length === 0) return null;
  return (
    <div className="space-y-px">
      {banners.map((n) => (
        <div
          key={n.id}
          className={cn(
            "flex items-center gap-3 px-6 py-3 text-sm",
            n.kind === "refund-declined"
              ? "bg-amber-100 text-amber-950 dark:bg-amber-900/40 dark:text-amber-100"
              : n.waitingOnYou
                ? "bg-blue-100 text-blue-950 dark:bg-blue-900/40 dark:text-blue-100"
                : "bg-emerald-100 text-emerald-950 dark:bg-emerald-900/40 dark:text-emerald-100"
          )}
        >
          <KindIcon n={n} />
          <span className="font-semibold">{n.title}.</span>
          <span className="truncate">{n.body}</span>
          <button onClick={() => store.open(n)} className="ml-auto shrink-0 rounded bg-black/10 px-2 py-1 font-medium hover:bg-black/20">
            {n.waitingOnYou ? "Review" : "View"}
          </button>
          <button onClick={() => store.setRead([n.id], true)} className="shrink-0 rounded p-1 hover:bg-black/10" title="Dismiss">
            <X className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

function ActivityNavItem({ onOpen, store }: { onOpen: () => void; store: Store }) {
  const unread = unreadActive(store.items).filter((n) => !n.transactional).length;
  return (
    <button
      onClick={onOpen}
      className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
    >
      {unread > 0 ? <BellDot className="size-4 text-red-600" /> : <Activity className="size-4" />}
      Activity
      {countBadge(unread, "muted")}
    </button>
  );
}

function GroupedDrawer({ store, onClose }: { store: Store; onClose: () => void }) {
  const groups = useMemo(() => {
    const live = store.items.filter((n) => !n.resolvedBy && !n.transactional);
    const map = new Map<string, ProtoNotification[]>();
    for (const n of live) {
      const key = n.kind === "question" ? `Questions · ${n.course}` : "Replies to you";
      map.set(key, [...(map.get(key) ?? []), n]);
    }
    return Array.from(map.entries()).sort(([a], [b]) => (a.startsWith("Questions") ? -1 : 1) - (b.startsWith("Questions") ? -1 : 1));
  }, [store.items]);
  const resolved = store.items.filter((n) => n.resolvedBy);
  const transactional = store.items.filter((n) => n.transactional && !n.resolvedBy);
  const [expanded, setExpanded] = useState<string[]>([]);
  const [showResolved, setShowResolved] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/20" onClick={onClose}>
      <div className="flex h-full w-[28rem] flex-col bg-background shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center border-b px-4 py-3">
          <span className="font-semibold">Activity</span>
          <button onClick={onClose} className="ml-auto rounded p-1 hover:bg-muted">
            <X className="size-4" />
          </button>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto p-3 pb-20">
          {groups.map(([key, items]) => {
            const open = expanded.includes(key);
            const unread = items.filter((n) => !n.read).length;
            const shown = open ? items : items.filter((n) => !n.read).slice(0, 2);
            return (
              <div key={key} className="rounded-lg border">
                <div className="flex items-center gap-2 px-3 py-2">
                  <button onClick={() => setExpanded((e) => (open ? e.filter((x) => x !== key) : [...e, key]))} className="flex flex-1 items-center gap-2 text-left">
                    {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                    <span className="text-sm font-semibold">{key}</span>
                    <span className="text-xs text-muted-foreground">
                      {unread} new{items.length > unread ? ` · ${items.length} total` : ""}
                    </span>
                  </button>
                  {unread > 0 && (
                    <button onClick={() => store.setRead(items.map((n) => n.id), true)} className="text-xs text-primary hover:underline">
                      Mark read
                    </button>
                  )}
                </div>
                {shown.map((n) => (
                  <button key={n.id} onClick={() => store.open(n)} className="flex w-full gap-2 border-t px-3 py-2 text-left text-sm hover:bg-muted/60">
                    {!n.read ? <span className="mt-1.5 size-2 shrink-0 rounded-full bg-blue-600" /> : <span className="size-2 shrink-0" />}
                    <div className="min-w-0">
                      <div className="truncate">
                        <span className="font-medium">{n.actor}</span> <span className="text-muted-foreground">{formatAgo(n.minutesAgo)}</span>
                      </div>
                      <div className="truncate text-muted-foreground">{n.body}</div>
                    </div>
                  </button>
                ))}
                {!open && items.length > shown.length && (
                  <button onClick={() => setExpanded((e) => [...e, key])} className="w-full border-t px-3 py-1.5 text-left text-xs text-muted-foreground hover:bg-muted/60">
                    Show all {items.length}
                  </button>
                )}
              </div>
            );
          })}
          {transactional.length > 0 && (
            <div className="rounded-lg border">
              <div className="px-3 py-2 text-sm font-semibold">Money & access</div>
              {transactional.map((n) => (
                <button key={n.id} onClick={() => store.open(n)} className="flex w-full gap-2 border-t px-3 py-2 text-left text-sm hover:bg-muted/60">
                  <KindIcon n={n} className="mt-0.5" />
                  <div className="min-w-0">
                    <div className={cn(!n.read && "font-semibold")}>{n.title}</div>
                    <div className="truncate text-muted-foreground">{n.body}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
          {resolved.length > 0 && (
            <div className="text-sm">
              <button onClick={() => setShowResolved((s) => !s)} className="flex items-center gap-1 px-1 text-muted-foreground hover:text-foreground">
                {showResolved ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                {resolved.length} handled by someone else
              </button>
              {showResolved &&
                resolved.map((n) => (
                  <div key={n.id} className="ml-5 border-l py-1 pl-3 text-muted-foreground line-through decoration-muted-foreground/40">
                    {n.title} <span className="no-underline">— {n.resolvedBy}</span>
                  </div>
                ))}
            </div>
          )}
          {groups.length === 0 && transactional.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">Nothing new.</p>}
        </div>
      </div>
    </div>
  );
}

// ---------- Variant D: no inbox, Notifications live where the work is ----------

function inPlaceFor(path: string, items: ProtoNotification[]) {
  const live = items.filter((n) => !n.resolvedBy);
  if (path.startsWith("/admin/refunds")) return live.filter((n) => n.kind === "refund-raised");
  if (path.startsWith("/instructor/questions")) return live.filter((n) => n.kind === "question" || n.kind === "reply");
  if (path === "/dashboard" || path === "/instructor") return live;
  return [];
}

function InPlaceCard({ store }: { store: Store }) {
  const { pathname } = useLocation();
  const items = inPlaceFor(pathname, store.items).filter((n) => !n.read);
  const resolved = store.items.filter((n) => n.resolvedBy && !n.read).length;
  if (items.length === 0) return null;
  return (
    <div className="mx-6 mt-6 rounded-lg border border-blue-200 bg-blue-50/60 p-4 dark:border-blue-900 dark:bg-blue-950/20">
      <div className="mb-2 flex items-center gap-2">
        <span className="font-semibold">For you</span>
        <span className="text-sm text-muted-foreground">{items.length} new since your last visit</span>
        <button onClick={() => store.setRead(items.map((n) => n.id), true)} className="ml-auto text-sm text-primary hover:underline">
          Dismiss all
        </button>
      </div>
      <ul className="divide-y">
        {items.slice(0, 5).map((n) => (
          <li key={n.id} className="flex items-center gap-3 py-2 text-sm">
            <KindIcon n={n} className="text-muted-foreground" />
            <button onClick={() => store.open(n)} className="min-w-0 flex-1 truncate text-left">
              <span className="font-medium">{n.title}</span> <span className="text-muted-foreground">— {n.body}</span>
            </button>
            <span className="text-xs text-muted-foreground">{formatAgo(n.minutesAgo)}</span>
          </li>
        ))}
      </ul>
      {items.length > 5 && <div className="pt-2 text-xs text-muted-foreground">and {items.length - 5} more below</div>}
      {resolved > 0 && <div className="pt-1 text-xs text-muted-foreground">{resolved} others were already handled by someone else and are hidden.</div>}
    </div>
  );
}

function inPlaceBadges(items: ProtoNotification[]): Record<string, number> {
  const unread = items.filter((n) => !n.read && !n.resolvedBy);
  return {
    "/instructor/questions": unread.filter((n) => n.kind === "question" || n.kind === "reply").length,
    "/admin/refunds": unread.filter((n) => n.kind === "refund-raised").length,
    "/dashboard": unread.length,
  };
}

// ---------- wiring ----------

export interface NotificationSlots {
  headerSlot?: React.ReactNode;
  navExtra?: React.ReactNode;
  navBadges?: Record<string, number>;
  aboveMain?: React.ReactNode;
  mainOverride?: React.ReactNode;
  overlay: React.ReactNode;
}

export function useNotificationsPrototype(role: string | null): NotificationSlots {
  const [params, setParams] = useSearchParams();
  const variant = params.get("variant") ?? "A";
  const volume: Volume = params.get("volume") === "high" ? "high" : "normal";
  const store = useStore(role, volume);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const unread = unreadActive(store.items).length;
  const waiting = store.items.filter((n) => n.waitingOnYou && !n.resolvedBy && !n.read).length;
  const resolved = store.items.filter((n) => n.resolvedBy).length;

  const toggleVolume = () => {
    const p = new URLSearchParams(params);
    if (volume === "high") p.delete("volume");
    else p.set("volume", "high");
    setParams(p, { replace: true });
  };

  const switcher = (
    <PrototypeSwitcher
      variants={VARIANTS}
      current={variant}
      extra={
        <>
          {role ?? "signed out"} · {store.items.length} total · {unread} unread · {waiting} waiting on you · {resolved} resolved ·{" "}
          <button onClick={toggleVolume} className="underline">
            volume: {volume}
          </button>
        </>
      }
    />
  );

  if (variant === "B") {
    return {
      navExtra: <InboxNavItem store={store} />,
      mainOverride: params.get("inbox") === "1" ? <InboxPage store={store} /> : undefined,
      overlay: switcher,
    };
  }
  if (variant === "C") {
    return {
      navExtra: <ActivityNavItem store={store} onOpen={() => setDrawerOpen(true)} />,
      aboveMain: <TransactionalBanners store={store} />,
      overlay: (
        <>
          {drawerOpen && <GroupedDrawer store={store} onClose={() => setDrawerOpen(false)} />}
          {switcher}
        </>
      ),
    };
  }
  if (variant === "D") {
    return {
      navBadges: inPlaceBadges(store.items),
      aboveMain: <InPlaceCard store={store} />,
      overlay: switcher,
    };
  }
  return { headerSlot: <BellPopover store={store} />, overlay: switcher };
}

