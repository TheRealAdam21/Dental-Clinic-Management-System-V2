/** Tooth outline used as the clinic mark (lucide has no tooth icon). */
const ToothMark = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M8.4 3.5c1.4 0 2 .5 3.6.5s2.2-.5 3.6-.5c2.2 0 3.5 1.8 3.5 4.2 0 1.7-.6 3.1-1.1 4.6-.4 1.2-.6 2.3-.8 3.7-.2 1.4-.5 2.7-1.3 2.7-.9 0-1.1-1.4-1.4-2.8-.3-1.5-.6-2.8-2.5-2.8s-2.2 1.3-2.5 2.8c-.3 1.4-.5 2.8-1.4 2.8-.8 0-1.1-1.3-1.3-2.7-.2-1.4-.4-2.5-.8-3.7-.5-1.5-1.1-2.9-1.1-4.6 0-2.4 1.3-4.2 3.5-4.2Z" />
  </svg>
);

export default ToothMark;
