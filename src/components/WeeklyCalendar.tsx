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

export default function WeeklyCalendar() {
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  const supabase = createClient();

  useEffect(() => { fetchData(); }, [currentDate]);

  const fetchData = async () => {
    setLoading(true);
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    const startStr = startOfWeek.toISOString().split("T")[0];
    const endStr = endOfWeek.toISOString().split("T")[0];

    const [slotsRes, bookingsRes] = await Promise.all([
      supabase.from("time_slots").select("id, start_time, end_time").eq("is_active", true).order("start_time"),
      supabase.from("bookings").select("id, booking_date, type, room_id, start_slot_id, end_slot_id, rooms(name), users(full_name)")
        .or("status.eq.APPROVED,status.eq.ADMIN_APPROVED,type.eq.FIXED")
        .gte("booking_date", startStr)
        .lte("booking_date", endStr),
    ]);

    if (slotsRes.data) setSlots(slotsRes.data);
    if (bookingsRes.data) setBookings(bookingsRes.data as unknown as Booking[]);
    if (slotsRes.error || bookingsRes.error) toast.error("Failed to load calendar data");
    setLoading(false);
  };

  const traverse = (dir: "PREV" | "NEXT") => {
    const d = new Date(currentDate);
    d.setDate(currentDate.getDate() + (dir === "NEXT" ? 7 : -7));
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

  const dateStr = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

  const weekDays = getWeekDays();
  const today = dateStr(new Date());

  return (
    <div className="bg-card border border-card-border rounded-2xl shadow-sm overflow-hidden mb-2">
      <div className="flex items-center justify-between px-6 py-4 border-b border-card-border">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-xl">
            <CalendarIcon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-bold text-foreground">Room Availability Calendar</h2>
            <p className="text-xs text-muted">Read-only view · Approved &amp; confirmed bookings</p>
          </div>
        </div>
        <div className="flex items-center gap-2 border border-card-border rounded-xl p-1 bg-background">
          <button onClick={() => traverse("PREV")} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <ChevronLeft className="w-4 h-4 text-foreground" />
          </button>
          <span className="text-sm font-semibold text-foreground px-2 min-w-[180px] text-center">
            {weekDays[0].toLocaleDateString("en-GB")} &mdash; {weekDays[6].toLocaleDateString("en-GB")}
          </span>
          <button onClick={() => traverse("NEXT")} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <ChevronRight className="w-4 h-4 text-foreground" />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 flex-wrap px-6 py-2 border-b border-card-border bg-slate-50/50">
        {[["bg-blue-400", "Fixed"], ["bg-yellow-400", "Exceptional"], ["bg-green-400", "Multi-Purpose"]].map(([color, label]) => (
          <span key={label} className="flex items-center gap-1.5 text-xs text-muted">
            <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
            {label}
          </span>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-secondary" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-sm">
            <thead>
              <tr>
                <th className="p-3 border-b border-r border-card-border bg-slate-50 w-20 sticky left-0 z-10 text-center text-xs text-muted font-bold uppercase">Time</th>
                {weekDays.map((date, i) => {
                  const ds = dateStr(date);
                  const isToday = ds === today;
                  return (
                    <th key={i} className={`p-3 border-b border-card-border min-w-[140px] text-center ${isToday ? "bg-primary/5" : "bg-slate-50"}`}>
                      <div className={`text-xs font-bold uppercase tracking-wider ${isToday ? "text-primary" : "text-foreground"}`}>
                        {date.toLocaleDateString("en-US", { weekday: "short" })}
                      </div>
                      <div className={`text-xs mt-0.5 ${isToday ? "text-primary font-semibold" : "text-muted"}`}>
                        {date.toLocaleDateString("en-GB")}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {slots.map((slot) => (
                <tr key={slot.id} className="group">
                  <td className="p-2 border-b border-r border-card-border text-center bg-slate-50 sticky left-0 z-10 group-hover:bg-slate-100 transition-colors">
                    <span className="text-xs font-semibold text-muted">{slot.start_time.substring(0, 5)}</span>
                    <div className="text-[10px] text-slate-400">–{slot.end_time.substring(0, 5)}</div>
                  </td>
                  {weekDays.map((date, i) => {
                    const ds = dateStr(date);
                    const isToday = ds === today;
                    const cellBookings = bookings.filter(
                      (b) => b.booking_date === ds && (b.start_slot_id === slot.id || b.end_slot_id === slot.id)
                    );
                    return (
                      <td key={i} className={`p-1.5 border-b border-card-border align-top transition-colors ${isToday ? "bg-primary/3" : "hover:bg-slate-50/50"}`}>
                        <div className="flex flex-col gap-1 min-h-[60px]">
                          {cellBookings.length === 0
                            ? <div className="w-full h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-slate-300 text-[10px] font-medium">Free</div>
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
      )}
    </div>
  );
}
