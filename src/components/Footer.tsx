"use client";

import { motion } from "framer-motion";
import {
  FaGithub,
  FaLinkedin,
  FaInstagram,
  FaXTwitter,
} from "react-icons/fa6";

export default function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-white/10 bg-black">

      <div className="absolute left-1/2 top-0 h-[350px] w-[350px] -translate-x-1/2 rounded-full bg-violet-600/10 blur-[120px]" />

      <div className="relative mx-auto max-w-7xl px-6 py-20">

        <div className="grid gap-14 md:grid-cols-2 lg:grid-cols-5">

          {/* Logo */}

          <div className="lg:col-span-2">

            <h2 className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-4xl font-black text-transparent">

              WebsiteBanja

            </h2>

            <p className="mt-6 max-w-md leading-8 text-zinc-400">

              Build beautiful business websites using AI.
              From idea to live website within minutes.

            </p>

            <div className="mt-8 flex gap-4">

             {[
  FaGithub,
  FaXTwitter,
  FaLinkedin,
  FaInstagram,
].map(
                (Icon, index) => (
                  <motion.div
                    key={index}
                    whileHover={{
                      y: -5,
                      scale: 1.1,
                    }}
                    className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-300 transition hover:bg-violet-600 hover:text-white"
                  >
                    <Icon size={20} />
                  </motion.div>
                )
              )}

            </div>

          </div>

          {/* Product */}

          <div>

            <h3 className="text-lg font-bold text-white">
              Product
            </h3>

            <div className="mt-6 space-y-4 text-zinc-400">

              <p>Features</p>

              <p>Templates</p>

              <p>Pricing</p>

              <p>FAQ</p>

            </div>

          </div>

          {/* Company */}

          <div>

            <h3 className="text-lg font-bold text-white">
              Company
            </h3>

            <div className="mt-6 space-y-4 text-zinc-400">

              <p>About</p>

              <p>Blog</p>

              <p>Careers</p>

              <p>Contact</p>

            </div>

          </div>

          {/* Resources */}

          <div>

            <h3 className="text-lg font-bold text-white">
              Resources
            </h3>

            <div className="mt-6 space-y-4 text-zinc-400">

              <p>Documentation</p>

              <p>Privacy</p>

              <p>Terms</p>

              <p>Support</p>

            </div>

          </div>

        </div>

        <div className="mt-20 border-t border-white/10 pt-8">
                  <div className="flex flex-col items-center justify-between gap-6 md:flex-row">

            <p className="text-sm text-zinc-500">
              © 2026 WebsiteBanja. All rights reserved.
            </p>

            <div className="flex items-center gap-6 text-sm text-zinc-500">

              <p className="cursor-pointer transition hover:text-white">
                Privacy Policy
              </p>

              <p className="cursor-pointer transition hover:text-white">
                Terms of Service
              </p>

              <p className="cursor-pointer transition hover:text-white">
                Cookies
              </p>

            </div>

          </div>

        </div>

      </div>

    </footer>
  );
}