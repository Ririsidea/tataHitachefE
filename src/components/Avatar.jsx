function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  const initials = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0][0];
  return initials.toUpperCase();
}

export default function Avatar({ name, imageUrl }) {
  return (
    <div className="avatar" data-tooltip={name || 'Account'}>
      {imageUrl ? <img src={imageUrl} alt={name} /> : <span>{getInitials(name)}</span>}
    </div>
  );
}
