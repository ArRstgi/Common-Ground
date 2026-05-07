import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import LinearProgress from '@mui/material/LinearProgress';
import UserAvatar from './UserAvatar';

export default function TeamCard({ team, isMyTeam, matchPct, onView, onRequestMerge }) {
  const members = team.team_members ?? [];
  const spotsLeft = team.max_size - members.length;

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2.25, display: 'flex', flexDirection: 'column', gap: 1.5,
        bgcolor: 'background.paper',
        opacity: isMyTeam ? 0.55 : 1,
        pointerEvents: isMyTeam ? 'none' : 'auto',
        transition: 'box-shadow 0.15s, transform 0.15s',
        '&:hover': { boxShadow: 4, transform: 'translateY(-2px)' },
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
        <Typography variant="body2" fontWeight={600}>{team.name}</Typography>
        {isMyTeam ? (
          <Chip label="Your team" size="small" color="primary" variant="outlined" sx={{ fontSize: 10, height: 20 }} />
        ) : (
          <Chip
            label={`${spotsLeft} spot${spotsLeft !== 1 ? 's' : ''}`}
            size="small"
            color={spotsLeft > 0 ? 'success' : 'warning'}
            sx={{ fontSize: 10, height: 20 }}
          />
        )}
      </Box>

      {matchPct != null && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LinearProgress variant="determinate" value={matchPct} sx={{ flex: 1, height: 4, borderRadius: 2 }} />
          <Typography variant="caption" fontFamily="monospace" color="primary" whiteSpace="nowrap">
            {matchPct}% match
          </Typography>
        </Box>
      )}

      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        {members.map((m, i) => (
          <UserAvatar
            key={m.user_id}
            userId={m.user_id}
            name={m.profiles?.full_name ?? ''}
            size={26}
            sx={{ border: '2px solid white', ml: i === 0 ? 0 : '-5px' }}
          />
        ))}
        {Array.from({ length: Math.max(0, spotsLeft) }).map((_, i) => (
          <Box
            key={i}
            sx={{
              width: 26, height: 26, borderRadius: '50%',
              border: '1.5px dashed', borderColor: 'divider',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'text.disabled', fontSize: 13,
              ml: members.length === 0 && i === 0 ? 0 : '-5px',
            }}
          >
            +
          </Box>
        ))}
        <Typography variant="caption" fontFamily="monospace" color="text.disabled" sx={{ ml: 1 }}>
          {members.length} / {team.max_size}
        </Typography>
      </Box>

      {team.description && (
        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.5, flex: 1 }}>
          {team.description}
        </Typography>
      )}

      {isMyTeam ? (
        <Button variant="outlined" size="small" disabled fullWidth sx={{ fontSize: 12, py: 0.75 }}>
          This is your team
        </Button>
      ) : (
        <Stack direction="row" spacing={1}>
          <Button variant="contained" size="small" fullWidth sx={{ fontSize: 12, py: 0.75 }} onClick={() => onRequestMerge(team.id)}>
            Request merge
          </Button>
          <Button variant="outlined" size="small" sx={{ fontSize: 12, py: 0.75, whiteSpace: 'nowrap' }} onClick={() => onView(team.id)}>
            View
          </Button>
        </Stack>
      )}
    </Paper>
  );
}
