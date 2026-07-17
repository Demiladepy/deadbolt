export function LockMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="10.5" width="16" height="10" rx="3" fill="#7d6cf5" />
      <path
        d="M7.5 10.5V8a4.5 4.5 0 0 1 9 0v2.5"
        stroke="#7d6cf5"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="12" cy="15.2" r="1.5" fill="#0a0a0b" />
      <rect x="11.3" y="15" width="1.4" height="3" rx="0.7" fill="#0a0a0b" />
    </svg>
  );
}
