export function StatusBadge({ status }) {
  const map = {
    published: 'bg-wp-green/10 text-wp-green',
    draft:     'bg-wp-orange/10 text-wp-orange',
    private:   'bg-wp-red/10 text-wp-red',
    trashed:   'bg-gray-200 text-gray-600',
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${map[status] || map.draft}`}>
      {status}
    </span>
  );
}

export function RoleBadge({ role }) {
  const map = {
    admin:   'bg-wp-blue/15 text-wp-blue',
    manager: 'bg-purple-100 text-purple-700',
    staff:   'bg-wp-green/15 text-wp-green',
  };
  return (
    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium capitalize ${map[role] || 'bg-gray-100 text-gray-700'}`}>
      {role}
    </span>
  );
}