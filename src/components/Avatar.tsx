type Props = {
  username: string;
  avatarPath: string | null;
  size?: number;
  className?: string;
};

function initials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

export function Avatar({ username, avatarPath, size = 40, className = "" }: Props) {
  const sizeStyle = { width: size, height: size };
  if (avatarPath) {
    return (
      <img
        src={avatarPath}
        alt={username}
        width={size}
        height={size}
        style={sizeStyle}
        className={`rounded-full object-cover bg-line ${className}`}
      />
    );
  }
  return (
    <div
      style={sizeStyle}
      className={`rounded-full bg-line text-foreground/70 flex items-center justify-center font-medium ${className}`}
    >
      <span style={{ fontSize: size * 0.4 }}>{initials(username)}</span>
    </div>
  );
}
