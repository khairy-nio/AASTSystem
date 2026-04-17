"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Plus, Edit2, Check, X, Power, PowerOff, Building2, Clock, CalendarDays } from "lucide-react";
import { toast } from "react-hot-toast";
import { checkBookingConflict } from "@/app/actions/bookingActions";

type Room = { id: string; name: string; type: string; is_active: boolean };
type TimeSlot = { id: string; start_time: string; end_time: string; is_active: boolean };

export default function SettingsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);

  const [isRoomFormOpen, setIsRoomFormOpen] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [roomName, setRoomName] = useState("");
  const [roomType, setRoomType] = useState<"LECTURE" | "MULTI_PURPOSE">("LECTURE");

  const [isSlotFormOpen, setIsSlotFormOpen] = useState(false);
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [slotStart, setSlotStart] = useState("");
  const [slotEnd, setSlotEnd] = useState("");

  const [semesterRoomId, setSemesterRoomId] = useState("");
  const [semesterStartDate, setSemesterStartDate] = useState("");
  const [semesterStartSlot, setSemesterStartSlot] = useState("");
  const [semesterEndSlot, setSemesterEndSlot] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const supabase = createClient();

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const [roomsRes, slotsRes] = await Promise.all([
      supabase.from("rooms").select("*").order("name"),
      supabase.from("time_slots").select("*").order("start_time"),
    ]);
    if (roomsRes.data) setRooms(roomsRes.data);
    if (slotsRes.data) setSlots(slotsRes.data);
    if (roomsRes.error || slotsRes.error) toast.error("Error fetching settings");
    setLoading(false);
  };

  const saveRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomName.trim()) return toast.error("Room name required");
    const payload = { name: roomName.trim(), type: roomType };
    if (editingRoomId) {
      const { error } = await supabase.from("rooms").update(payload).eq("id", editingRoomId);
      if (error) return toast.error(error.message);
      toast.success("Room updated successfully.");
    } else {
      const { error } = await supabase.from("rooms").insert({ ...payload, is_active: true });
      if (error) return toast.error(error.message);
      toast.success("Room created successfully.");
    }
    setRoomName(""); setRoomType("LECTURE"); setEditingRoomId(null); setIsRoomFormOpen(false);
    fetchData();
  };

  const toggleRoomStatus = async (room: Room) => {
    const { error } = await supabase.from("rooms").update({ is_active: !room.is_active }).eq("id", room.id);
    if (error) return toast.error(error.message);
    toast.success(room.is_active ? "Room disabled." : "Room enabled.");
    fetchData();
  };

  const saveSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slotStart || !slotEnd) return toast.error("Start and end time required");
    let formattedStart = slotStart;
    let formattedEnd = slotEnd;
    if (formattedStart.length === 5) formattedStart += ":00";
    if (formattedEnd.length === 5) formattedEnd += ":00";
    const payload = { start_time: formattedStart, end_time: formattedEnd };
    if (editingSlotId) {
      const { error } = await supabase.from("time_slots").update(payload).eq("id", editingSlotId);
      if (error) return toast.error(error.message);
      toast.success("Time slot updated.");
    } else {
      const { error } = await supabase.from("time_slots").insert({ ...payload, is_active: true });
      if (error) return toast.error(error.message);
      toast.success("Time slot created.");
    }
    setSlotStart(""); setSlotEnd(""); setEditingSlotId(null); setIsSlotFormOpen(false);
    fetchData();
  };

  const toggleSlotStatus = async (slot: TimeSlot) => {
    const { error } = await supabase.from("time_slots").update({ is_active: !slot.is_active }).eq("id", slot.id);
    if (error) return toast.error(error.message);
    toast.success(slot.is_active ? "Slot disabled." : "Slot enabled.");
    fetchData();
  };

  const generateSemesterSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!semesterRoomId || !semesterStartDate || !semesterStartSlot || !semesterEndSlot) {
      return toast.error("All fields are required");
    }
    setIsGenerating(true);
    const dates = [];
    const [year, month, day] = semesterStartDate.split("-").map(Number);
    for (let i = 0; i < 16; i++) {
      const d = new Date(year, month - 1, day + i * 7);
      dates.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
    }
    for (const date of dates) {
      const check = await checkBookingConflict(semesterRoomId, date, semesterStartSlot, semesterEndSlot);
      if (check.conflict) {
        toast.error(`Conflict detected on ${date}! Schedule generation aborted.`);
        setIsGenerating(false);
        return;
      }
    }
    const { data: userData } = await supabase.auth.getUser();
    const payload = dates.map((date) => ({
      room_id: semesterRoomId, booking_date: date,
      start_slot_id: semesterStartSlot, end_slot_id: semesterEndSlot,
      status: "APPROVED", type: "FIXED", user_id: userData.user?.id,
    }));
    const { error } = await supabase.from("bookings").insert(payload);
    if (error) toast.error(error.message);
    else {
      toast.success("Successfully generated 16-week Fixed Schedule!");
      setSemesterRoomId(""); setSemesterStartDate(""); setSemesterStartSlot(""); setSemesterEndSlot("");
    }
    setIsGenerating(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-secondary h-10 w-10" />
          <p className="text-muted text-sm">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6 md:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Page header */}
        <div className="bg-primary text-white rounded-2xl p-6 shadow-lg">
          <h1 className="text-2xl font-bold">System Settings</h1>
          <p className="text-blue-200 text-sm mt-1">Manage rooms, time slots, and fixed academic schedules without database access.</p>
        </div>

        {/* Rooms */}
        <section className="bg-card border border-card-border rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-card-border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-xl">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="font-bold text-foreground">Rooms Registry</h2>
                <p className="text-xs text-muted">{rooms.filter(r => r.is_active).length} active · {rooms.filter(r => !r.is_active).length} disabled</p>
              </div>
            </div>
            <button
              onClick={() => { setIsRoomFormOpen(!isRoomFormOpen); setEditingRoomId(null); setRoomName(""); setRoomType("LECTURE"); }}
              className="flex items-center gap-1.5 bg-primary hover:bg-blue-900 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
            >
              {isRoomFormOpen ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {isRoomFormOpen ? "Cancel" : "Add Room"}
            </button>
          </div>

          {isRoomFormOpen && (
            <form onSubmit={saveRoom} className="px-6 py-5 bg-slate-50 border-b border-card-border grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">Room Name</label>
                <input type="text" value={roomName} onChange={(e) => setRoomName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-card-border bg-background text-foreground focus:ring-2 focus:ring-secondary focus:outline-none text-sm"
                  placeholder="e.g. Conference Hall A" required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">Room Type</label>
                <select value={roomType} onChange={(e) => setRoomType(e.target.value as "LECTURE" | "MULTI_PURPOSE")}
                  className="w-full px-4 py-3 rounded-xl border border-card-border bg-background text-foreground focus:ring-2 focus:ring-secondary focus:outline-none text-sm">
                  <option value="LECTURE">Lecture</option>
                  <option value="MULTI_PURPOSE">Multi-Purpose</option>
                </select>
              </div>
              <button type="submit" className="flex items-center justify-center gap-2 bg-secondary hover:bg-yellow-400 text-primary font-bold px-4 py-3 rounded-xl transition-colors text-sm">
                <Check className="w-4 h-4" /> Save Data
              </button>
            </form>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-card-border text-xs text-muted uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-6 py-3 text-left">Status</th>
                  <th className="px-6 py-3 text-left">Room Name</th>
                  <th className="px-6 py-3 text-left">Type</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-card-border">
                {rooms.map((room) => (
                  <tr key={room.id} className={`hover:bg-slate-50/50 transition-colors ${!room.is_active ? "opacity-60" : ""}`}>
                    <td className="px-6 py-4">
                      {room.is_active
                        ? <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2.5 py-1 rounded-full text-xs font-bold"><Power className="w-3 h-3" />Active</span>
                        : <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-2.5 py-1 rounded-full text-xs font-bold"><PowerOff className="w-3 h-3" />Disabled</span>}
                    </td>
                    <td className="px-6 py-4 font-semibold text-foreground">{room.name}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${room.type === "LECTURE" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}>
                        {room.type === "LECTURE" ? "Lecture" : "Multi-Purpose"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => { setEditingRoomId(room.id); setRoomName(room.name); setRoomType(room.type as "LECTURE" | "MULTI_PURPOSE"); setIsRoomFormOpen(true); }}
                          className="p-2 rounded-lg text-muted hover:text-primary hover:bg-slate-100 transition-colors" title="Edit">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => toggleRoomStatus(room)}
                          className={`p-2 rounded-lg transition-colors ${room.is_active ? "text-red-500 hover:bg-red-50" : "text-green-600 hover:bg-green-50"}`} title="Toggle">
                          {room.is_active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Time Slots */}
        <section className="bg-card border border-card-border rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-card-border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-xl">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h2 className="font-bold text-foreground">Time Slots</h2>
                <p className="text-xs text-muted">{slots.filter(s => s.is_active).length} active · {slots.filter(s => !s.is_active).length} disabled</p>
              </div>
            </div>
            <button
              onClick={() => { setIsSlotFormOpen(!isSlotFormOpen); setEditingSlotId(null); setSlotStart(""); setSlotEnd(""); }}
              className="flex items-center gap-1.5 bg-primary hover:bg-blue-900 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
            >
              {isSlotFormOpen ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {isSlotFormOpen ? "Cancel" : "Add Slot"}
            </button>
          </div>

          {isSlotFormOpen && (
            <form onSubmit={saveSlot} className="px-6 py-5 bg-slate-50 border-b border-card-border grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">Start Time</label>
                <input type="time" value={slotStart} onChange={(e) => setSlotStart(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-card-border bg-background text-foreground focus:ring-2 focus:ring-secondary focus:outline-none text-sm" required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">End Time</label>
                <input type="time" value={slotEnd} onChange={(e) => setSlotEnd(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-card-border bg-background text-foreground focus:ring-2 focus:ring-secondary focus:outline-none text-sm" required />
              </div>
              <button type="submit" className="flex items-center justify-center gap-2 bg-secondary hover:bg-yellow-400 text-primary font-bold px-4 py-3 rounded-xl transition-colors text-sm">
                <Check className="w-4 h-4" /> Save Data
              </button>
            </form>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-card-border text-xs text-muted uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-6 py-3 text-left">Status</th>
                  <th className="px-6 py-3 text-left">Start</th>
                  <th className="px-6 py-3 text-left">End</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-card-border">
                {slots.map((slot) => (
                  <tr key={slot.id} className={`hover:bg-slate-50/50 transition-colors ${!slot.is_active ? "opacity-60" : ""}`}>
                    <td className="px-6 py-4">
                      {slot.is_active
                        ? <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2.5 py-1 rounded-full text-xs font-bold"><Power className="w-3 h-3" />Active</span>
                        : <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-2.5 py-1 rounded-full text-xs font-bold"><PowerOff className="w-3 h-3" />Disabled</span>}
                    </td>
                    <td className="px-6 py-4 font-mono font-semibold text-foreground">{slot.start_time.substring(0, 5)}</td>
                    <td className="px-6 py-4 font-mono font-semibold text-foreground">{slot.end_time.substring(0, 5)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => { setEditingSlotId(slot.id); setSlotStart(slot.start_time.substring(0, 5)); setSlotEnd(slot.end_time.substring(0, 5)); setIsSlotFormOpen(true); }}
                          className="p-2 rounded-lg text-muted hover:text-primary hover:bg-slate-100 transition-colors" title="Edit">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => toggleSlotStatus(slot)}
                          className={`p-2 rounded-lg transition-colors ${slot.is_active ? "text-red-500 hover:bg-red-50" : "text-green-600 hover:bg-green-50"}`} title="Toggle">
                          {slot.is_active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Fixed Academic Schedules */}
        <section className="bg-card border border-card-border rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-card-border">
            <div className="p-2 bg-green-100 rounded-xl">
              <CalendarDays className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="font-bold text-foreground">Fixed Academic Schedules</h2>
              <p className="text-xs text-muted">Generate 16-week recurring FIXED bookings atomically</p>
            </div>
          </div>

          <div className="p-6">
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 text-sm text-blue-800">
              If any single week conflicts with an existing approved booking, <strong>the entire transaction is aborted</strong> — zero bookings will be created.
            </div>

            <form onSubmit={generateSemesterSchedule} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
              <div>
                <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Room</label>
                <select value={semesterRoomId} onChange={(e) => setSemesterRoomId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-card-border bg-background text-foreground focus:ring-2 focus:ring-secondary focus:outline-none text-sm" required>
                  <option value="">Select Room</option>
                  {rooms.filter((r) => r.is_active).map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Start Date (Week 1)</label>
                <input type="date" value={semesterStartDate} onChange={(e) => setSemesterStartDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-card-border bg-background text-foreground focus:ring-2 focus:ring-secondary focus:outline-none text-sm" required />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Start Time</label>
                <select value={semesterStartSlot} onChange={(e) => setSemesterStartSlot(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-card-border bg-background text-foreground focus:ring-2 focus:ring-secondary focus:outline-none text-sm" required>
                  <option value="">Start Slot</option>
                  {slots.filter((s) => s.is_active).map((s) => (
                    <option key={s.id} value={s.id}>{s.start_time.substring(0, 5)} – {s.end_time.substring(0, 5)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">End Time</label>
                <select value={semesterEndSlot} onChange={(e) => setSemesterEndSlot(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-card-border bg-background text-foreground focus:ring-2 focus:ring-secondary focus:outline-none text-sm" required>
                  <option value="">End Slot</option>
                  {slots.filter((s) => s.is_active).map((s) => (
                    <option key={s.id} value={s.id}>{s.start_time.substring(0, 5)} – {s.end_time.substring(0, 5)}</option>
                  ))}
                </select>
              </div>
              <button type="submit" disabled={isGenerating}
                className="flex items-center justify-center gap-2 bg-primary hover:bg-blue-900 text-white font-bold px-4 py-3 rounded-xl transition-colors text-sm disabled:opacity-70">
                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarDays className="w-4 h-4" />}
                Generate 16 Weeks
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
