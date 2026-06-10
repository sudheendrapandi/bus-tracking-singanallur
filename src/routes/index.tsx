import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Singanallur Bus Availability — Live Dashboard" },
      { name: "description", content: "Real-time bus availability, seats, timings and festival specials from Singanallur Bus Stand." },
      { property: "og:title", content: "Singanallur Bus Availability — Live Dashboard" },
      { property: "og:description", content: "Real-time bus availability, seats and timings from Singanallur." },
    ],
  }),
  component: Dashboard,
});

type Route = {
  id: string;
  destination: string;
  distanceKm: number;
  totalBuses: number;
  basePrice: number;
  festival?: boolean;
};

const ROUTES: Route[] = [
  { id: "mdu", destination: "Madurai", distanceKm: 215, totalBuses: 28, basePrice: 240, festival: true },
  { id: "tni", destination: "Theni", distanceKm: 165, totalBuses: 18, basePrice: 180 },
  { id: "dgl", destination: "Dindigul", distanceKm: 150, totalBuses: 22, basePrice: 160 },
  { id: "tvl", destination: "Tirunelveli", distanceKm: 365, totalBuses: 16, basePrice: 380, festival: true },
  { id: "che", destination: "Chennai", distanceKm: 510, totalBuses: 24, basePrice: 520 },
  { id: "tcr", destination: "Tiruchirappalli", distanceKm: 200, totalBuses: 20, basePrice: 220 },
];

type Bus = {
  id: string;
  number: string;
  operator: "TNSTC" | "SETC" | "KPN" | "Parveen" | "SRS";
  departure: string; // HH:MM
  type: "Express" | "AC Sleeper" | "Deluxe" | "Festival Special";
  totalSeats: number;
  bookedSeats: number;
  routeId: string;
};

const OPERATORS: Bus["operator"][] = ["TNSTC", "SETC", "KPN", "Parveen", "SRS"];
const TYPES: Bus["type"][] = ["Express", "AC Sleeper", "Deluxe", "Festival Special"];

function seedBuses(): Bus[] {
  const out: Bus[] = [];
  ROUTES.forEach((r) => {
    for (let i = 0; i < r.totalBuses; i++) {
      const hour = (5 + Math.floor(Math.random() * 18)) % 24;
      const min = [0, 15, 30, 45][Math.floor(Math.random() * 4)];
      const totalSeats = [40, 45, 50, 36][Math.floor(Math.random() * 4)];
      const bookedSeats = Math.floor(Math.random() * (totalSeats - 2));
      out.push({
        id: `${r.id}-${i}`,
        number: `TN-38-${String(1000 + Math.floor(Math.random() * 8999))}`,
        operator: OPERATORS[Math.floor(Math.random() * OPERATORS.length)],
        departure: `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`,
        type: r.festival && Math.random() < 0.2 ? "Festival Special" : TYPES[Math.floor(Math.random() * 3)],
        totalSeats,
        bookedSeats,
        routeId: r.id,
      });
    }
  });
  return out;
}

function Dashboard() {
  const [buses, setBuses] = useState<Bus[]>([]);
  const [selected, setSelected] = useState<string>("mdu");
  const [now, setNow] = useState<Date | null>(null);
  const [query, setQuery] = useState("");
  const [bookingBus, setBookingBus] = useState<Bus | null>(null);

  // Seed + tick only on client to avoid SSR hydration mismatch
  useEffect(() => {
    setBuses(seedBuses());
    setNow(new Date());
    const t = setInterval(() => {
      setNow(new Date());
      setBuses((prev) =>
        prev.map((b) => {
          if (b.id === bookingBusIdRef.current) return b; // pause auto-updates while user books
          if (Math.random() > 0.82) {
            const delta = Math.random() < 0.78 ? 1 : -1;
            const next = Math.min(b.totalSeats, Math.max(0, b.bookedSeats + delta));
            return { ...b, bookedSeats: next };
          }
          return b;
        }),
      );
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const bookingBusIdRef = useRef<string | null>(null);
  useEffect(() => {
    bookingBusIdRef.current = bookingBus?.id ?? null;
  }, [bookingBus]);

  const confirmBooking = (busId: string, seats: number[]) => {
    setBuses((prev) =>
      prev.map((b) =>
        b.id === busId
          ? { ...b, bookedSeats: Math.min(b.totalSeats, b.bookedSeats + seats.length) }
          : b,
      ),
    );
    setBookingBus(null);
  };

  const route = ROUTES.find((r) => r.id === selected)!;
  const routeBuses = useMemo(
    () =>
      buses
        .filter((b) => b.routeId === selected)
        .filter(
          (b) =>
            !query ||
            b.number.toLowerCase().includes(query.toLowerCase()) ||
            b.operator.toLowerCase().includes(query.toLowerCase()) ||
            b.type.toLowerCase().includes(query.toLowerCase()),
        )
        .sort((a, b) => a.departure.localeCompare(b.departure)),
    [buses, selected, query],
  );

  const stats = useMemo(() => {
    const list = buses.filter((b) => b.routeId === selected);
    const total = list.reduce((s, b) => s + b.totalSeats, 0);
    const booked = list.reduce((s, b) => s + b.bookedSeats, 0);
    const available = total - booked;
    const pct = total ? (booked / total) * 100 : 0;
    return { total, booked, available, pct, count: list.length };
  }, [buses, selected]);

  const isPeak = !!now && now.getHours() >= 17 && now.getHours() <= 21;

  return (
    <main className="min-h-screen px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-7xl">
        {/* HEADER */}
        <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
              <span className="live-dot" />
              <span>Live · Singanallur Bus Stand · Coimbatore</span>
            </div>
            <h1 className="text-3xl font-black leading-tight md:text-5xl">
              <span className="gradient-text">Bus Availability</span>{" "}
              <span className="text-foreground">Dashboard</span>
            </h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground md:text-base">
              Real-time seats, departures and festival specials — updated every second.
            </p>
          </div>
          <div className="glass flex items-center gap-4 rounded-2xl px-5 py-3">
            <Clock now={now} />
            {isPeak && (
              <span className="rounded-full bg-warning/15 px-3 py-1 text-xs font-semibold text-warning">
                ⚡ Peak hours
              </span>
            )}
          </div>
        </header>

        {/* ROUTE PICKER */}
        <section className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {ROUTES.map((r) => {
            const active = selected === r.id;
            const rb = buses.filter((b) => b.routeId === r.id);
            const avail = rb.reduce((s, b) => s + (b.totalSeats - b.bookedSeats), 0);
            return (
              <button
                key={r.id}
                onClick={() => setSelected(r.id)}
                className={`card-elevated card-elevated-hover group relative overflow-hidden p-4 text-left ${
                  active ? "ring-2 ring-primary" : ""
                }`}
              >
                {active && <div className="absolute inset-x-0 top-0 h-1 bg-[var(--gradient-primary)]" />}
                {r.festival && (
                  <span className="absolute right-2 top-2 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold text-accent">
                    🎉 Festival
                  </span>
                )}
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">CBE →</div>
                <div className="mt-1 truncate text-lg font-bold">{r.destination}</div>
                <div className="mt-3 flex items-end justify-between">
                  <div>
                    <div className="text-2xl font-black tabular-nums text-foreground">{avail}</div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">seats free</div>
                  </div>
                  <div className="text-right text-[11px] text-muted-foreground">
                    <div>{r.distanceKm} km</div>
                    <div>{r.totalBuses} buses</div>
                  </div>
                </div>
              </button>
            );
          })}
        </section>

        {/* STAT CARDS */}
        <section className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="Buses Today"
            value={stats.count}
            sub={`To ${route.destination}`}
            icon="🚌"
            tone="primary"
          />
          <StatCard
            label="Available Seats"
            value={stats.available}
            sub={`of ${stats.total} total`}
            icon="💺"
            tone="success"
          />
          <StatCard
            label="Booked Seats"
            value={stats.booked}
            sub="Live updating"
            icon="🎫"
            tone="accent"
          />
          <StatCard
            label="Booking %"
            value={`${stats.pct.toFixed(1)}%`}
            sub={stats.pct > 80 ? "Filling fast" : stats.pct > 50 ? "Steady demand" : "Plenty left"}
            icon="📊"
            tone={stats.pct > 80 ? "danger" : stats.pct > 50 ? "warning" : "success"}
          />
        </section>

        {/* OCCUPANCY BAR */}
        <section className="card-elevated mb-8 p-6">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">Overall occupancy · CBE → {route.destination}</div>
              <div className="text-2xl font-bold tabular-nums">
                {stats.booked.toLocaleString()} / {stats.total.toLocaleString()} seats booked
              </div>
            </div>
            <div className="text-right">
              <div className="text-4xl font-black tabular-nums gradient-text">{stats.pct.toFixed(1)}%</div>
              <div className="text-xs text-muted-foreground">updates every second</div>
            </div>
          </div>
          <div className="relative h-4 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${stats.pct}%`,
                background:
                  stats.pct > 80
                    ? "linear-gradient(90deg, oklch(0.7 0.2 30), oklch(0.65 0.24 25))"
                    : stats.pct > 50
                      ? "linear-gradient(90deg, oklch(0.8 0.17 85), oklch(0.75 0.2 60))"
                      : "linear-gradient(90deg, oklch(0.72 0.18 155), oklch(0.7 0.2 180))",
              }}
            >
              <div className="absolute inset-0 shimmer-bg" />
            </div>
          </div>
        </section>

        {/* SEARCH */}
        <div className="mb-4 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-bold">Departures to {route.destination}</h2>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search bus no, operator, type…"
            className="w-full rounded-xl border border-input bg-card px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30 sm:w-72"
          />
        </div>

        {/* BUS LIST */}
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {routeBuses.map((b) => (
            <BusCard key={b.id} bus={b} onBook={() => setBookingBus(b)} />
          ))}
          {routeBuses.length === 0 && (
            <div className="col-span-full rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">
              No buses match your search.
            </div>
          )}
        </section>

        <footer className="mt-12 text-center text-xs text-muted-foreground">
          Real-time simulation · Data refreshes every second · Singanallur Bus Stand
        </footer>
      </div>

      {bookingBus && (
        <BookingModal
          bus={bookingBus}
          destination={ROUTES.find((r) => r.id === bookingBus.routeId)!.destination}
          price={ROUTES.find((r) => r.id === bookingBus.routeId)!.basePrice}
          onClose={() => setBookingBus(null)}
          onConfirm={(seats) => confirmBooking(bookingBus.id, seats)}
        />
      )}
    </main>
  );
}

function Clock({ now }: { now: Date | null }) {
  if (!now) {
    return (
      <div className="text-right">
        <div className="text-xl font-bold tabular-nums leading-none opacity-30">--:--:--</div>
        <div className="text-[11px] text-muted-foreground">loading</div>
      </div>
    );
  }
  const t = now.toLocaleTimeString("en-IN", { hour12: false });
  const d = now.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
  return (
    <div className="text-right">
      <div className="text-xl font-bold tabular-nums leading-none">{t}</div>
      <div className="text-[11px] text-muted-foreground">{d}</div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon,
  tone,
}: {
  label: string;
  value: string | number;
  sub: string;
  icon: string;
  tone: "primary" | "success" | "warning" | "danger" | "accent";
}) {
  const toneMap: Record<string, string> = {
    primary: "from-primary/20 to-primary/0 text-primary",
    success: "from-success/20 to-success/0 text-success",
    warning: "from-warning/20 to-warning/0 text-warning",
    danger: "from-danger/20 to-danger/0 text-danger",
    accent: "from-accent/20 to-accent/0 text-accent",
  };
  return (
    <div className="card-elevated card-elevated-hover relative overflow-hidden p-5">
      <div className={`absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br ${toneMap[tone]} blur-2xl`} />
      <div className="relative">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
          <span className="text-2xl">{icon}</span>
        </div>
        <div className="mt-3 text-3xl font-black tabular-nums md:text-4xl">{value}</div>
        <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
      </div>
    </div>
  );
}

function BusCard({ bus, onBook }: { bus: Bus; onBook: () => void }) {
  const available = bus.totalSeats - bus.bookedSeats;
  const pct = (bus.bookedSeats / bus.totalSeats) * 100;
  const tone = pct > 85 ? "danger" : pct > 60 ? "warning" : "success";
  const toneClasses: Record<string, string> = {
    success: "text-success bg-success/10 border-success/30",
    warning: "text-warning bg-warning/10 border-warning/30",
    danger: "text-danger bg-danger/10 border-danger/30",
  };
  const barColor =
    tone === "danger"
      ? "oklch(0.65 0.24 25)"
      : tone === "warning"
        ? "oklch(0.8 0.17 85)"
        : "oklch(0.72 0.18 155)";

  return (
    <article className="card-elevated card-elevated-hover relative overflow-hidden p-5">
      {bus.type === "Festival Special" && (
        <div className="absolute right-0 top-0 bg-[var(--gradient-accent)] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
          Festival Special
        </div>
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold">{bus.operator}</span>
            <span className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold ${toneClasses[tone]}`}>
              {bus.type}
            </span>
          </div>
          <div className="mt-1 truncate text-xs text-muted-foreground">{bus.number}</div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-2xl font-black tabular-nums">{bus.departure}</div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">departs</div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <Mini label="Total" value={bus.totalSeats} />
        <Mini label="Booked" value={bus.bookedSeats} accent />
        <Mini label="Free" value={available} good />
      </div>

      <div className="mt-4">
        <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Occupancy</span>
          <span className="font-bold tabular-nums text-foreground">{pct.toFixed(1)}%</span>
        </div>
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, background: barColor }}
          >
            <div className="absolute inset-0 shimmer-bg" />
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="live-dot" /> live
        </span>
        <button
          onClick={onBook}
          disabled={available === 0}
          className="rounded-lg bg-[var(--gradient-primary)] px-4 py-1.5 text-xs font-bold text-primary-foreground shadow-[var(--shadow-glow)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {available === 0 ? "Sold out" : "Book seat →"}
        </button>
      </div>
    </article>
  );
}

function BookingModal({
  bus,
  destination,
  price,
  onClose,
  onConfirm,
}: {
  bus: Bus;
  destination: string;
  price: number;
  onClose: () => void;
  onConfirm: (seats: number[]) => void;
}) {
  const [selected, setSelected] = useState<number[]>([]);
  const [stage, setStage] = useState<"select" | "success">("select");
  const [pnr, setPnr] = useState("");

  // Deterministic "already booked" seat indices based on bus.id + bookedSeats count
  const bookedSet = useMemo(() => {
    const set = new Set<number>();
    let seed = 0;
    for (let i = 0; i < bus.id.length; i++) seed = (seed * 31 + bus.id.charCodeAt(i)) >>> 0;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 0xffffffff;
    };
    while (set.size < bus.bookedSeats && set.size < bus.totalSeats) {
      set.add(Math.floor(rand() * bus.totalSeats));
    }
    return set;
  }, [bus.id, bus.bookedSeats, bus.totalSeats]);

  const toggle = (n: number) => {
    if (bookedSet.has(n)) return;
    setSelected((s) => (s.includes(n) ? s.filter((x) => x !== n) : s.length >= 6 ? s : [...s, n]));
  };

  const confirm = () => {
    if (selected.length === 0) return;
    const code = "PNR" + Math.random().toString(36).slice(2, 8).toUpperCase();
    setPnr(code);
    setStage("success");
  };

  const finish = () => onConfirm(selected);

  const total = selected.length * price;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="card-elevated relative w-full max-w-2xl overflow-hidden p-6 animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-secondary text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Close"
        >
          ✕
        </button>

        {stage === "select" ? (
          <>
            <div className="mb-4">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">
                {bus.operator} · {bus.number}
              </div>
              <div className="mt-1 text-2xl font-bold">
                Coimbatore → <span className="gradient-text">{destination}</span>
              </div>
              <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span>🕒 Departs {bus.departure}</span>
                <span>🚌 {bus.type}</span>
                <span>💺 {bus.totalSeats - bus.bookedSeats} free</span>
              </div>
            </div>

            <div className="mb-4 flex items-center justify-center gap-5 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5"><i className="block h-3 w-3 rounded bg-secondary border border-border" /> Available</span>
              <span className="flex items-center gap-1.5"><i className="block h-3 w-3 rounded bg-primary" /> Selected</span>
              <span className="flex items-center gap-1.5"><i className="block h-3 w-3 rounded bg-danger/30 border border-danger/50" /> Booked</span>
            </div>

            <div className="rounded-2xl border border-border bg-background/40 p-4">
              <div className="mb-3 flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
                <span>🚪 Front</span>
                <span>Driver 🪟</span>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {Array.from({ length: bus.totalSeats }).map((_, i) => {
                  const isBooked = bookedSet.has(i);
                  const isSel = selected.includes(i);
                  // insert aisle gap every 4 seats (col 3 empty)
                  const aisle = i % 4 === 2;
                  return (
                    <>
                      <button
                        key={i}
                        onClick={() => toggle(i)}
                        disabled={isBooked}
                        className={`relative aspect-square rounded-lg text-xs font-bold transition ${
                          isBooked
                            ? "cursor-not-allowed bg-danger/20 text-danger/60 border border-danger/40"
                            : isSel
                              ? "bg-primary text-primary-foreground scale-105 shadow-[var(--shadow-glow)]"
                              : "bg-secondary text-foreground hover:bg-muted hover:scale-105"
                        }`}
                      >
                        {i + 1}
                      </button>
                      {aisle && <div key={`a-${i}`} className="aspect-square" />}
                    </>
                  );
                })}
              </div>
            </div>

            <div className="mt-5 flex flex-col-reverse items-stretch justify-between gap-3 sm:flex-row sm:items-center">
              <div className="text-sm">
                <div className="text-muted-foreground">
                  {selected.length} seat{selected.length !== 1 ? "s" : ""} selected
                  {selected.length > 0 && ` · #${selected.map((n) => n + 1).join(", ")}`}
                </div>
                <div className="text-2xl font-black tabular-nums gradient-text">₹{total}</div>
              </div>
              <button
                onClick={confirm}
                disabled={selected.length === 0}
                className="rounded-xl bg-[var(--gradient-primary)] px-6 py-3 text-sm font-bold text-primary-foreground shadow-[var(--shadow-glow)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Confirm booking →
              </button>
            </div>
          </>
        ) : (
          <div className="py-6 text-center">
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-success/15 text-5xl">
              ✓
            </div>
            <h3 className="mt-4 text-2xl font-black">Booking confirmed!</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {selected.length} seat{selected.length !== 1 ? "s" : ""} booked on {bus.operator} to {destination}
            </p>
            <div className="mx-auto mt-5 max-w-sm rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4 text-left">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Your PNR</div>
              <div className="text-xl font-black tabular-nums gradient-text">{pnr}</div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div>Seats: <span className="font-semibold text-foreground">{selected.map((n) => n + 1).join(", ")}</span></div>
                <div>Total: <span className="font-semibold text-foreground">₹{total}</span></div>
                <div>Depart: <span className="font-semibold text-foreground">{bus.departure}</span></div>
                <div>Bus: <span className="font-semibold text-foreground">{bus.number}</span></div>
              </div>
            </div>
            <button
              onClick={finish}
              className="mt-5 rounded-xl bg-[var(--gradient-primary)] px-6 py-3 text-sm font-bold text-primary-foreground shadow-[var(--shadow-glow)] transition hover:brightness-110"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Mini({ label, value, accent, good }: { label: string; value: number; accent?: boolean; good?: boolean }) {
  return (
    <div className="rounded-lg bg-secondary/60 px-2 py-2">
      <div
        className={`text-lg font-black tabular-nums ${
          good ? "text-success" : accent ? "text-accent" : "text-foreground"
        }`}
      >
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}
