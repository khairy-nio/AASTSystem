"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Search, Building2, CheckCircle, XCircle } from "lucide-react";
import { toast } from "react-hot-toast";

type TimeSlot = { id: string; start_time: string; end_time: string };
type Room = { id: string; name: string; type: string };

export default function EmptyRoomSearch() {
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [searchDate, setSearchDate] = useState("");
  const [searchSlotId, setSearchSlotId] = useState("");
  const [searchType, setSearchType] = useState<"LECTURE" | "MULTI_PURPOSE" | "ALL">("ALL");
  const [availableRooms, setAvailableRooms] = useState<Room[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    supabase.from("time_slots").select("*").eq("is_active", true).order("start_time")
      .then(({ data }) => { if (data) setSlots(data as TimeSlot[]); });
  }, []);

  const executeSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchDate || !searchSlotId) return toast.error("Date and time slot are required.");
    setIsSearching(true);
    setAvailableRooms(null);

    let roomsQuery = supabase.from("rooms").select("*").eq("is_active", true);
    if (searchType !== "ALL") roomsQuery = roomsQuery.eq("type", searchType);
    const { data: allRooms, error: roomError } = await roomsQuery;
    if (roomError) { toast.error("Error fetching rooms"); setIsSearching(false); return; }

    const { data: overlapping, error: bookingError } = await supabase
      .from("bookings").select("room_id").eq("booking_date", searchDate)
      .or(`start_slot_id.eq.${searchSlotId},end_slot_id.eq.${searchSlotId}`)
      .or("status.eq.APPROVED,type.eq.FIXED");

    if (bookingError) { toast.error("Error evaluating overlaps"); setIsSearching(false); return; }

    const bookedIds = new Set((overlapping ?? []).map((b) => b.room_id));
    setAvailableRooms((allRooms as Room[]).filter((r) => !bookedIds.has(r.id)));
    setIsSearching(false);
  };

  return (
    <div className="min-h-screen bg-background p-6 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-card border border-card-border rounded-2xl p-6 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-2xl">
            <Search className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Room Availability Search</h1>
            <p className="text-sm text-muted mt-0.5">Find all free rooms for a specific date and time slot instantly.</p>
          </div>
        </div>

        {/* Search Form */}
        <div className="bg-card border border-card-border rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-card-border">
            <h2 className="font-bold text-foreground text-sm">Search Parameters</h2>
          </div>
          <form onSubmit={executeSearch} className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Date</label>
              <input type="date" value={searchDate} onChange={(e) => setSearchDate(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-card-border bg-background text-foreground focus:ring-2 focus:ring-secondary focus:outline-none text-sm" required />
            </div>
            <div>
              <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Time Slot</label>
              <select value={searchSlotId} onChange={(e) => setSearchSlotId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-card-border bg-background text-foreground focus:ring-2 focus:ring-secondary focus:outline-none text-sm" required>
                <option value="">Select Slot</option>
                {slots.map((s) => (
                  <option key={s.id} value={s.id}>{s.start_time.substring(0, 5)} – {s.end_time.substring(0, 5)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Room Type</label>
              <select value={searchType} onChange={(e) => setSearchType(e.target.value as "LECTURE" | "MULTI_PURPOSE" | "ALL")}
                className="w-full px-4 py-3 rounded-xl border border-card-border bg-background text-foreground focus:ring-2 focus:ring-secondary focus:outline-none text-sm">
                <option value="ALL">All Types</option>
                <option value="LECTURE">Lecture</option>
                <option value="MULTI_PURPOSE">Multi-Purpose</option>
              </select>
            </div>
            <button type="submit" disabled={isSearching}
              className="flex items-center justify-center gap-2 bg-primary hover:bg-blue-900 text-white font-bold px-4 py-3 rounded-xl transition-colors text-sm disabled:opacity-70">
              {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Search
            </button>
          </form>
        </div>

        {/* Results */}
        {availableRooms !== null && (
          <div className="bg-card border border-card-border rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-card-border">
              <h3 className="font-bold text-foreground">Available Rooms</h3>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${availableRooms.length > 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                {availableRooms.length} found
              </span>
            </div>
            <div className="p-6">
              {availableRooms.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted">
                  <XCircle className="w-12 h-12 text-red-300 mb-3" />
                  <p className="font-semibold text-base">No available rooms</p>
                  <p className="text-sm mt-1">All rooms are booked for this date and time slot.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {availableRooms.map((room) => (
                    <div key={room.id} className="border border-card-border rounded-xl p-4 flex items-center gap-4 hover:border-primary hover:shadow-sm transition-all bg-background">
                      <div className="p-3 bg-green-100 rounded-xl flex-shrink-0">
                        <Building2 className="w-5 h-5 text-green-700" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-foreground text-sm truncate">{room.name}</h4>
                        <div className="flex items-center gap-1 mt-1">
                          <CheckCircle className="w-3 h-3 text-green-500" />
                          <span className="text-xs text-green-700 font-medium">Available</span>
                          <span className="text-muted text-xs mx-1">·</span>
                          <span className="text-xs text-muted">{room.type === "LECTURE" ? "Lecture" : "Multi-Purpose"}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
