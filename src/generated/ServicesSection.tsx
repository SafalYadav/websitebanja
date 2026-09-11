"use client";
import React from "react";
import ServicesSection from "@/components/editor/ServicesSection";
import { motion } from "framer-motion";
import { slideUp } from "@/lib/ui/motion";

export default function GeneratedServicesSection() {
  const services = [{"title":"Custom Tailored Solutions","description":"Comprehensive custom tailored solutions designed to exceed your highest expectations.","icon":"Zap"},{"title":"Professional Consultation","description":"Comprehensive professional consultation designed to exceed your highest expectations.","icon":"ShieldCheck"},{"title":"Rapid Implementation","description":"Comprehensive rapid implementation designed to exceed your highest expectations.","icon":"Star"},{"title":"24/7 Dedicated Support","description":"Comprehensive 24/7 dedicated support designed to exceed your highest expectations.","icon":"Star"}];

  return (
    <motion.div variants={slideUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
      <ServicesSection services={services} />
    </motion.div>
  );
}
