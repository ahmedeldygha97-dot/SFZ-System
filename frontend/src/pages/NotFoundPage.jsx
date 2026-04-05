import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-sand px-4">
      <div className="page-card max-w-xl text-center">
        <p className="text-sm font-bold uppercase tracking-[0.22em] text-brand-600">404</p>
        <h1 className="mt-4 text-4xl font-black text-ink-900">Page not found</h1>
        <p className="mt-4 text-sm text-slate-500">The page you requested does not exist or is not available in this workspace.</p>
        <Link to="/" className="primary-btn mt-6">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
