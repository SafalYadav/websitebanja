"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { signOut } from "@/lib/auth";
import { editorRoute } from "@/lib/editorRoutes";
import { createProject } from "@/lib/projects";

export default function Dashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function checkUser() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login");
      }
    }

    checkUser();
  }, [router]);

  async function handleCreateProject() {
    try {
      setLoading(true);

      const { data, error } = await createProject("My First Website");

      if (error) {
        alert(error.message);
        return;
      }

      router.push(editorRoute(data.id));
    } catch (err) {
      console.error(err);
      alert("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-7xl px-6 py-10">

        {/* Header */}

        <div className="mb-10 flex items-center justify-between">

          <div>
            <h1 className="text-4xl font-bold">
              👋 Welcome Back
            </h1>

            <p className="mt-2 text-zinc-400">
              Build AI-powered websites in minutes.
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="rounded-xl border border-red-500 px-5 py-3 text-red-400 transition hover:bg-red-600 hover:text-white"
          >
            Logout
          </button>

        </div>

        {/* Hero Card */}

        <div className="rounded-3xl border border-white/10 bg-gradient-to-r from-blue-600 via-violet-600 to-purple-600 p-10 shadow-2xl">

          <h2 className="text-4xl font-bold">
            Create your next AI website 🚀
          </h2>

          <p className="mt-3 max-w-xl text-lg text-white/80">
            Generate beautiful websites in minutes using AI.
            Fill in your business details and let WebsiteBanja do the rest.
          </p>

          <button
            onClick={handleCreateProject}
            disabled={loading}
            className="mt-8 rounded-xl bg-white px-8 py-4 text-lg font-semibold text-black transition hover:scale-105"
          >
            {loading ? "Creating..." : "✨ Create New Website"}
          </button>

        </div>

        {/* Projects */}

        <div className="mt-14">

          <div className="mb-6 flex items-center justify-between">

            <h2 className="text-3xl font-bold">
              My Projects
            </h2>

            <span className="text-zinc-500">
              Coming Soon
            </span>

          </div>

          <div className="rounded-3xl border border-dashed border-white/10 bg-zinc-900/40 p-16 text-center">

            <div className="text-7xl">
              🚀
            </div>

            <h3 className="mt-6 text-2xl font-bold">
              No websites yet
            </h3>

            <p className="mt-2 text-zinc-400">
              Create your first AI website to get started.
            </p>

            <button
              onClick={handleCreateProject}
              disabled={loading}
              className="mt-8 rounded-xl bg-gradient-to-r from-blue-600 via-violet-600 to-purple-600 px-8 py-4 font-semibold"
            >
              {loading ? "Creating..." : "Create First Website"}
            </button>

          </div>

        </div>

      </div>
    </main>
  );
}