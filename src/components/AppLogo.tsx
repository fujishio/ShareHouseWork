export default function AppLogo() {
  return (
    <div className="text-center mb-8">
      <div className="inline-flex items-center gap-2.5 mb-2">
        <div className="w-10 h-10 bg-stone-800 rounded-xl flex items-center justify-center shadow-sm">
          <span className="text-amber-400 text-base font-bold">S</span>
        </div>
        <h1 className="text-2xl font-bold text-stone-800 tracking-tight">
          Share<span className="text-amber-600">House</span>
        </h1>
      </div>
      <p className="text-sm text-stone-500">シェアハウス生活管理</p>
    </div>
  );
}
