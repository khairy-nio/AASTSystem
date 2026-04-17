"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Check, X, Info, ChevronDown, ChevronUp, Building2 } from "lucide-react";
import { toast } from "react-hot-toast";

type AdminApprovedBooking = {
  id: string;
  booking_date: string;
  type: string;
  room_id: string;
  start_slot_id: string;
  end_slot_id: string;
  purpose?: string;
  manager_name?: string;
  manager_title?: string;
  manager_mobile?: string;
  req_laptop?: boolean;
  req_video_conf?: boolean;
  req_mic_qty?: number;
  users?: { full_name: string } | { full_name: string }[] | null;
  rooms?: { name: string } | { name: string }[] | null;
  start_slot?: { start_time: string } | { start_time: string }[] | null;
  end_slot?: { end_time: string } | { end_time: string }[] | null;
};

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase();
}

export default function BranchManagerPage() {
  const [bookings, setBookings] = useState<AdminApprovedBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);

  const supabase = createClient();

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("bookings")
      .select(`
        id, booking_date, type, room_id, start_slot_id, end_slot_id,
        purpose, manager_name, manager_title, manager_mobile,
        req_laptop, req_video_conf, req_mic_qty,
        users:user_id(full_name),
        rooms:room_id(name),
        start_slot:start_slot_id(start_time),
        end_slot:end_slot_id(end_time)
      `)
      .eq("status", "ADMIN_APPROVED")
      .eq("type", "MULTI_PURPOSE")
      .order("booking_date", { ascending: true });

    if (!error && data) setBookings(data as unknown as AdminApprovedBooking[]);
    else if (error) toast.error("Failed to load requests");
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  const handleApprove = async (booking: AdminApprovedBooking) => {
    setProcessingId(booking.id);
    const { error } = await supabase.from("bookings").update({ status: "APPROVED" }).eq("id", booking.id);
    if (error) toast.error("Failed to approve booking");
    else {
      toast.success("Multi-purpose booking fully approved!");
      setBookings((prev) => prev.filter((b) => b.id !== booking.id));
    }
    setProcessingId(null);
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectId || !rejectionReason.trim()) {
      toast.error("Please provide a rejection reason.");
      return;
    }
    setProcessingId(rejectId);
    const { error } = await supabase
      .from("bookings")
      .update({ status: "REJECTED", rejection_reason: rejectionReason.trim() })
      .eq("id", rejectId);

    if (error) {
      toast.error("Failed to reject booking");
      setProcessingId(null);
    } else {
      toast.success("Booking rejected.");
      setBookings((prev) => prev.filter((b) => b.id !== rejectId));
      setRejectId(null);
      setRejectionReason("");
      setProcessingId(null);
    }
  };

  return (
    <div className="flex-1 p-6 md:p-8 bg-background min-h-screen">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-card border border-card-border rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-2xl">
              <Building2 className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Branch Manager Dashboard</h1>
              <p className="text-sm text-muted mt-0.5">
                Review and give final approval to multi-purpose room bookings forwarded by the Admin.
              </p>
            </div>
            <div className="ml-auto flex-shrink-0">
              <span className="bg-secondary/20 text-primary px-4 py-1.5 rounded-full text-sm font-bold border border-secondary/30">
                {bookings.length} Pending
              </span>
            </div>
          </div>
        </div>

        {/* Bookings list */}
        <div className="bg-card border border-card-border rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-card-border">
            <h2 className="font-bold text-foreground">Pending Final Approval</h2>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="animate-spin text-secondary h-8 w-8" />
            </div>
          ) : bookings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted">
              <div className="w-16 h-16 bg-green-50 border border-green-100 rounded-2xl flex items-center justify-center mb-4">
                <Check className="w-8 h-8 text-green-400" />
              </div>
              <p className="font-semibold">All approved!</p>
              <p className="text-sm mt-1">No multi-purpose bookings awaiting your approval.</p>
            </div>
          ) : (
            <div className="divide-y divide-card-border">
              {bookings.map((booking) => {
                const userName = Array.isArray(booking.users) ? booking.users[0]?.full_name : booking.users?.full_name;
                const roomName = Array.isArray(booking.rooms) ? booking.rooms[0]?.name : booking.rooms?.name;
                const startTime = Array.isArray(booking.start_slot) ? booking.start_slot[0]?.start_time : booking.start_slot?.start_time;
                const endTime = Array.isArray(booking.end_slot) ? booking.end_slot[0]?.end_time : booking.end_slot?.end_time;
                const isExpanded = expandedId === booking.id;

                return (
                  <div key={booking.id} className="p-6">
                    <div className="flex flex-wrap gap-4 items-start justify-between">
                      <div className="flex items-start gap-4 min-w-0 flex-1">
                        <div className="w-11 h-11 rounded-xl bg-purple-500 text-white font-bold text-sm flex items-center justify-center flex-shrink-0">
                          {getInitials(userName ?? "?")}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-foreground">{userName ?? "Unknown"}</span>
                            <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full text-xs font-semibold">Multi-Purpose</span>
                          </div>
                          <div className="text-sm text-muted mt-1 space-y-0.5">
                            <p>{Array.isArray(booking.rooms) ? booking.rooms[0]?.name : (booking.rooms as { name: string } | null)?.name ?? "Room TBD"} &bull; {booking.booking_date}</p>
                            <p>{startTime?.substring(0, 5)} &ndash; {endTime?.substring(0, 5)}</p>
                            {booking.purpose && <p className="text-foreground/70 font-medium">{booking.purpose}</p>}
                          </div>
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : booking.id)}
                            className="mt-2 flex items-center gap-1 text-xs text-secondary hover:text-yellow-600 font-semibold transition-colors"
                          >
                            <Info className="w-3.5 h-3.5" />
                            {isExpanded ? "Hide" : "Show"} event details
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>

                          {isExpanded && (
                            <div className="mt-3 p-4 bg-slate-50 border border-card-border rounded-xl text-sm grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <p className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Event Manager</p>
                                {booking.manager_name && <p className="text-foreground"><span className="text-muted">Name:</span> {booking.manager_name}</p>}
                                {booking.manager_title && <p className="text-foreground"><span className="text-muted">Title:</span> {booking.manager_title}</p>}
                                {booking.manager_mobile && <p className="text-foreground"><span className="text-muted">Mobile:</span> {booking.manager_mobile}</p>}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Technical Requirements</p>
                                <p className="text-foreground"><span className="text-muted">Laptop:</span> {booking.req_laptop ? "✓ Yes" : "No"}</p>
                                <p className="text-foreground"><span className="text-muted">Video Conf:</span> {booking.req_video_conf ? "✓ Yes" : "No"}</p>
                                <p className="text-foreground"><span className="text-muted">Microphones:</span> {booking.req_mic_qty ?? 0}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleApprove(booking)}
                          disabled={processingId === booking.id}
                          className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
                        >
                          {processingId === booking.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                          Approve
                        </button>
                        <button
                          onClick={() => setRejectId(booking.id)}
                          disabled={processingId === booking.id}
                          className="flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-4 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
                        >
                          <X className="w-4 h-4" />
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Reject Modal */}
      {rejectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-card rounded-2xl shadow-2xl border border-card-border w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-card-border bg-red-50">
              <h3 className="font-bold text-red-900">Reject Booking</h3>
              <p className="text-xs text-red-700 mt-0.5">Provide a reason — the requester will be notified.</p>
            </div>
            <form onSubmit={handleRejectSubmit} className="p-6">
              <label className="block text-sm font-semibold text-foreground mb-2">
                Rejection Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                autoFocus
                required
                className="w-full px-4 py-3 mb-4 rounded-xl border border-card-border bg-background text-foreground focus:ring-2 focus:ring-red-400 focus:outline-none resize-none text-sm"
                rows={4}
                placeholder="Reason for rejection"
              />
              <div className="flex justify-end gap-3 pt-2 border-t border-card-border">
                <button
                  type="button"
                  onClick={() => { setRejectId(null); setRejectionReason(""); }}
                  className="px-5 py-2.5 font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!!processingId}
                  className="px-5 py-2.5 font-bold bg-red-600 text-white hover:bg-red-700 rounded-xl text-sm transition-colors flex items-center gap-2 disabled:opacity-50"
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
