export default function StatusBadge({ status }: { status: string }) {
  const classes: Record<string, string> = {
    REQUESTED: 'bg-blue-100 text-blue-800',
    QUOTED: 'bg-indigo-100 text-indigo-800',
    ACCEPTED: 'bg-cyan-100 text-cyan-800',
    IN_PROGRESS: 'bg-amber-100 text-amber-800',
    COMPLETED: 'bg-green-100 text-green-800',
    PAID: 'bg-emerald-100 text-emerald-800',
    REVIEWED: 'bg-teal-100 text-teal-800',
    CANCELLED: 'bg-gray-200 text-gray-600',
    DISPUTED: 'bg-red-100 text-red-800',
    PENDING: 'bg-yellow-100 text-yellow-800',
    ESCROW: 'bg-blue-100 text-blue-800',
    RELEASED: 'bg-green-100 text-green-800',
    REFUNDED: 'bg-orange-100 text-orange-800',
    OPEN: 'bg-red-100 text-red-800',
    IN_PROGRESS_STATUS: 'bg-yellow-100 text-yellow-800',
    RESOLVED: 'bg-green-100 text-green-800',
    UNVERIFIED: 'bg-gray-100 text-gray-600',
    PENDING_VERIFICATION: 'bg-yellow-100 text-yellow-800',
    VERIFIED: 'bg-green-100 text-green-800',
    REJECTED: 'bg-red-100 text-red-800',
  };

  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${classes[status] || 'bg-gray-100 text-gray-700'}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}
