import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import UserAvatar from './UserAvatar';

export default function MemberRow({ member, isCreator }) {
  const name = member.profiles?.full_name ?? 'Unknown';
  const school = member.profiles?.school ?? '';
  const major = member.profiles?.major ?? '';
  const meta = [school, major].filter(Boolean).join(' · ');

  return (
    <Box
      sx={{
        display: 'flex', alignItems: 'center', gap: 1.75,
        py: 1.25,
        borderBottom: '1px solid', borderColor: 'divider',
        '&:last-child': { borderBottom: 'none', pb: 0 },
      }}
    >
      <UserAvatar userId={member.user_id} name={name} size={36} />
      <Box sx={{ flex: 1 }}>
        <Typography variant="body2" fontWeight={500}>{name}</Typography>
        {meta && <Typography variant="caption" color="text.disabled">{meta}</Typography>}
      </Box>
      <Chip
        label={isCreator ? 'Creator' : 'Member'}
        size="small"
        color={isCreator ? 'primary' : 'default'}
        variant="outlined"
        sx={{ fontSize: 11, height: 22 }}
      />
    </Box>
  );
}
