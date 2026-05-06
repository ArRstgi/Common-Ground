import Avatar from '@mui/material/Avatar';

const AVATAR_COLORS = ['#60a5fa', '#f472b6', '#fb923c', '#34d399', '#a78bfa', '#facc15'];

export function avatarColor(id = '') {
  const sum = [...id].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

export function initials(name = '') {
  return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
}

export default function UserAvatar({ userId = '', name = '', size = 36, sx = {} }) {
  return (
    <Avatar
      sx={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        fontWeight: 600,
        bgcolor: avatarColor(userId),
        flexShrink: 0,
        ...sx,
      }}
    >
      {initials(name)}
    </Avatar>
  );
}
