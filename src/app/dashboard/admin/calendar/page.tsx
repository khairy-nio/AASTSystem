"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "react-hot-toast";

type TimeSlot = { id: string; start_time: string; end_time: string };
type Booking = {
  id: string;
  booking_date: string;
  type: string;
  room_id: string;
  start_slot_id: string;
  end_slot_id: string;
  rooms: { name: string };
  users?: { full_name: string };
};

const TYPE_STYLE: Record<string, string> = {
  FIXED: "bg-blue-100 text-blue-800 border-blue-200",
  MULTI_PURPOSE: "bg-green-100 text-green-800 border-green-200",
  EXCEPTIONAL: "bg-yellow-100 text-yellow-800 border-yellow-200",
};

export default function CalendarPage() {
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"WEEK" | "MONTH">("WEEK");
  const [currentDate, setCurrentDate] = useState(new Date());

  const supabase = createClient();

  useEffect(() => { fetchData(); }, [currentDate, viewMode]);

  const fetchData = async () => {
    setLoading(true);
    let startStr = "", endStr = "";
    if (viewMode === "WEEK") {
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      startStr = startOfWeek.toISOString().split("T")[0];
      endStr = endOfWeek.toISOString().split("T")[0];
    } else {
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      startOfMonth.setDate(startOfMonth.getDate() - startOfMonth.getDay());
      endOfMonth.setDate(endOfMonth.getDate() + (6 - endOfMonth.getDay()));
      startStr = startOfMonth.toISOString().split("T")[0];
      endStr = endOfMonth.toISOString().split("T")[0];
    }

    const [slotsRes, bookingsRes] = await Promise.all([
      supabase.from("time_slots").select("id, start_time, end_time").eq("is_active", true).order("start_time"),
      supabase.from("bookings").select("id, booking_date, type, room_id, start_slot_id, end_slot_id, rooms(name), users(full_name)")
        .or("status.eq.APPROVED,type.eq.FIXED")
        .gte("booking_date", startStr)
        .lte("booking_date", endStr),
    ]);

    if (slotsRes.data) setSlots(slotsRes.data);
    if (bookingsRes.data) setBookings(bookingsRes.data as unknown as Booking[]);
    if (slotsRes.error || bookingsRes.error) toast.error("Failed to load calendar data");
    setLoading(false);
  };

  const traverseDate = (dir: "PREV" | "NEXT") => {
    const d = new Date(currentDate);
    if (viewMode === "WEEK") d.setDate(currentDate.getDate() + (dir === "NEXT" ? 7 : -7));
    else d.setMonth(currentDate.getMonth() + (dir === "NEXT" ? 1 : -1));
    setCurrentDate(d);
  };

  const getWeekDays = () => {
    const days: Date[] = [];
    const start = new Date(currentDate);
    start.setDate(currentDate.getDate() - currentDate.getDay());
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push(d);
    }
    return days;
  };

  const getMonthGrid = () => {
    const grid: Date[] = [];
    const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    start.setDate(start.getDate() - start.getDay());
    const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    end.setDate(end.getDate() + (6 - end.getDay()));
    let d = new Date(start);
    while (d <= end) { grid.push(new Date(d)); d.setDate(d.getDate() + 1); }
    return grid;
  };

  const dateStr = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

  const getBookingsForCell = (ds: string, slotId?: string) =>
    bookings.filter((b) => b.booking_date === ds && (!slotId || b.start_slot_id === slotId || b.end_slot_id === slotId));

  const weekDays = getWeekDays();
  const monthGrid = getMonthGrid();
  const today = dateStr(new Date());

  return (
    <div className="min-h-screen bg-background p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-card border border-card-border rounded-2xl p-5 shadow-sm flex flex-wrap gap-4 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-xl">
              <CalendarIcon className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Booking Calendar</h1>
              <p className="text-xs text-muted">All approved &amp; fixed bookings</p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* View Toggle */}
            <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
              {(["WEEK", "MONTH"] as const).map((v) => (
                <button key={v} onClick={() => setViewMode(v)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${viewMode === v ? "bg-white shadow text-primary" : "text-muted hover:text-foreground"}`}>
                  {v === "WEEK" ? "Weekly" : "Monthly"}
                </button>
              ))}
            </div>

            {/* Navigation */}
            <div className="flex items-center gap-2 border border-card-border rounded-xl p-1 bg-background">
              <button onClick={() => traverseDate("PREV")} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <ChevronLeft className="w-5 h-5 text-foreground" />
              </button>
              <span className="font-semibold text-foreground text-sm px-2 min-w-[180px] text-center">
                {viewMode === "WEEK"
                  ? `${weekDays[0].toLocaleDateString("en-GB")} — ${weekDays[6].toLocaleDateString("en-GB")}`
                  : currentDate.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
              </span>
              <button onClick={() => traverseDate("NEXT")} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <ChevronRight className="w-5 h-5 text-foreground" />
              </button>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex gap-4 flex-wrap px-1">
          {[["FIXED", "bg-blue-400", "Fixed Schedule"], ["MULTI_PURPOSE", "bg-green-400", "Multi-Purpose"], ["EXCEPTIONAL", "bg-yellow-400", "Exceptional Lecture"]].map(([, color, label]) => (
            <span key={label} className="flex items-center gap-2 text-sm text-muted">
              <span className={`w-3 h-3 rounded-full ${color}`} />
              {label}
            </span>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-secondary" />
          </div>
        ) : viewMode === "WEEK" ? (
          <div className="bg-card rounded-2xl shadow-sm border border-card-border overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-sm">
              <thead>
                <tr>
                  <th className="p-4 border-b border-r border-card-border bg-slate-50 w-24 sticky left-0 z-10 text-center text-muted text-xs font-bold uppercase">Time</th>
                  {weekDays.map((date, i) => {
                    const ds = dateStr(date);
                    const isToday = ds === today;
                    return (
                      <th key={i} className={`p-4 border-b border-card-border min-w-[160px] text-center ${isToday ? "bg-primary/5" : "bg-slate-50"}`}>
                        <div className={`font-bold text-xs uppercase tracking-wider ${isToday ? "text-primary" : "text-foreground"}`}>
                          {date.toLocaleDateString("en-US", { weekday: "short" })}
                        </div>
                        <div className={`text-xs mt-1 ${isToday ? "text-primary font-bold" : "text-muted"}`}>
                          {date.toLocaleDateString("en-GB")}
                        </div>
                        {isToday && <div className="mt-1 w-1.5 h-1.5 bg-primary rounded-full mx-auto" />}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {slots.map((slot) => (
                  <tr key={slot.id} className="group">
                    <td className="p-3 border-b border-r border-card-border text-center font-semibold text-muted bg-slate-50 sticky left-0 z-10 group-hover:bg-slate-100 transition-colors text-xs">
                      {slot.start_time.substring(0, 5)}
                      <div className="text-[10px] text-slate-400">–{slot.end_time.substring(0, 5)}</div>
                    </td>
                    {weekDays.map((date, i) => {
                      const ds = dateStr(date);
                      const isToday = ds === today;
                      const cellBookings = getBookingsForCell(ds, slot.id);
                      return (
                        <td key={i} className={`p-2 border-b border-card-border align-top transition-colors ${isToday ? "bg-primary/3" : "hover:bg-slate-50/50"}`}>
                          <div className="flex flex-col gap-1.5 min-h-[70px]">
                            {cellBookings.length === 0
                              ? <div className="w-full h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-slate-300 text-[10px]">Free</div>
                              : cellBookings.map((b) => (
                                <div key={b.id} className={`p-1.5 border rounded-lg text-[10px] ${TYPE_STYLE[b.type] ?? "bg-slate-100 text-slate-700 border-slate-200"}`}>
                                  <div className="font-bold truncate">{b.rooms?.name ?? "—"}</div>
                                  <div className="opacity-80 truncate mt-0.5">{b.users?.full_name ?? "System"}</div>
                                </div>
                              ))}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-card rounded-2xl shadow-sm border border-card-border overflow-hidden">
            <div className="grid grid-cols-7 border-b border-card-border bg-slate-50">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d} className="p-3 text-center text-xs font-bold text-muted uppercase tracking-wider border-r last:border-0 border-card-border">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {monthGrid.map((date, i) => {
                const ds = dateStr(date);
                const isToday = ds === today;
                const isCurrentMonth = date.getMonth() === currentDate.getMonth();
                const cellBookings = getBookingsForCell(ds);
                return (
                  <div key={i} className={`min-h-[120px] p-2 border-r border-b border-card-border last:border-r-0 transition-colors ${!isCurrentMonth ? "bg-slate-50 opacity-50" : isToday ? "bg-primary/3" : "hover:bg-slate-50/50"}`}>
                    <div className={`text-right text-sm font-semibold mb-1 ${isToday ? "text-primary" : !isCurrentMonth ? "text-muted" : "text-foreground"}`}>
                      {isToday
                        ? <span className="inline-flex w-6 h-6 items-center justify-center bg-primary text-white rounded-full text-xs">{date.getDate()}</span>
                        : date.getDate()}
                    </div>
                    <div className="flex flex-col gap-0.5 overflow-y-auto max-h-[80px]">
                      {cellBookings.map((b) => (
                        <div key={b.id} className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border truncate ${TYPE_STYLE[b.type] ?? "bg-slate-100 text-slate-700 border-slate-200"}`}>
                          {b.rooms?.name ?? "—"}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
