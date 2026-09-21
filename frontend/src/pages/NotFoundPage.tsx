import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="py-24 text-center">
      <p className="text-5xl font-bold text-slate-300">404</p>
      <p className="mt-2 text-slate-600">This page does not exist.</p>
      <Link to="/" className="btn-primary mt-6 inline-flex">
        Go home
      </Link>
    </div>
  );
}
