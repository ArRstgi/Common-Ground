import { useState } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import UserAvatar from './UserAvatar';
import { initials } from './UserAvatar';

export default function MergeRequestCard({ request, currentMemberCount, maxSize, onApprove, onReject }) {
  const [resolved, setResolved] = useState(null);

  const requestingMembers = request.teams?.team_members ?? [];
  const requestMemberCount = requestingMembers.length || 1;
  const newTotal = currentMemberCount + requestMemberCount;
  const wouldExceed = newTotal > maxSize;
  const requestingTeamName = request.teams?.name ?? 'Unknown team';
  const memberSummary = requestingMembers
    .map(m => {
      const p = m.profiles;
      return p ? `${p.full_name} (${[p.school, p.major].filter(Boolean).join(' · ')})` : 'Unknown';
    })
    .join(', ');

  function handleApprove() {
    onApprove(request.id);
    setResolved('approved');
  }
  function handleReject() {
    onReject(request.id);
    setResolved('rejected');
  }

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 1.5, bgcolor: 'grey.50', '&:last-child': { mb: 0 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.25 }}>
        <Box sx={{ display: 'flex' }}>
          {requestingMembers.slice(0, 4).map((m, i) => (
            <UserAvatar
              key={m.user_id}
              userId={m.user_id}
              name={m.profiles?.full_name ?? ''}
              size={30}
              sx={{ border: '2px solid', borderColor: 'grey.50', ml: i === 0 ? 0 : -0.75 }}
            />
          ))}
          {requestingMembers.length === 0 && (
            <UserAvatar userId={request.requesting_team_id} name={requestingTeamName} size={30} />
          )}
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography variant="body2" fontWeight={500}>
            {requestingTeamName} wants to merge with yours
          </Typography>
          <Typography variant="caption" color="text.disabled">
            {requestMemberCount} member{requestMemberCount !== 1 ? 's' : ''}
            {memberSummary ? ` · ${memberSummary}` : ''}
          </Typography>
        </Box>
      </Box>

      {resolved === null && (
        <>
          <Paper variant="outlined" sx={{ p: 1.25, mb: 1.5, bgcolor: 'background.paper' }}>
            <Typography variant="caption" color="text.secondary">
              {wouldExceed ? (
                <>Cannot approve — would bring team to <strong>{newTotal}</strong> members, exceeding the max of <strong>{maxSize}</strong>.</>
              ) : (
                <>Approving will bring your team to <strong>{newTotal} members</strong> — {maxSize - newTotal} spot{maxSize - newTotal !== 1 ? 's' : ''} remaining.</>
              )}
            </Typography>
          </Paper>
          <Stack direction="row" spacing={1}>
            <Button size="small" variant="outlined" color="success" disabled={wouldExceed} onClick={handleApprove} sx={{ fontSize: 13 }}>
              Approve merge
            </Button>
            <Button size="small" variant="outlined" color="error" onClick={handleReject} sx={{ fontSize: 13 }}>
              Reject
            </Button>
          </Stack>
        </>
      )}

      {resolved === 'approved' && (
        <Chip label="Approved — team merged" color="success" size="small" sx={{ fontSize: 12 }} />
      )}
      {resolved === 'rejected' && (
        <Typography variant="caption" color="text.disabled">Request rejected</Typography>
      )}
    </Paper>
  );
}
