import Link from 'next/link';

export function Brand() {
  return (
    <Link className="brand" href="/dashboard" aria-label="MiniFlow — Dashboard">
      <span className="brand-mark" aria-hidden="true">
        m
      </span>
      MiniFlow
    </Link>
  );
}
