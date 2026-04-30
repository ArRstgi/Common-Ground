import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import NavigationSidebar from '../components/NavigationSidebar';
import { getClient } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

// ── Helpers ───────────────────────────────────────────────────────────────────

function initials(name = '') {
  return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
}

// Deterministic avatar color from a user_id string
const AVATAR_COLORS = ['#60a5fa', '#f472b6', '#fb923c', '#34d399', '#a78bfa', '#facc15'];
function avatarColor(id = '') {
  const sum = [...id].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

// ── Sub-components ────────────────────────────────────────────────────────────

function MemberRow({ member, isCreator }) {
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
      <Avatar sx={{ width: 36, height: 36, fontSize: 13, fontWeight: 600, bgcolor: avatarColor(member.user_id), flexShrink: 0 }}>
        {initials(name)}
      </Avatar>
      <Box sx={{ flex: 1 }}>
        <Typography variant="body2" fontWeight={500}>{name}</Typography>
        {meta && <Typography variant="caption" color="text.disabled">{meta}</Typography>}
      </Box>
      <Chip
        label={isCreator ? 'Creator' : 'Member'}
        size="small"
        color={isCreator ? 'primary' : 'success'}
        variant="outlined"
        sx={{ fontSize: 11, fontFamily: 'monospace', height: 22 }}
      />
    </Box>
  );
}

function MergeRequestCard({ request, currentMemberCount, maxSize, onApprove, onReject }) {
  const [resolved, setResolved] = useState(null); // null | 'approved' | 'rejected'

  const requestingMembers = request.teams?.team_members ?? [];
  const requestMemberCount = requestingMembers.length || 1;
  const newTotal = currentMemberCount + requestMemberCount;
  const wouldExceed = newTotal > maxSize;

  function handleApprove() {
    onApprove(request.id);
    setResolved('approved');
  }
  function handleReject() {
    onReject(request.id);
    setResolved('rejected');
  }

  const requestingTeamName = request.teams?.name ?? 'Unknown team';
  const memberSummary = requestingMembers
    .map(m => {
      const p = m.profiles;
      return p ? `${p.full_name} (${[p.school, p.major].filter(Boolean).join(' · ')})` : 'Unknown';
    })
    .join(', ');

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 1.5, bgcolor: 'grey.50', '&:last-child': { mb: 0 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.25 }}>
        {/* Overlapping avatars */}
        <Box sx={{ display: 'flex' }}>
          {requestingMembers.slice(0, 4).map((m, i) => (
            <Avatar
              key={m.user_id}
              sx={{
                width: 30, height: 30, fontSize: 11, fontWeight: 600,
                bgcolor: avatarColor(m.user_id),
                border: '2px solid', borderColor: 'grey.50',
                ml: i === 0 ? 0 : -0.75,
              }}
            >
              {initials(m.profiles?.full_name)}
            </Avatar>
          ))}
          {/* Fallback single avatar if no members loaded */}
          {requestingMembers.length === 0 && (
            <Avatar sx={{ width: 30, height: 30, fontSize: 11, bgcolor: avatarColor(request.requesting_team_id) }}>
              {initials(requestingTeamName)}
            </Avatar>
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

// ── Data fetching ─────────────────────────────────────────────────────────────

async function fetchTeamDetail(teamId, userId) {
  const sb = getClient();

  // Team + survey id + title
  const { data: team, error: teamErr } = await sb
    .from('teams')
    .select('*, surveys(title)')
    .eq('id', teamId)
    .maybeSingle();
  if (teamErr) throw teamErr;

  // Approved members with profile
  const { data: members, error: membersErr } = await sb
    .from('team_members')
    .select('*, profiles(full_name, school, major)')
    .eq('team_id', teamId)
    .eq('status', 'approved');
  if (membersErr) throw membersErr;

  // Pending merge requests targeting this team, with requesting team's members + profiles
  const { data: mergeRequests, error: mergeErr } = await sb
    .from('merge_requests')
    .select('*, teams:requesting_team_id(name, team_members(user_id, profiles(full_name, school, major)))')
    .eq('target_team_id', teamId)
    .eq('status', 'pending');
  if (mergeErr) throw mergeErr;

  // Find the current user's team in the same survey (to use as requesting_team_id)
  let myTeamId = null;
  if (userId && team?.survey_id) {
    const { data: myMembership } = await sb
      .from('team_members')
      .select('team_id, teams!inner(survey_id, created_by)')
      .eq('user_id', userId)
      .eq('status', 'approved')
      .eq('teams.survey_id', team.survey_id)
      .maybeSingle();
    if (myMembership) {
      myTeamId = myMembership.team_id;
    }
  }

  return { team, members: members ?? [], mergeRequests: mergeRequests ?? [], myTeamId };
}

// ── Main component ────────────────────────────────────────────────────────────

export default function TeamDetail() {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [data, setData] = useState(null);       // { team, members, mergeRequests, myTeamId }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mergeError, setMergeError] = useState(null);

  // View mode: 'owner' | 'visitor' | 'pending'
  // Determined after data loads based on whether the current user created the team.
  const [viewMode, setViewMode] = useState(null);

  useEffect(() => {
    if (!teamId) return;
    setLoading(true);
    fetchTeamDetail(teamId, user?.id)
      .then(result => {
        setData(result);
        const isOwner = result.team.created_by === user?.id;
        setViewMode(isOwner ? 'owner' : 'visitor');
      })
      .catch(err => setError(err.message ?? 'Failed to load team'))
      .finally(() => setLoading(false));
  }, [teamId, user?.id]);

  // ── Loading / error states ──────────────────────────────────────────────────

  if (loading) {
    return (
      <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'grey.100' }}>
        <NavigationSidebar activeId="find-teams" />
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'grey.100' }}>
        <NavigationSidebar activeId="find-teams" />
        <Box sx={{ flex: 1, p: '32px 36px' }}>
          <Alert severity="error">{error}</Alert>
        </Box>
      </Box>
    );
  }

  // ── Derived values ──────────────────────────────────────────────────────────

  const { team, members, mergeRequests } = data;
  const spotsLeft = team.max_size - members.length;
  const capacityPct = (members.length / team.max_size) * 100;
  const isOwner = viewMode === 'owner';

  // ── Merge-request handlers ────────────────────────────────────────────────

  async function handleSendMergeRequest() {
    setMergeError(null);
    const myTeamId = data?.myTeamId;
    if (!myTeamId) {
      setMergeError('You must be on a team in this survey to send a merge request.');
      return;
    }
    try {
      await api.post(`/teams/${teamId}/merge-requests`, { requesting_team_id: myTeamId });
      setViewMode('pending');
    } catch (err) {
      setMergeError(err.message ?? 'Failed to send merge request.');
    }
  }

  function handleApproveMerge(reqId) {
    // TODO: POST /teams/merge-requests/{reqId}/approve
    setData(prev => ({
      ...prev,
      mergeRequests: prev.mergeRequests.filter(r => r.id !== reqId),
    }));
  }

  function handleRejectMerge(reqId) {
    // TODO: POST /teams/merge-requests/{reqId}/reject
    setData(prev => ({
      ...prev,
      mergeRequests: prev.mergeRequests.filter(r => r.id !== reqId),
    }));
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'grey.100' }}>
      <NavigationSidebar activeId="find-teams" />

      <Box component="main" sx={{ flex: 1, p: '32px 36px', maxWidth: 680 }}>

        {/* Back link */}
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(-1)}
          sx={{ color: 'text.disabled', fontSize: 13, mb: 2.5, p: 0, minWidth: 0, '&:hover': { bgcolor: 'transparent', color: 'text.secondary' } }}
        >
          Browse teams
        </Button>

        {/* ── Team header ───────────────────────────────────────────────────── */}
        <Paper variant="outlined" sx={{ p: 3, mb: 2, bgcolor: 'background.paper' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
            <Typography variant="h5" fontWeight={600} letterSpacing="-0.02em">
              {team.name}
            </Typography>
            <Chip
              label={`${spotsLeft} spot${spotsLeft !== 1 ? 's' : ''} left`}
              size="small"
              color={spotsLeft > 0 ? 'success' : 'warning'}
              sx={{ fontFamily: 'monospace', fontSize: 11 }}
            />
          </Box>

          {team.description && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.6 }}>
              {team.description}
            </Typography>
          )}

          <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2 }}>
            {team.surveys?.title && (
              <Chip label={team.surveys.title} size="small" sx={{ bgcolor: 'grey.100', color: 'text.secondary', fontSize: 12 }} />
            )}
            <Chip label={`Max ${team.max_size} members`} size="small" sx={{ bgcolor: 'grey.100', color: 'text.secondary', fontSize: 12 }} />
          </Stack>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <LinearProgress variant="determinate" value={capacityPct} sx={{ flex: 1, height: 6, borderRadius: 3 }} />
            <Typography variant="caption" fontFamily="monospace" color="text.disabled" whiteSpace="nowrap">
              {members.length} / {team.max_size} members
            </Typography>
          </Box>
        </Paper>

        {/* ── Action row ────────────────────────────────────────────────────── */}

        {viewMode === 'owner' && (
          <Stack direction="row" spacing={1.25} sx={{ mb: 2 }}>
            <Button variant="outlined" onClick={() => setViewMode('visitor')}>
              Preview as visitor
            </Button>
            <Button variant="outlined" color="error">
              Leave team
            </Button>
          </Stack>
        )}

        {viewMode === 'visitor' && (
          <Stack spacing={1} sx={{ mb: 2 }}>
            <Stack direction="row" spacing={1.25}>
              <Button variant="contained" onClick={handleSendMergeRequest}>
                Request to merge teams
              </Button>
            </Stack>
            {mergeError && <Alert severity="error" sx={{ fontSize: 13 }}>{mergeError}</Alert>}
          </Stack>
        )}

        {viewMode === 'pending' && (
          <Stack direction="row" spacing={1.25} sx={{ mb: 2 }}>
            <Button variant="outlined" disabled>
              ✓ Merge request sent
            </Button>
          </Stack>
        )}

        {/* ── Members ───────────────────────────────────────────────────────── */}
        <Paper variant="outlined" sx={{ p: 3, mb: 2, bgcolor: 'background.paper' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle2" fontWeight={600}>Members</Typography>
            <Typography variant="caption" fontFamily="monospace" color="text.disabled">
              {members.length} approved
            </Typography>
          </Box>
          {members.map(m => (
            <MemberRow key={m.id} member={m} isCreator={m.user_id === team.created_by} />
          ))}
        </Paper>

        {/* ── Merge requests (owner only) ───────────────────────────────────── */}
        {isOwner && (
          <Paper variant="outlined" sx={{ p: 3, bgcolor: 'background.paper' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle2" fontWeight={600}>Merge requests</Typography>
              <Typography variant="caption" fontFamily="monospace" color="text.disabled">
                {mergeRequests.length} pending
              </Typography>
            </Box>

            {mergeRequests.length === 0 ? (
              <Typography variant="body2" color="text.disabled" textAlign="center" py={2}>
                No pending merge requests
              </Typography>
            ) : (
              mergeRequests.map(req => (
                <MergeRequestCard
                  key={req.id}
                  request={req}
                  currentMemberCount={members.length}
                  maxSize={team.max_size}
                  onApprove={handleApproveMerge}
                  onReject={handleRejectMerge}
                />
              ))
            )}
          </Paper>
        )}

      </Box>
    </Box>
  );
}
