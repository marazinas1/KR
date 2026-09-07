import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Pencil } from "lucide-react";
import { useTranslation } from "react-i18next";
import { BOOKING_STATUS_LABEL_KEYS } from "@/lib/bookings.functions";

type Booking = {
  id: string;
  property_id: string;
  date_from: string;
  date_to: string;
  status: string;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  check_in_time?: string;
  check_out_time?: string;
  location?: string;
  total_amount: number | string;
  note?: string | null;
  booking_number?: string | null;
  properties?: { name?: string } | null;
};

type Property = { id: string; name: string; propertyType?: string | null };

export type RescheduleInput = {
  id: string;
  property_id: string;
  date_from: string;
  date_to: string;
};

type BarDrag = {
  booking: Booking;
  mode: "move" | "resize-start" | "resize-end";
  originX: number;
  propertyId: string;
  fromISO: string;
  toISO: string;
  moved: boolean;
};

const STATUS_CLASSES: Record<string, string> = {
  pending: "bg-yellow-400 hover:bg-yellow-500 text-yellow-950 border-yellow-600",
  confirmed: "bg-green-500 hover:bg-green-600 text-white border-green-700",
  cancelled: "bg-red-500 hover:bg-red-600 text-white border-red-700 opacity-70",
  completed: "bg-gray-400 hover:bg-gray-500 text-white border-gray-600",
  blocked_external:
    "bg-slate-500 hover:bg-slate-600 text-white border-slate-700 [background-image:repeating-linear-gradient(45deg,rgba(255,255,255,.18)_0_6px,transparent_6px_12px)]",
};

const MONTH_SHORT = ["sau", "vas", "kov", "bal", "geg", "bir", "lie", "rgp", "rgs", "spa", "lap", "gru"];

function toISODate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseISO(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function daysBetween(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

export function BookingsGantt({
  properties,
  bookings,
  onReschedule,
  rescheduling,
}: {
  properties: Property[];
  bookings: Booking[];
  onReschedule?: (input: RescheduleInput) => void;
  rescheduling?: boolean;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const dayCount = isMobile ? 14 : 60;
  const navStep = isMobile ? 7 : 14;

  const todayStart = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  const [startDate, setStartDate] = useState<Date>(todayStart);

  const days = useMemo(
    () => Array.from({ length: dayCount }, (_, i) => addDays(startDate, i)),
    [startDate, dayCount],
  );
  const endDate = days[days.length - 1];
  const [selected, setSelected] = useState<Booking | null>(null);

  const visibleBookings = useMemo(() => {
    const startISO = toISODate(startDate);
    const endISO = toISODate(endDate);
    return bookings.filter((b) => b.date_from <= endISO && b.date_to >= startISO);
  }, [bookings, startDate, endDate]);

  const todayIndex = daysBetween(startDate, todayStart);

  const [drag, setDrag] = useState<{ propertyId: string; startIdx: number; endIdx: number } | null>(null);

  const goToNew = (propertyId: string, fromIdx: number, toIdx: number) => {
    const a = Math.min(fromIdx, toIdx);
    const b = Math.max(fromIdx, toIdx);
    const fromISO = toISODate(addDays(startDate, a));
    const toISO = toISODate(addDays(startDate, b === a ? a + 1 : b));
    navigate({
      to: "/admin/bookings/new",
      search: { propertyId, from: fromISO, to: toISO } as never,
    });
  };

  useEffect(() => {
    if (!drag) return;
    const onUp = () => {
      setDrag(null);
      goToNew(drag.propertyId, drag.startIdx, drag.endIdx);
    };
    window.addEventListener("pointerup", onUp);
    return () => window.removeEventListener("pointerup", onUp);
  }, [drag]);

  const colMinWidth = isMobile ? 36 : 28;
  const labelColWidth = isMobile ? 120 : 200;
  const gridTemplate = `${labelColWidth}px repeat(${dayCount}, minmax(${colMinWidth}px, 1fr))`;

  const gridRef = useRef<HTMLDivElement>(null);
  const canDrag = !isMobile && !!onReschedule;
  const [barDrag, setBarDrag] = useState<BarDrag | null>(null);
  const [pending, setPending] = useState<
    { booking: Booking; property_id: string; date_from: string; date_to: string } | null
  >(null);

  const colWidth = () => {
    const el = gridRef.current;
    if (!el) return colMinWidth;
    const w = el.getBoundingClientRect().width - labelColWidth;
    return Math.max(1, w / dayCount);
  };

  const startBarDrag = (
    e: React.PointerEvent,
    booking: Booking,
    mode: BarDrag["mode"],
  ) => {
    if (isMobile || !onReschedule) return;
    e.preventDefault();
    e.stopPropagation();
    setBarDrag({
      booking,
      mode,
      originX: e.clientX,
      propertyId: booking.property_id,
      fromISO: booking.date_from,
      toISO: booking.date_to,
      moved: false,
    });
  };

  useEffect(() => {
    if (!barDrag) return;
    const cw = colWidth();
    const onMove = (e: PointerEvent) => {
      const deltaDays = Math.round((e.clientX - barDrag.originX) / cw);
      const b = barDrag.booking;
      let fromISO = b.date_from;
      let toISO = b.date_to;
      let propertyId = barDrag.propertyId;

      if (barDrag.mode === "move") {
        fromISO = toISODate(addDays(parseISO(b.date_from), deltaDays));
        toISO = toISODate(addDays(parseISO(b.date_to), deltaDays));
        const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
        const row = el?.closest("[data-row-property]") as HTMLElement | null;
        const pid = row?.getAttribute("data-row-property");
        if (pid) propertyId = pid;
      } else if (barDrag.mode === "resize-start") {
        const next = addDays(parseISO(b.date_from), deltaDays);
        const max = addDays(parseISO(b.date_to), -1);
        fromISO = toISODate(next > max ? max : next);
      } else {
        const next = addDays(parseISO(b.date_to), deltaDays);
        const min = addDays(parseISO(b.date_from), 1);
        toISO = toISODate(next < min ? min : next);
      }

      const changed =
        fromISO !== b.date_from || toISO !== b.date_to || propertyId !== b.property_id;
      setBarDrag((d) => (d ? { ...d, fromISO, toISO, propertyId, moved: d.moved || changed } : d));
    };
    const onUp = () => {
      setBarDrag(null);
      const b = barDrag.booking;
      const changed =
        barDrag.fromISO !== b.date_from ||
        barDrag.toISO !== b.date_to ||
        barDrag.propertyId !== b.property_id;
      if (changed) {
        setPending({
          booking: b,
          property_id: barDrag.propertyId,
          date_from: barDrag.fromISO,
          date_to: barDrag.toISO,
        });
      } else if (!barDrag.moved) {
        setSelected(b);
      }
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [barDrag]);

  const propertyName = (id: string) => properties.find((p) => p.id === id)?.name ?? "—";
  const dragConflict = (() => {
    if (!barDrag) return false;
    return bookings.some(
      (o) =>
        o.id !== barDrag.booking.id &&
        o.property_id === barDrag.propertyId &&
        o.status !== "cancelled" &&
        o.date_from < barDrag.toISO &&
        o.date_to > barDrag.fromISO,
    );
  })();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setStartDate(addDays(startDate, -navStep))}>
            <ChevronLeft className="h-4 w-4 mr-1" /> {t("gantt.back")}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setStartDate(todayStart)}>
            <CalendarIcon className="h-4 w-4 mr-1" /> {t("gantt.today")}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setStartDate(addDays(startDate, navStep))}>
            {t("gantt.forward")} <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
        <div className="text-sm text-muted-foreground">
          {startDate.getDate()} {MONTH_SHORT[startDate.getMonth()]} – {endDate.getDate()} {MONTH_SHORT[endDate.getMonth()]} {endDate.getFullYear()}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs">
        <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-yellow-400 border border-yellow-600" /> {t("enums.bookingStatus.pending")}</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-green-500 border border-green-700" /> {t("enums.bookingStatus.confirmed")}</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-500 border border-red-700" /> {t("enums.bookingStatus.cancelled")}</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-gray-400 border border-gray-600" /> {t("enums.bookingStatus.completed")}</span>
      </div>

      {canDrag && (
        <p className="text-xs text-muted-foreground">
          {t("gantt.dragHint")}
        </p>
      )}

      <div className="border rounded-lg overflow-x-auto bg-card">
        <div ref={gridRef} style={{ minWidth: labelColWidth + dayCount * colMinWidth }}>
          <div
            className="grid border-b bg-muted/40 sticky top-0 z-10"
            style={{ gridTemplateColumns: gridTemplate }}
          >
            <div style={{ gridColumn: 1, gridRow: 1 }} className="sticky left-0 z-40 border-r bg-muted px-3 py-2 text-xs font-semibold text-muted-foreground">{t("gantt.property")}</div>
            {days.map((d, i) => {
              const isWeekStart = i % 7 === 0;
              const isWeekend = d.getDay() === 0 || d.getDay() === 6;
              return (
                <div
                  key={i}
                  style={{ gridColumn: 2 + i, gridRow: 1 }}
                  className={`text-[10px] text-center py-2 border-r last:border-r-0 ${isWeekend ? "bg-muted/40" : ""}`}
                >
                  {isWeekStart ? (
                    <div className="font-semibold text-foreground">
                      {d.getDate()} {MONTH_SHORT[d.getMonth()]}
                    </div>
                  ) : (
                    <div className="text-muted-foreground">{d.getDate()}</div>
                  )}
                </div>
              );
            })}
          </div>

          {properties.map((p) => {
            const rowBookings = visibleBookings.filter(
              (b) => b.property_id === p.id && b.id !== barDrag?.booking.id,
            );
            return (
              <div
                key={p.id}
                data-row-property={p.id}
                className="grid border-b last:border-b-0 relative"
                style={{ gridTemplateColumns: gridTemplate, minHeight: 56 }}
              >
                <div style={{ gridColumn: 1, gridRow: 1 }} className="sticky left-0 z-30 flex flex-col justify-center border-r bg-card px-3 py-2 text-sm shadow-[2px_0_4px_-2px_rgba(0,0,0,0.25)]">
                  <div className="font-medium truncate">{p.name}</div>
                  {p.propertyType && (
                    <div className="text-xs text-muted-foreground truncate">{p.propertyType}</div>
                  )}
                </div>
                {days.map((d, i) => {
                  const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                  const inDrag =
                    drag?.propertyId === p.id &&
                    i >= Math.min(drag.startIdx, drag.endIdx) &&
                    i <= Math.max(drag.startIdx, drag.endIdx);
                  return (
                    <button
                      key={i}
                      type="button"
                      style={{ gridColumn: 2 + i, gridRow: 1 }}
                      onPointerDown={(e) => {
                        e.preventDefault();
                        setDrag({ propertyId: p.id, startIdx: i, endIdx: i });
                      }}
                      onPointerEnter={() => {
                        if (drag?.propertyId === p.id) setDrag({ ...drag, endIdx: i });
                      }}
                      className={`border-r last:border-r-0 hover:bg-primary/10 transition-colors select-none ${
                        inDrag ? "bg-primary/25" : isWeekend ? "bg-muted/30" : ""
                      }`}
                      aria-label={`Nauja rezervacija ${toISODate(d)}`}
                    />
                  );
                })}

                {todayIndex >= 0 && todayIndex < dayCount && (
                  <div
                    className="absolute top-0 bottom-0 w-px bg-red-500 z-20 pointer-events-none"
                    style={{
                      left: `calc(${labelColWidth}px + ((100% - ${labelColWidth}px) * ${todayIndex} / ${dayCount}))`,
                    }}
                  />
                )}

                {rowBookings.map((b) => {
                  const bFrom = parseISO(b.date_from);
                  const bTo = parseISO(b.date_to);
                  const startIdx = Math.max(0, daysBetween(startDate, bFrom));
                  const endIdx = Math.min(dayCount - 1, daysBetween(startDate, bTo));
                  if (endIdx < startIdx) return null;
                  const colStart = 2 + startIdx;
                  const colEnd = 2 + endIdx + 1;
                  const cls = STATUS_CLASSES[b.status] ?? "bg-gray-400 text-white border-gray-600";
                  const isExternal = b.status === "blocked_external";
                  const barDraggable = canDrag && !isExternal;
                  return (
                    <div
                      key={b.id}
                      className={`relative m-1 rounded border shadow-sm z-10 ${cls} ${
                        barDraggable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
                      }`}
                      style={{ gridColumn: `${colStart} / ${colEnd}`, gridRow: 1 }}
                      title={`${b.customer_name} · ${b.date_from} → ${b.date_to}`}
                      onPointerDown={(e) => {
                        if (isExternal) return;
                        startBarDrag(e, b, "move");
                      }}
                      onClick={() => {
                        if (!barDraggable) setSelected(b);
                      }}
                    >
                      <div className="px-2 py-1 text-xs font-medium truncate text-left select-none">
                        {b.booking_number ? <span className="font-mono opacity-80 mr-1">{b.booking_number}</span> : null}
                        {b.customer_name || "—"}
                      </div>
                      {barDraggable && (
                        <>
                          <div
                            className="absolute inset-y-0 left-0 w-2 cursor-col-resize rounded-l bg-black/10 hover:bg-black/25"
                            onPointerDown={(e) => startBarDrag(e, b, "resize-start")}
                          />
                          <div
                            className="absolute inset-y-0 right-0 w-2 cursor-col-resize rounded-r bg-black/10 hover:bg-black/25"
                            onPointerDown={(e) => startBarDrag(e, b, "resize-end")}
                          />
                        </>
                      )}
                    </div>
                  );
                })}

                {barDrag && barDrag.propertyId === p.id && (() => {
                  const startIdx = Math.max(0, daysBetween(startDate, parseISO(barDrag.fromISO)));
                  const endIdx = Math.min(dayCount - 1, daysBetween(startDate, parseISO(barDrag.toISO)));
                  if (endIdx < startIdx) return null;
                  return (
                    <div
                      className={`m-1 px-2 py-1 rounded text-xs font-medium truncate border-2 border-dashed z-30 pointer-events-none ${
                        dragConflict
                          ? "bg-red-500/30 border-red-600 text-red-900"
                          : "bg-primary/30 border-primary text-foreground"
                      }`}
                      style={{ gridColumn: `${2 + startIdx} / ${2 + endIdx + 1}`, gridRow: 1 }}
                    >
                      {barDrag.fromISO} → {barDrag.toISO}
                    </div>
                  );
                })()}
              </div>
            );
          })}

          {properties.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">{t("gantt.noProperties")}</div>
          )}
        </div>
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 flex-wrap">
              {selected?.booking_number && (
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-muted">{selected.booking_number}</span>
              )}
              <span>{selected?.properties?.name ?? t("gantt.booking")}</span>
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-2 text-sm">
              <div><span className="text-muted-foreground">{t("gantt.status")}:</span> {BOOKING_STATUS_LABEL_KEYS[selected.status] ? t(BOOKING_STATUS_LABEL_KEYS[selected.status]) : selected.status}</div>
              <div><span className="text-muted-foreground">{t("gantt.customer")}:</span> {selected.customer_name || "—"}</div>
              {selected.customer_phone && <div><span className="text-muted-foreground">{t("gantt.phone")}:</span> {selected.customer_phone}</div>}
              {selected.customer_email && <div><span className="text-muted-foreground">{t("gantt.email")}:</span> {selected.customer_email}</div>}
              <div>
                <span className="text-muted-foreground">{t("gantt.period")}:</span>{" "}
                {selected.date_from} {selected.check_in_time} → {selected.date_to} {selected.check_out_time}
              </div>
              {selected.location && <div><span className="text-muted-foreground">{t("gantt.location")}:</span> {selected.location}</div>}
              <div><span className="text-muted-foreground">{t("gantt.amount")}:</span> <span className="font-semibold text-primary">{Number(selected.total_amount).toFixed(2)}€</span></div>
              {selected.note && <div className="italic text-muted-foreground">„{selected.note}"</div>}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>{t("common.close")}</Button>
            {selected && (
              <Button onClick={() => { const id = selected.id; setSelected(null); navigate({ to: "/admin/bookings/$id", params: { id } }); }}>
                <Pencil className="h-4 w-4 mr-1" /> {t("common.edit")}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("gantt.confirmTitle")}</DialogTitle>
          </DialogHeader>
          {pending && (
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">{t("gantt.booking")}:</span>{" "}
                {pending.booking.booking_number ? `${pending.booking.booking_number} · ` : ""}
                {pending.booking.customer_name || "—"}
              </div>
              <div>
                <span className="text-muted-foreground">{t("gantt.property")}:</span>{" "}
                {pending.property_id === pending.booking.property_id ? (
                  propertyName(pending.property_id)
                ) : (
                  <>
                    <span className="line-through opacity-70">{propertyName(pending.booking.property_id)}</span>{" "}
                    → <span className="font-medium">{propertyName(pending.property_id)}</span>
                  </>
                )}
              </div>
              <div>
                <span className="text-muted-foreground">{t("gantt.period")}:</span>{" "}
                <span className="line-through opacity-70">
                  {pending.booking.date_from} → {pending.booking.date_to}
                </span>{" "}
                → <span className="font-medium">{pending.date_from} → {pending.date_to}</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPending(null)} disabled={rescheduling}>
              {t("common.cancel")}
            </Button>
            <Button
              disabled={rescheduling}
              onClick={() => {
                if (!pending) return;
                onReschedule?.({
                  id: pending.booking.id,
                  property_id: pending.property_id,
                  date_from: pending.date_from,
                  date_to: pending.date_to,
                });
                setPending(null);
              }}
            >
              {t("gantt.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}