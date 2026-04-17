"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, AlertCircle, Calendar, ClipboardList, CheckCircle, XCircle, Clock, ArrowRight } from "lucide-react";
import { toast } from "react-hot-toast";
import { checkBookingConflict, validateBookingLeadTime } from "@/app/actions/bookingActions";
import WeeklyCalendar from "./WeeklyCalendar";

interface TimeSlot { id: string; start_time: string; end_time: string; }
interface Room { id: string; name: string; type: string; }
interface HistoryBooking {
  id: string;
  booking_date: string;
  status: string;
  type: string;
  rejection_reason?: string | null;
  suggested_alternative?: string | null;
  rooms?: { name: string } | null;
  start_slot?: { start_time: string } | null;
  end_slot?: { end_time: string } | null;
}
interface UserViewProps { role: string; userId: string; canViewAvailability?: boolean; }

const STATUS_CONFIG: Record<string, { label: string; icon: typeof CheckCircle; cls: string; dotCls: string }> = {
  APPROVED: { label: "Approved", icon: CheckCircle, cls: "bg-green-50 text-green-700 border-green-200", dotCls: "bg-green-500" },
  ADMIN_APPROVED: { label: "Awaiting Branch Manager", icon: Clock, cls: "bg-teal-50 text-teal-700 border-teal-200", dotCls: "bg-teal-500" },
  REJECTED: { label: "Rejected", icon: XCircle, cls: "bg-red-50 text-red-700 border-red-200", dotCls: "bg-red-500" },
  PENDING: { label: "Pending Review", icon: Clock, cls: "bg-amber-50 text-amber-700 border-amber-200", dotCls: "bg-amber-500" },
};

export default function UserView({ role, userId, canViewAvailability }: UserViewProps) {
  const isSecretary = role === "SECRETARY";

  const [roomType, setRoomType] = useState<"LECTURE" | "MULTI_PURPOSE">(isSecretary ? "MULTI_PURPOSE" : "LECTURE");
  const [date, setDate] = useState("");
  const [startSlotId, setStartSlotId] = useState("");
  const [endSlotId, setEndSlotId] = useState("");
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomId, setRoomId] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [historyBookings, setHistoryBookings] = useState<HistoryBooking[]>([]);

  // Multi-purpose fields
  const [purpose, setPurpose] = useState("");
  const [managerName, setManagerName] = useState("");
  const [managerTitle, setManagerTitle] = useState("");
  const [managerMobile, setManagerMobile] = useState("");
  const [reqLaptop, setReqLaptop] = useState(false);
  const [reqVideoConf, setReqVideoConf] = useState(false);
  const [reqMicQty, setReqMicQty] = useState(0);

  const supabase = createClient();

  const fetchHistory = useCallback(async () => {
    const { data } = await supabase
      .from("bookings")
      .select("id, booking_date, status, type, rejection_reason, suggested_alternative, rooms(name), start_slot:start_slot_id(start_time), end_slot:end_slot_id(end_time)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) setHistoryBookings(data as unknown as HistoryBooking[]);
  }, [supabase, userId]);

  useEffect(() => {
    const init = async () => {
      const [slotsRes, roomsRes] = await Promise.all([
        supabase.from("time_slots").select("*").eq("is_active", true).order("start_time"),
        supabase.from("rooms").select("*").eq("is_active", true).order("name"),
      ]);
      if (slotsRes.data) setTimeSlots(slotsRes.data);
      if (roomsRes.data) setRooms(roomsRes.data);
      setLoading(false);
    };
    init();
  }, [supabase]);

  useEffect(() => { if (!loading) fetchHistory(); }, [loading, fetchHistory]);

  const getMinDate = () => {
    const now = new Date();
    const hoursToAdd = role === "SECRETARY" ? 48 : role === "EMPLOYEE" ? 24 : 0;
    const minDate = new Date(now.getTime() + hoursToAdd * 60 * 60 * 1000);
    return minDate.toISOString().split("T")[0];
  };

  const resetForm = () => {
    setDate(""); setStartSlotId(""); setEndSlotId(""); setRoomId("");
    setRoomType(isSecretary ? "MULTI_PURPOSE" : "LECTURE");
    setPurpose(""); setManagerName(""); setManagerTitle(""); setManagerMobile("");
    setReqLaptop(false); setReqVideoConf(false); setReqMicQty(0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !startSlotId || !endSlotId || !roomId) {
      toast.error("Please fill all required fields");
      return;
    }
    if (startSlotId === endSlotId) {
      toast.error("Start and end time slots must be different");
      return;
    }
    if (roomType === "MULTI_PURPOSE" && (!purpose.trim() || !managerName.trim() || !managerTitle.trim() || !managerMobile.trim())) {
      toast.error("All event manager details are required for multi-purpose bookings");
      return;
    }
    setSubmitting(true);
    const timeValidation = await validateBookingLeadTime(role, date);
    if (!timeValidation.valid) {
      toast.error(timeValidation.message ?? "Selected date does not meet the required advance notice period.");
      setSubmitting(false);
      return;
    }
    const conflictCheck = await checkBookingConflict(roomId, date, startSlotId, endSlotId);
    if (conflictCheck.conflict) {
      toast.error(conflictCheck.message ?? "This room is already booked during the selected time.");
      setSubmitting(false);
      return;
    }
    const payload: Record<string, unknown> = {
      user_id: userId, room_id: roomId, booking_date: date,
      start_slot_id: startSlotId, end_slot_id: endSlotId,
      status: "PENDING", type: roomType === "LECTURE" ? "EXCEPTIONAL" : "MULTI_PURPOSE",
    };
    if (roomType === "MULTI_PURPOSE") {
      Object.assign(payload, {
        purpose: purpose.trim(), manager_name: managerName.trim(),
        manager_title: managerTitle.trim(), manager_mobile: managerMobile.trim(),
        req_laptop: reqLaptop, req_video_conf: reqVideoConf, req_mic_qty: reqMicQty,
      });
    }
    const { error } = await supabase.from("bookings").insert(payload);
    if (error) toast.error(error.message || "Failed to submit booking request");
    else {
      toast.success("Booking request submitted successfully!");
      resetForm();
      await fetchHistory();
    }
    setSubmitting(false);
  };

  const filteredRooms = rooms.filter((r) => r.type === roomType);

  if (loading) {
    return (
      <div className="bg-card border border-card-border rounded-2xl p-12 flex flex-col items-center gap-3">
        <Loader2 className="animate-spin text-secondary h-8 w-8" />
        <p className="text-muted text-sm">Loading your workspace...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full">
      {canViewAvailability && <WeeklyCalendar />}

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Booking Form */}
        <div className="xl:col-span-3 bg-card border border-card-border rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-card-border bg-primary/5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">New Booking Request</h2>
                <p className="text-xs text-muted">
                  {isSecretary
                    ? "Multi-purpose rooms only · 48 hours minimum notice"
                    : "Lecture or multi-purpose rooms · 24 hours minimum notice"}
                </p>
              </div>
            </div>
          </div>

          {isSecretary && (
            <div className="mx-6 mt-5 flex items-start gap-2.5 bg-blue-50 border border-blue-100 rounded-xl p-3.5">
              <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-800">
                As a Secretary, you may only book <strong>Multi-Purpose</strong> rooms with at least <strong>48 hours</strong> advance notice.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Room Type */}
            {!isSecretary && (
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">Room Type</label>
                <div className="grid grid-cols-2 gap-3">
                  {(["LECTURE", "MULTI_PURPOSE"] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => { setRoomType(type); setRoomId(""); }}
                      className={`px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all text-left ${
                        roomType === type
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-card-border text-muted hover:border-primary/30"
                      }`}
                    >
                      {type === "LECTURE" ? "🏛 Lecture Room (Exceptional)" : "🎭 Multi-Purpose Room"}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Room Selection */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                {isSecretary ? "Multi-Purpose Room" : "Select Room"}
              </label>
              <select
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-card-border bg-background text-foreground focus:ring-2 focus:ring-secondary focus:outline-none text-sm"
                required
              >
                <option value="">— Choose a room —</option>
                {filteredRooms.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
              {filteredRooms.length === 0 && (
                <p className="mt-1.5 text-xs text-amber-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  No active rooms of this type. Contact your admin.
                </p>
              )}
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">Booking Date</label>
              <input
                type="date"
                value={date}
                min={getMinDate()}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-card-border bg-background text-foreground focus:ring-2 focus:ring-secondary focus:outline-none text-sm"
                required
              />
              <p className="mt-1.5 text-xs text-muted">
                Minimum <strong>{role === "SECRETARY" ? "48" : "24"} hours</strong> advance notice required (Cairo timezone)
              </p>
            </div>

            {/* Time Slots */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">Start Time</label>
                <select
                  value={startSlotId}
                  onChange={(e) => setStartSlotId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-card-border bg-background text-foreground focus:ring-2 focus:ring-secondary focus:outline-none text-sm"
                  required
                >
                  <option value="">Select start</option>
                  {timeSlots.map((slot) => (
                    <option key={slot.id} value={slot.id}>{slot.start_time.substring(0, 5)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">End Time</label>
                <select
                  value={endSlotId}
                  onChange={(e) => setEndSlotId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-card-border bg-background text-foreground focus:ring-2 focus:ring-secondary focus:outline-none text-sm"
                  required
                >
                  <option value="">Select end</option>
                  {timeSlots
                    .filter((s) => !startSlotId || s.start_time > (timeSlots.find((x) => x.id === startSlotId)?.start_time ?? ""))
                    .map((slot) => (
                      <option key={slot.id} value={slot.id}>{slot.end_time.substring(0, 5)}</option>
                    ))}
                </select>
              </div>
            </div>

            {/* Multi-Purpose Section */}
            {roomType === "MULTI_PURPOSE" && (
              <div className="pt-5 border-t border-card-border space-y-4">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <span className="w-6 h-6 bg-purple-100 text-purple-700 rounded-lg flex items-center justify-center text-xs font-bold">2</span>
                  Event Manager &amp; Technical Requirements
                </h3>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Purpose / Event Type <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-card-border bg-background text-foreground focus:ring-2 focus:ring-secondary focus:outline-none resize-none text-sm"
                    rows={2}
                    required
                    placeholder="e.g. Faculty workshop on curriculum development"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">Manager Name <span className="text-red-500">*</span></label>
                    <input type="text" value={managerName} onChange={(e) => setManagerName(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-card-border bg-background text-foreground focus:ring-2 focus:ring-secondary focus:outline-none text-sm"
                      required placeholder="Full name" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">Job Title <span className="text-red-500">*</span></label>
                    <input type="text" value={managerTitle} onChange={(e) => setManagerTitle(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-card-border bg-background text-foreground focus:ring-2 focus:ring-secondary focus:outline-none text-sm"
                      required placeholder="e.g. Associate Professor" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">Mobile Number <span className="text-red-500">*</span></label>
                    <input type="tel" value={managerMobile} onChange={(e) => setManagerMobile(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-card-border bg-background text-foreground focus:ring-2 focus:ring-secondary focus:outline-none text-sm"
                      required placeholder="e.g. 01012345678" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">Microphones (qty)</label>
                    <input type="number" min="0" value={reqMicQty}
                      onChange={(e) => setReqMicQty(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full px-4 py-3 rounded-xl border border-card-border bg-background text-foreground focus:ring-2 focus:ring-secondary focus:outline-none text-sm" />
                  </div>
                </div>

                <div className="flex flex-col gap-3 p-4 bg-slate-50 rounded-xl border border-card-border">
                  <p className="text-xs font-bold text-muted uppercase tracking-wider">Technical Requirements</p>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={reqLaptop} onChange={(e) => setReqLaptop(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-secondary focus:ring-secondary" />
                    <span className="text-sm text-foreground">Requires Laptop</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={reqVideoConf} onChange={(e) => setReqVideoConf(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-secondary focus:ring-secondary" />
                    <span className="text-sm text-foreground">Requires Video Conference</span>
                  </label>
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 px-8 py-3 bg-secondary hover:bg-yellow-400 text-primary font-bold rounded-xl shadow-sm transition-all hover:shadow-md focus:ring-2 focus:ring-secondary focus:ring-offset-2 disabled:opacity-70 text-sm"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                {submitting ? "Submitting..." : "Submit Request"}
              </button>
            </div>
          </form>
        </div>

        {/* Request History */}
        <div className="xl:col-span-2 bg-card border border-card-border rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-card-border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-xl">
                <ClipboardList className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">My Booking Requests</h2>
                <p className="text-xs text-muted">{historyBookings.length} requests total</p>
              </div>
            </div>
          </div>

          <div className="p-4 max-h-[600px] overflow-y-auto">
            {historyBookings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted">
                <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-3">
                  <Calendar className="w-7 h-7 opacity-40" />
                </div>
                <p className="font-semibold text-sm">No requests yet</p>
                <p className="text-xs mt-1">Submit your first booking using the form.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {historyBookings.map((b) => {
                  const roomName = Array.isArray(b.rooms) ? (b.rooms as { name: string }[])[0]?.name : (b.rooms as { name: string } | null)?.name;
                  const startTime = Array.isArray(b.start_slot) ? (b.start_slot as { start_time: string }[])[0]?.start_time : (b.start_slot as { start_time: string } | null)?.start_time;
                  const endTime = Array.isArray(b.end_slot) ? (b.end_slot as { end_time: string }[])[0]?.end_time : (b.end_slot as { end_time: string } | null)?.end_time;
                  const cfg = STATUS_CONFIG[b.status] ?? STATUS_CONFIG.PENDING;
                  const StatusIcon = cfg.icon;

                  return (
                    <div key={b.id} className="rounded-xl border border-card-border bg-background overflow-hidden">
                      <div className="px-4 py-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground text-sm truncate">{roomName ?? "Unknown Room"}</p>
                            <p className="text-xs text-muted mt-0.5">
                              {b.booking_date}
                              {startTime && ` · ${startTime.substring(0, 5)}–${endTime?.substring(0, 5) ?? "?"}`}
                            </p>
                            <span className="inline-block mt-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                              {b.type === "MULTI_PURPOSE" ? "Multi-Purpose" : "Exceptional Lecture"}
                            </span>
                          </div>
                          <span className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold rounded-lg border flex-shrink-0 ${cfg.cls}`}>
                            <StatusIcon className="w-3 h-3" />
                            {cfg.label}
                          </span>
                        </div>
                      </div>
                      {b.status === "REJECTED" && (b.rejection_reason || b.suggested_alternative) && (
                        <div className="border-t border-red-100 bg-red-50 px-4 py-3 space-y-1.5">
                          {b.rejection_reason && (
                            <p className="text-xs text-red-800">
                              <strong className="font-semibold">Reason:</strong> {b.rejection_reason}
                            </p>
                          )}
                          {b.suggested_alternative && (
                            <p className="text-xs text-amber-800">
                              <strong className="font-semibold">Suggested Alternative:</strong> {b.suggested_alternative}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
