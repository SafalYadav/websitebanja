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
        title="Prime Gym - Premium Quality & Service"
        subtitle="Experience industry-leading excellence with Prime Gym. Crafted for discerning clients."
        button="Get Started"
        buttonAction={{
          type: "scroll",
          target: "contact"
        }}
      />
    </motion.div>
  );
}
