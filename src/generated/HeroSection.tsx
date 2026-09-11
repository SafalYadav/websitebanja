"use client";
import React from "react";
import HeroSection from "@/components/editor/HeroSection";
import { motion, useReducedMotion } from "framer-motion";
import { fadeIn } from "@/lib/ui/motion";

export default function GeneratedHeroSection() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      variants={shouldReduceMotion ? {} : fadeIn}
      initial="hidden"
      animate="visible"
    >
      <HeroSection
        title="HyperScale Cloud - Premium Quality & Service"
        subtitle="Experience industry-leading excellence with HyperScale Cloud. Crafted for discerning clients."
        button="Deploy in 60 Seconds"
        buttonAction={{
          type: "scroll",
          target: "contact"
        }}
      />
    </motion.div>
  );
}
