export default function EditorSidebar() {
  return (
    <aside className="fixed left-0 top-0 flex h-screen w-72 flex-col border-r border-white/10 bg-zinc-950 p-8">

      <h1 className="text-3xl font-bold text-white">
        WebsiteBanja
      </h1>

      <div className="mt-12 space-y-5 text-zinc-400">

        <button>🏠 Hero</button>

        <button>📄 About</button>

        <button>🛠 Services</button>

        <button>⭐ FAQ</button>

        <button>☎ Contact</button>

      </div>

    </aside>
  );
}