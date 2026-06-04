export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <img src="/images/winbetlogo.png" alt="WinBet" className="h-8 w-auto" />
        <button className="rounded-lg bg-primarycolor px-4 py-1.5 text-sm font-medium text-white transition hover:brightness-90">
          Login
        </button>
      </div>
    </header>
  );
}
