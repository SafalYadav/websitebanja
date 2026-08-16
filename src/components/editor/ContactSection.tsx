"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Phone, Mail, MapPin, Send, CheckCircle2, MessageSquare } from "lucide-react";
import EditableElement from "@/components/editor/EditableElement";
import type { Contact } from "@/types/website";

interface ContactSectionProps {
  sectionKey?: string;
  contact?: Contact | null;
}

export default function ContactSection({ sectionKey = "contact", contact }: ContactSectionProps) {
  const shouldReduceMotion = useReducedMotion();
  const [submitted, setSubmitted] = useState(false);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formMsg, setFormMsg] = useState("");

  const safeContact: Contact = {
    phone: typeof contact?.phone === "string" ? contact.phone : "",
    email: typeof contact?.email === "string" ? contact.email : "",
    address: typeof contact?.address === "string" ? contact.address : "",
  };

  const hasAnyContactDetail = Boolean(
    safeContact.phone || safeContact.email || safeContact.address
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim()) return;
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setFormName("");
      setFormEmail("");
      setFormMsg("");
    }, 4000);
  };

  return (
    <section
      id="contact"
      className="relative py-24 sm:py-32 px-6 sm:px-10 border-t overflow-hidden"
      style={{
        backgroundColor: "var(--wb-bg-alt)",
        borderColor: "var(--wb-border)",
      }}
    >
      {/* Background ambient lighting */}
      <div
        className="pointer-events-none absolute bottom-0 left-1/3 h-96 w-96 rounded-full blur-3xl opacity-20 -z-10"
        style={{ backgroundColor: "var(--wb-glow-primary)" }}
      />

      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
          {/* Left Column: Direct Contact Details */}
          <motion.div
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45 }}
            className="lg:col-span-6 space-y-6"
          >
            <div
              className="inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-xs font-bold uppercase tracking-wider border backdrop-blur-sm"
              style={{
                backgroundColor: "var(--wb-surface)",
                borderColor: "var(--wb-border)",
                color: "var(--wb-primary)",
              }}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>Let&apos;s Connect</span>
            </div>

            <h2
              className="text-3xl sm:text-5xl font-extrabold tracking-tight"
              style={{ color: "var(--wb-fg)" }}
            >
              Get in Touch With Us
            </h2>

            <p
              className="text-base sm:text-lg leading-relaxed max-w-lg"
              style={{ color: "var(--wb-muted)" }}
            >
              Have a question or ready to begin your next project? Reach out directly via phone, email, or send a message below.
            </p>

            <div className="space-y-4 pt-4">
              {safeContact.phone ? (
                <EditableElement
                  sectionKey={sectionKey}
                  elementPath={`${sectionKey}.phone`}
                  elementType="paragraph"
                  label="Contact Phone"
                >
                  <a
                    href={`tel:${safeContact.phone}`}
                    className="flex items-center gap-4 p-5 rounded-3xl border transition-all duration-200 hover:scale-[1.01] shadow-lg backdrop-blur-xl"
                    style={{
                      backgroundColor: "var(--wb-surface)",
                      borderColor: "var(--wb-border)",
                    }}
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--wb-glow-primary)] text-[var(--wb-primary)] flex-shrink-0 shadow-sm">
                      <Phone className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold block" style={{ color: "var(--wb-muted)" }}>
                        Direct Phone
                      </span>
                      <span className="text-base font-bold" style={{ color: "var(--wb-fg)" }}>
                        {safeContact.phone}
                      </span>
                    </div>
                  </a>
                </EditableElement>
              ) : null}

              {safeContact.email ? (
                <EditableElement
                  sectionKey={sectionKey}
                  elementPath={`${sectionKey}.email`}
                  elementType="paragraph"
                  label="Contact Email"
                >
                  <a
                    href={`mailto:${safeContact.email}`}
                    className="flex items-center gap-4 p-5 rounded-3xl border transition-all duration-200 hover:scale-[1.01] shadow-lg backdrop-blur-xl"
                    style={{
                      backgroundColor: "var(--wb-surface)",
                      borderColor: "var(--wb-border)",
                    }}
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--wb-glow-secondary)] text-[var(--wb-secondary)] flex-shrink-0 shadow-sm">
                      <Mail className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold block" style={{ color: "var(--wb-muted)" }}>
                        Email Inquiries
                      </span>
                      <span className="text-base font-bold" style={{ color: "var(--wb-fg)" }}>
                        {safeContact.email}
                      </span>
                    </div>
                  </a>
                </EditableElement>
              ) : null}

              {safeContact.address ? (
                <EditableElement
                  sectionKey={sectionKey}
                  elementPath={`${sectionKey}.address`}
                  elementType="paragraph"
                  label="Contact Address"
                >
                  <div
                    className="flex items-center gap-4 p-5 rounded-3xl border shadow-lg backdrop-blur-xl"
                    style={{
                      backgroundColor: "var(--wb-surface)",
                      borderColor: "var(--wb-border)",
                    }}
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--wb-glow-primary)] text-[var(--wb-primary)] flex-shrink-0 shadow-sm">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold block" style={{ color: "var(--wb-muted)" }}>
                        Location & Office
                      </span>
                      <span className="text-base font-bold" style={{ color: "var(--wb-fg)" }}>
                        {safeContact.address}
                      </span>
                    </div>
                  </div>
                </EditableElement>
              ) : null}

              {!hasAnyContactDetail && (
                <div
                  className="p-5 rounded-2xl border text-xs"
                  style={{
                    backgroundColor: "var(--wb-surface)",
                    borderColor: "var(--wb-border)",
                    color: "var(--wb-muted)",
                  }}
                >
                  Enter your direct phone, email, and office address in the inspector panel to display them here.
                </div>
              )}
            </div>
          </motion.div>

          {/* Right Column: Interactive Inquiry Form */}
          <motion.div
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: 0.1 }}
            className="lg:col-span-6"
          >
            <div
              className="rounded-3xl border p-8 sm:p-10 shadow-2xl backdrop-blur-2xl"
              style={{
                backgroundColor: "var(--wb-surface)",
                borderColor: "var(--wb-border)",
                boxShadow: "0 20px 45px -12px var(--wb-glow-primary)",
              }}
            >
              <h3 className="text-2xl font-bold mb-2 tracking-tight" style={{ color: "var(--wb-fg)" }}>
                Send a Direct Message
              </h3>
              <p className="text-sm mb-7" style={{ color: "var(--wb-muted)" }}>
                We typically respond within 24 hours.
              </p>

              {submitted ? (
                <div className="rounded-2xl p-8 text-center border border-emerald-500/30 bg-emerald-500/10 space-y-2">
                  <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto" />
                  <h4 className="text-base font-bold text-emerald-300">Message Received!</h4>
                  <p className="text-xs text-emerald-200/80">
                    Thank you for reaching out. We will get back to you shortly.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--wb-muted)" }}>
                      Your Full Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Jane Doe"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full rounded-2xl border px-4 py-3.5 text-sm outline-none transition bg-black/[0.03] dark:bg-white/[0.05] focus:border-[var(--wb-primary)]"
                      style={{
                        borderColor: "var(--wb-border)",
                        color: "var(--wb-fg)",
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--wb-muted)" }}>
                      Your Email
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="jane@example.com"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      className="w-full rounded-2xl border px-4 py-3.5 text-sm outline-none transition bg-black/[0.03] dark:bg-white/[0.05] focus:border-[var(--wb-primary)]"
                      style={{
                        borderColor: "var(--wb-border)",
                        color: "var(--wb-fg)",
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--wb-muted)" }}>
                      Your Message
                    </label>
                    <textarea
                      rows={4}
                      placeholder="How can we help your business today?"
                      value={formMsg}
                      onChange={(e) => setFormMsg(e.target.value)}
                      className="w-full rounded-2xl border px-4 py-3.5 text-sm outline-none transition bg-black/[0.03] dark:bg-white/[0.05] resize-y focus:border-[var(--wb-primary)]"
                      style={{
                        borderColor: "var(--wb-border)",
                        color: "var(--wb-fg)",
                      }}
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full inline-flex items-center justify-center gap-2 rounded-2xl py-4 px-6 text-sm font-bold text-white shadow-xl transition-all duration-200 hover:scale-[1.01] active:scale-[0.98]"
                    style={{
                      background: "var(--wb-gradient-primary)",
                      boxShadow: "0 10px 30px -6px var(--wb-glow-primary)",
                    }}
                  >
                    <Send className="h-4 w-4" />
                    <span>Submit Inquiry</span>
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}