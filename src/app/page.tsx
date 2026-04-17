import Link from "next/link";
import { Building2, CalendarCheck, Shield, Users, Clock, ArrowRight, CheckCircle } from "lucide-react";

const features = [
  {
    icon: CalendarCheck,
    title: "Smart Room Booking",
    description: "Submit lecture and multi-purpose room requests with automatic lead-time enforcement.",
    color: "bg-blue-50 text-blue-600 border-blue-100",
  },
  {
    icon: Shield,
    title: "Multi-Level Approval",
    description: "Structured workflows with Admin pre-approval and Branch Manager final sign-off.",
    color: "bg-amber-50 text-amber-600 border-amber-100",
  },
  {
    icon: Users,
    title: "Role-Based Access",
    description: "Four distinct roles — Admin, Branch Manager, Employee, and Secretary — each with tailored permissions.",
    color: "bg-purple-50 text-purple-600 border-purple-100",
  },
  {
    icon: Clock,
    title: "Conflict Prevention",
    description: "Real-time conflict detection prevents double-bookings and fixed schedule violations.",
    color: "bg-green-50 text-green-600 border-green-100",
  },
];

const benefits = [
  "24-hour minimum advance notice for employees",
  "48-hour minimum for secretaries",
  "16-week fixed academic schedule generation",
  "Delegation system for leave coverage",
  "Calendar availability view",
  "Rejection feedback with suggested alternatives",
];

export default function Home() {
  return (
    <div className="flex flex-col flex-1">
      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 py-20 bg-gradient-to-b from-primary via-blue-900 to-blue-800 relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-10 left-10 w-64 h-64 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-yellow-400 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white/90 px-4 py-1.5 rounded-full text-sm font-medium mb-6 backdrop-blur-sm">
            <Building2 className="w-4 h-4 text-secondary" />
            Arab Academy for Science, Technology & Maritime Transport
          </div>

          <h1 className="text-5xl sm:text-6xl font-extrabold text-white mb-6 leading-tight tracking-tight">
            AAST<span className="text-secondary">Sys</span>
          </h1>

          <p className="text-xl text-blue-100 mb-10 max-w-xl mx-auto leading-relaxed">
            The official room &amp; hall booking management platform for AASTMT. Streamlined requests, transparent approvals, zero conflicts.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-secondary hover:bg-yellow-400 text-primary font-bold rounded-xl shadow-lg shadow-yellow-400/20 transition-all hover:shadow-xl hover:scale-105 text-base"
            >
              Sign In to Your Account
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl border border-white/20 transition-all text-base backdrop-blur-sm"
            >
              Register New Account
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 bg-background">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-primary mb-3">Everything You Need</h2>
            <p className="text-muted max-w-lg mx-auto">
              A complete institutional booking system built for the unique workflows of AASTMT.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {features.map(({ icon: Icon, title, description, color }) => (
              <div
                key={title}
                className="bg-card border border-card-border rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className={`inline-flex p-3 rounded-xl border mb-4 ${color}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">{title}</h3>
                <p className="text-muted text-sm leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 px-4 bg-primary/5 border-t border-primary/10">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-primary mb-8">Built for AASTMT Operations</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {benefits.map((benefit) => (
              <div key={benefit} className="flex items-center gap-2.5 bg-card border border-card-border rounded-xl px-4 py-3 shadow-sm">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span className="text-sm font-medium text-foreground">{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 px-4 border-t border-card-border bg-card text-center">
        <p className="text-muted text-sm">
          AASTSys &mdash; Room &amp; Hall Booking System &bull; AASTMT &copy; {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
}
