"use client";

import { useState } from "react";
import { signUp } from "../../lib/auth";

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();

    const { data, error } = await signUp(email, password);

    if (error) {
      alert(error.message);
      return;
    }

    console.log(data);

    alert("🎉 Account created successfully!");
  }

  return (
    <main className="min-h-screen flex items-center justify-center">
      <form
        onSubmit={handleSignup}
        className="w-full max-w-md space-y-4 border rounded-xl p-6 shadow"
      >
        <h1 className="text-3xl font-bold text-center">
          Create Account
        </h1>

        <input
          type="text"
          placeholder="Full Name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full border rounded-lg p-3"
        />

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border rounded-lg p-3"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border rounded-lg p-3"
        />

        <button
          type="submit"
          className="w-full rounded-lg bg-black text-white py-3"
        >
          Create Account
        </button>
      </form>
    </main>
  );
}