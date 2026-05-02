import { useLocation, Link } from "react-router-dom";

export default function NotFound() {
  const location = useLocation();
  
  return (
    <div className="relative flex flex-col items-center justify-center h-screen text-center px-4 bg-[#0D0F14]">
      <h1 className="absolute bottom-0 text-9xl md:text-[12rem] font-black text-[#1E2330] select-none pointer-events-none z-0">
        404
      </h1>
      <div className="relative z-10">
        <h2 className="text-xl md:text-2xl font-semibold mt-6 text-white">Page not found</h2>
        <p className="mt-2 text-base text-secondary font-mono">{location.pathname}</p>
        <Link to="/dashboard" className="mt-6 inline-flex items-center gap-2 bg-primary hover:bg-[#059669] text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors cursor-pointer whitespace-nowrap">
          <i className="ri-arrow-left-line" /> Back to dashboard
        </Link>
      </div>
    </div>
  );
}