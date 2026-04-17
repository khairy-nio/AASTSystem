"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Loader2, Check, X, UserCheck, Bell, ClipboardList,
  AlertTriangle, ChevronDown, ChevronUp
} from "lucide-react";
import { toast } from "react-hot-toast";
import { checkBookingConflict } from "@/app/actions/bookingActions";

type PendingBooking = {
  id: string;
  booking_date: string;
  type: string;
  room_id: string;
  start_slot_id: string;
  end_slot_id: string;
  purpose?: string;
  manager_name?: string;
  users?: { full_name: string } | { full_name: string }[] | null;
  rooms?: { name: string } | { name: string }[] | null;
  start_slot?: { start_time: string } | { start_time: string }[] | null;
  end_slot?: { end_time: string } | { end_time: string }[] | null;
};

type PendingUser = {
  id: string;
  employee_id: string;
  full_name: string;
  role: string;
  created_at: string;
};

const ROLE_LABEL: Record<string, string> = {
  EMPLOYEE: "Employee",
  SECRETARY: "Secretary",
  BRANCH_MANAGER: "Branch Manager",
  ADMIN: "Admin",
};

const ROLE_COLOR: Record<string, string> = {
  EMPLOYEE: "bg-emerald-100 text-emerald-800",
  SECRETARY: "bg-blue-100 text-blue-800",
  BRANCH_MANAGER: "bg-purple-100 text-purple-800",
};

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase();
}

export default function AdminView() {
  const [bookings, setBookings] = useState<PendingBooking[]>([]);
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [expandedBookingId, setExpandedBookingId] = useState<string | null>(null);

  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [suggestedAlternative, setSuggestedAlternative] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [processingUserId, setProcessingUserId] = useState<string | null>(null);

  const supabase = createClient();

  const fetchBookings = useCallback(async () => {
    setLoadingBookings(true);
    const { data, error } = await supabase
      .from("bookings")
      .select(`
        id, booking_date, type, room_id, start_slot_id, end_slot_id,
        purpose, manager_name,
        users:user_id(full_name),
        rooms:room_id(name),
        start_slot:start_slot_id(start_time),
        end_slot:end_slot_id(end_time)
      `)
      .eq("status", "PENDING")
      .order("created_at", { ascending: true });

    if (!error && data) setBookings(data as unknown as PendingBooking[]);
    else if (error) toast.error("Failed to load pending requests");
    setLoadingBookings(false);
  }, [supabase]);

  const fetchPendingUsers = useCallback(async () => {
    setLoadingUsers(true);
    const { data, error } = await supabase
      .from("users")
      .select("id, employee_id, full_name, role, created_at")
      .eq("is_approved", false)
      .order("created_at", { ascending: true });

    if (!error && data) setPendingUsers(data as PendingUser[]);
    setLoadingUsers(false);
  }, [supabase]);

  useEffect(() => {
    fetchBookings();
    fetchPendingUsers();
  }, [fetchBookings, fetchPendingUsers]);

  const handleApproveUser = async (u: PendingUser) => {
    setProcessingUserId(u.id);
    const { error } = await supabase.from("users").update({ is_approved: true }).eq("id", u.id);
    if (error) toast.error("Failed to approve user");
    else {
      toast.success(`${u.full_name} approved and activated!`);
      setPendingUsers((prev) => prev.filter((x) => x.id !== u.id));
    }
    setProcessingUserId(null);
  };

  const handleRejectUser = async (u: PendingUser) => {
    if (!confirm(`Reject and delete the registration for ${u.full_name}? This cannot be undone.`)) return;
    setProcessingUserId(u.id);
    const { error } = await supabase.from("users").delete().eq("id", u.id);
    if (error) toast.error("Failed to reject user");
    else {
      toast.success(`${u.full_name}'s registration rejected.`);
      setPendingUsers((prev) => prev.filter((x) => x.id !== u.id));
    }
    setProcessingUserId(null);
  };

  const handleApprove = async (booking: PendingBooking) => {
    setProcessingId(booking.id);
    if (!booking.room_id) {
      toast.error("This booking has no valid room assigned.");
      setProcessingId(null);
      return;
    }
    const conflictCheck = await checkBookingConflict(
      booking.room_id, booking.booking_date, booking.start_slot_id, booking.end_slot_id, booking.id
    );
    if (conflictCheck.conflict) {
      toast.error(conflictCheck.message || "Double-booking conflict detected!");
      setProcessingId(null);
      return;
    }
    const newStatus = booking.type === "MULTI_PURPOSE" ? "ADMIN_APPROVED" : "APPROVED";
    const { error } = await supabase.from("bookings").update({ status: newStatus }).eq("id", booking.id);
    if (error) toast.error("Failed to approve booking");
    else {
      toast.success(
        booking.type === "MULTI_PURPOSE"
          ? "Forwarded to Branch Manager for final approval!"
          : "Booking Approved!"
      );
      setBookings((prev) => prev.filter((b) => b.id !== booking.id));
    }
    setProcessingId(null);
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectId) return;
    if (!rejectionReason.trim()) {
      toast.error("Please provide a rejection reason.");
      return;
    }
    setProcessingId(rejectId);
    const { error } = await supabase
      .from("bookings")
      .update({
        status: "REJECTED",
        rejection_reason: rejectionReason.trim(),
        suggested_alternative: suggestedAlternative.trim() || null,
      })
      .eq("id", rejectId);

    if (error) {
      toast.error("Failed to reject booking");
      setProcessingId(null);
    } else {
      toast.success("Booking rejected. User has been notified.");
      setBookings((prev) => prev.filter((b) => b.id !== rejectId));
      setRejectId(null);
      setRejectionReason("");
      setSuggestedAlternative("");
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats bar */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card border border-card-border rounded-xl p-5 flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-amber-100 rounded-xl">
            <Bell className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-2xl font-extrabold text-foreground">
              {loadingUsers ? "—" : pendingUsers.length}
            </p>
            <p className="text-sm text-muted font-medium">Pending Registrations</p>
          </div>
        </div>
        <div className="bg-card border border-card-border rounded-xl p-5 flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-blue-100 rounded-xl">
            <ClipboardList className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-extrabold text-foreground">
              {loadingBookings ? "—" : bookings.length}
            </p>
            <p className="text-sm text-muted font-medium">Pending Booking Requests</p>
          </div>
        </div>
      </div>

      {/* Pending Registrations */}
      {(loadingUsers || pendingUsers.length > 0) && (
        <div className="bg-card border border-amber-200 rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 bg-amber-50 border-b border-amber-100">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-amber-600" />
              <div>
                <h2 className="text-base font-bold text-amber-900">Pending Registrations</h2>
                <p className="text-xs text-amber-700">New accounts awaiting activation</p>
              </div>
            </div>
            {pendingUsers.length > 0 && (
              <span className="bg-amber-200 text-amber-900 px-3 py-1 rounded-full text-xs font-bold">
                {pendingUsers.length} pending
              </span>
            )}
          </div>

          {loadingUsers ? (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin text-amber-500 h-6 w-6" />
            </div>
          ) : (
            <div className="divide-y divide-amber-50">
              {pendingUsers.map((u) => (
                <div key={u.id} className="flex items-center justify-between px-6 py-4 hover:bg-amber-50/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-800 font-bold text-sm flex-shrink-0">
                      {getInitials(u.full_name)}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-sm">{u.full_name}</p>
                      <p className="text-xs text-muted font-mono">{u.employee_id}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${ROLE_COLOR[u.role] ?? "bg-gray-100 text-gray-700"}`}>
                      {ROLE_LABEL[u.role] ?? u.role}
                    </span>
                    <span className="text-xs text-muted hidden sm:block">
                      {new Date(u.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleApproveUser(u)}
                      disabled={processingUserId === u.id}
                      className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                    >
                      {processingUserId === u.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserCheck className="w-3 h-3" />}
                      Approve
                    </button>
                    <button
                      onClick={() => handleRejectUser(u)}
                      disabled={processingUserId === u.id}
                      className="flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                    >
                      <X className="w-3 h-3" />
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Pending Booking Requests */}
      <div className="bg-card border border-card-border rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-card-border">
          <div className="flex items-center gap-3">
            <ClipboardList className="w-5 h-5 text-primary" />
            <h2 className="text-base font-bold text-foreground">Pending Booking Requests</h2>
          </div>
          <span className="bg-secondary/20 text-primary px-3 py-1 rounded-full text-xs font-bold border border-secondary/30">
            {bookings.length} pending
          </span>
        </div>

        {loadingBookings ? (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin text-secondary h-8 w-8" />
          </div>
        ) : bookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted">
            <div className="w-16 h-16 bg-green-50 border border-green-100 rounded-2xl flex items-center justify-center mb-4">
              <Check className="w-8 h-8 text-green-400" />
            </div>
            <p className="font-semibold text-base">All caught up!</p>
            <p className="text-sm mt-1">No pending booking requests at this time.</p>
          </div>
        ) : (
          <div className="divide-y divide-card-border">
            {bookings.map((booking) => {
              const userName = Array.isArray(booking.users) ? booking.users[0]?.full_name : booking.users?.full_name;
              const roomName = Array.isArray(booking.rooms) ? booking.rooms[0]?.name : booking.rooms?.name;
              const startTime = Array.isArray(booking.start_slot) ? booking.start_slot[0]?.start_time : booking.start_slot?.start_time;
              const endTime = Array.isArray(booking.end_slot) ? booking.end_slot[0]?.end_time : booking.end_slot?.end_time;
              const isExpanded = expandedBookingId === booking.id;
              const isMP = booking.type === "MULTI_PURPOSE";

              return (
                <div key={booking.id}>
                  <div className="px-6 py-4 hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-xs flex-shrink-0 ${isMP ? "bg-purple-500" : "bg-blue-500"}`}>
                          {getInitials(userName ?? "?")}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-foreground text-sm">{userName ?? "Unknown"}</p>
                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${isMP ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"}`}>
                              {isMP ? "Multi-Purpose" : "Exceptional Lecture"}
                            </span>
                          </div>
                          <p className="text-xs text-muted mt-0.5">
                            {roomName ?? "Room TBD"} &bull; {booking.booking_date} &bull; {startTime?.substring(0, 5)}–{endTime?.substring(0, 5)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {isMP && (
                          <button
                            onClick={() => setExpandedBookingId(isExpanded ? null : booking.id)}
                            className="flex items-center gap-1 text-xs text-secondary hover:text-yellow-600 font-medium transition-colors"
                          >
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            Details
                          </button>
                        )}
                        <button
                          onClick={() => handleApprove(booking)}
                          disabled={processingId === booking.id}
                          className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                        >
                          {processingId === booking.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                          Approve
                        </button>
                        <button
                          onClick={() => setRejectId(booking.id)}
                          disabled={processingId === booking.id}
                          className="flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                        >
                          <X className="w-3 h-3" />
                          Reject
                        </button>
                      </div>
                    </div>
                    {/* Expanded multi-purpose details */}
                    {isExpanded && isMP && (
                      <div className="mt-4 ml-14 p-4 bg-purple-50 border border-purple-100 rounded-xl text-xs text-purple-900 space-y-1">
                        {booking.purpose && <p><strong>Purpose:</strong> {booking.purpose}</p>}
                        {booking.manager_name && <p><strong>Event Manager:</strong> {booking.manager_name}</p>}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {rejectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-card rounded-2xl shadow-2xl border border-card-border w-full max-w-lg overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-card-border bg-red-50">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-red-900">Reject Booking Request</h3>
                <p className="text-xs text-red-700">The user will be notified with your reason.</p>
              </div>
            </div>
            <form onSubmit={handleRejectSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Rejection Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  autoFocus
                  required
                  className="w-full px-4 py-3 rounded-xl border border-card-border bg-background text-foreground focus:ring-2 focus:ring-red-400 focus:outline-none resize-none text-sm"
                  rows={3}
                  placeholder="e.g. Room is occupied by a fixed lecture schedule on this date."
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Suggested Alternative <span className="text-muted font-normal">(optional)</span>
                </label>
                <textarea
                  value={suggestedAlternative}
                  onChange={(e) => setSuggestedAlternative(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-card-border bg-background text-foreground focus:ring-2 focus:ring-secondary focus:outline-none resize-none text-sm"
                  rows={3}
                  placeholder="e.g. Try Room B at the same time, or Room A at 2:00 PM."
                />
                <p className="mt-1.5 text-xs text-muted">This will be shown to the user alongside the rejection reason.</p>
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-card-border">
                <button
                  type="button"
                  onClick={() => { setRejectId(null); setRejectionReason(""); setSuggestedAlternative(""); }}
                  className="px-5 py-2.5 font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!!processingId}
                  className="px-5 py-2.5 font-bold bg-red-600 text-white hover:bg-red-700 rounded-xl transition-colors flex items-center gap-2 text-sm disabled:opacity-50"
                >
                  {processingId === rejectId && <Loader2 className="w-4 h-4 animate-spin" />}
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
