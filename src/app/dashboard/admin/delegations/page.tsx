"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Plus, X, GitMerge, Trash2, ArrowRight } from "lucide-react";
import { toast } from "react-hot-toast";

type Employee = { id: string; employee_id: string; full_name: string; role: string };
type Delegation = {
  id: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
  primary_user: { full_name: string; employee_id: string } | null;
  substitute_user: { full_name: string; employee_id: string } | null;
};

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase();
}

export default function DelegationsPage() {
  const [delegations, setDelegations] = useState<Delegation[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [primaryUserId, setPrimaryUserId] = useState("");
  const [substituteUserId, setSubstituteUserId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const supabase = createClient();

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [delegRes, empRes] = await Promise.all([
      supabase.from("delegations").select("id, start_date, end_date, is_active, created_at, primary_user:primary_user_id(full_name, employee_id), substitute_user:substitute_user_id(full_name, employee_id)")
        .order("created_at", { ascending: false }),
      supabase.from("users").select("id, employee_id, full_name, role").in("role", ["EMPLOYEE", "SECRETARY"]).eq("is_approved", true).order("full_name"),
    ]);
    if (delegRes.data) setDelegations(delegRes.data as unknown as Delegation[]);
    if (empRes.data) setEmployees(empRes.data);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!primaryUserId || !substituteUserId || !startDate || !endDate) return toast.error("All fields are required");
    if (primaryUserId === substituteUserId) return toast.error("Primary and substitute must be different employees");
    if (startDate > endDate) return toast.error("Start date must be before end date");

    setSubmitting(true);
    const { error } = await supabase.from("delegations").insert({
      primary_user_id: primaryUserId, substitute_user_id: substituteUserId,
      start_date: startDate, end_date: endDate, is_active: true,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Delegation created successfully!");
      setShowForm(false); setPrimaryUserId(""); setSubstituteUserId(""); setStartDate(""); setEndDate("");
      fetchData();
    }
    setSubmitting(false);
  };

  const toggleActive = async (id: string, current: boolean) => {
    const { error } = await supabase.from("delegations").update({ is_active: !current }).eq("id", id);
    if (error) toast.error("Failed to update delegation");
    else { toast.success(current ? "Delegation deactivated." : "Delegation activated."); fetchData(); }
  };

  const deleteDelegation = async (id: string) => {
    if (!confirm("Delete this delegation? This cannot be undone.")) return;
    const { error } = await supabase.from("delegations").delete().eq("id", id);
    if (error) toast.error("Failed to delete delegation");
    else { toast.success("Delegation deleted."); setDelegations((prev) => prev.filter((d) => d.id !== id)); }
  };

  const today = new Date().toISOString().split("T")[0];

  const getStatus = (d: Delegation) => {
    if (!d.is_active) return { label: "Inactive", cls: "bg-slate-100 text-slate-600" };
    if (d.end_date < today) return { label: "Expired", cls: "bg-red-100 text-red-700" };
    if (d.start_date > today) return { label: "Upcoming", cls: "bg-blue-100 text-blue-700" };
    return { label: "Active Now", cls: "bg-green-100 text-green-700" };
  };

  return (
    <div className="flex-1 p-6 md:p-8 bg-background min-h-screen">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-card border border-card-border rounded-2xl p-6 shadow-sm flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-2xl">
              <GitMerge className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Delegation Management</h1>
              <p className="text-sm text-muted mt-0.5">Grant temporary calendar access to substitute employees during leave periods.</p>
            </div>
          </div>
          <button onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-primary hover:bg-blue-900 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors">
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? "Cancel" : "New Delegation"}
          </button>
        </div>

        {/* Create Form */}
        {showForm && (
          <div className="bg-card border border-card-border rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-card-border bg-slate-50">
              <h2 className="font-bold text-foreground">Create New Delegation</h2>
              <p className="text-xs text-muted mt-0.5">The substitute will gain calendar visibility during the specified period.</p>
            </div>
            <form onSubmit={handleCreate} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">Primary Employee (going on leave)</label>
                <select value={primaryUserId} onChange={(e) => setPrimaryUserId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-card-border bg-background text-foreground focus:ring-2 focus:ring-secondary focus:outline-none text-sm" required>
                  <option value="">Select employee</option>
                  {employees.map((e) => <option key={e.id} value={e.id}>{e.full_name} ({e.employee_id})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">Substitute Employee (covering)</label>
                <select value={substituteUserId} onChange={(e) => setSubstituteUserId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-card-border bg-background text-foreground focus:ring-2 focus:ring-secondary focus:outline-none text-sm" required>
                  <option value="">Select substitute</option>
                  {employees.filter((e) => e.id !== primaryUserId).map((e) => <option key={e.id} value={e.id}>{e.full_name} ({e.employee_id})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">Start Date</label>
                <input type="date" value={startDate} min={today} onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-card-border bg-background text-foreground focus:ring-2 focus:ring-secondary focus:outline-none text-sm" required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">End Date</label>
                <input type="date" value={endDate} min={startDate || today} onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-card-border bg-background text-foreground focus:ring-2 focus:ring-secondary focus:outline-none text-sm" required />
              </div>
              <div className="md:col-span-2">
                <button type="submit" disabled={submitting}
                  className="flex items-center gap-2 bg-secondary hover:bg-yellow-400 text-primary font-bold px-6 py-3 rounded-xl transition-colors disabled:opacity-70 text-sm">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Create Delegation
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Delegations List */}
        <div className="bg-card border border-card-border rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-card-border">
            <h2 className="font-bold text-foreground">All Delegations</h2>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="animate-spin text-secondary h-8 w-8" />
            </div>
          ) : delegations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted">
              <GitMerge className="w-12 h-12 opacity-20 mb-3" />
              <p className="font-semibold">No delegations yet</p>
              <p className="text-sm mt-1">Create your first delegation using the button above.</p>
            </div>
          ) : (
            <div className="divide-y divide-card-border">
              {delegations.map((d) => {
                const primary = Array.isArray(d.primary_user) ? d.primary_user[0] : d.primary_user;
                const sub = Array.isArray(d.substitute_user) ? d.substitute_user[0] : d.substitute_user;
                const status = getStatus(d);

                return (
                  <div key={d.id} className="px-6 py-4 flex items-center flex-wrap gap-4 hover:bg-slate-50/50 transition-colors">
                    {/* Users */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary font-bold text-xs flex items-center justify-center flex-shrink-0">
                        {getInitials(primary?.full_name ?? "?")}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground text-sm truncate">{primary?.full_name ?? "Unknown"}</p>
                        <p className="text-xs text-muted font-mono">{primary?.employee_id}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted flex-shrink-0" />
                      <div className="w-9 h-9 rounded-xl bg-secondary/20 text-secondary font-bold text-xs flex items-center justify-center flex-shrink-0">
                        {getInitials(sub?.full_name ?? "?")}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground text-sm truncate">{sub?.full_name ?? "Unknown"}</p>
                        <p className="text-xs text-muted font-mono">{sub?.employee_id}</p>
                      </div>
                    </div>

                    {/* Period & Status */}
                    <div className="flex items-center gap-3 flex-shrink-0 flex-wrap">
                      <span className="text-xs text-muted font-medium">{d.start_date} → {d.end_date}</span>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${status.cls}`}>{status.label}</span>
                      <button onClick={() => toggleActive(d.id, d.is_active)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                          d.is_active
                            ? "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
                            : "bg-green-50 text-green-700 hover:bg-green-100 border border-green-200"
                        }`}>
                        {d.is_active ? "Deactivate" : "Activate"}
                      </button>
                      <button onClick={() => deleteDelegation(d.id)}
                        className="p-1.5 text-muted hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
