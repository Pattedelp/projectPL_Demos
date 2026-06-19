import { Search, Bell } from "lucide-react";

function Topbar() {
  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900 flex items-center justify-between px-6">
      <div className="relative w-80">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
          size={18}
        />
        <input
          type="text"
          placeholder="Buscar clientes, productos..."
          className="w-full bg-slate-800 text-white text-sm rounded-lg pl-10 pr-4 py-2 outline-none focus:ring-2 focus:ring-blue-600"
        />
      </div>
      <button className="relative text-slate-400 hover:text-white transition-colors active:scale-90">
        <Bell size={20} />
        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-blue-500 rounded-full"></span>
      </button>
    </header>
  );
}

export default Topbar;
