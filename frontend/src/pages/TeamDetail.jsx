import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { getClient } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import MemberRow from '../components/MemberRow';
import MergeRequestCard from '../components/MergeRequestCard';
import PageShell from '../components/PageShell';

// ── Data fetching ─────────────────────────────────────────────────────────────

async function fetchTeamDetail(teamId, userId) {
  const sb = getClient();

  const { data: team, error: teamErr } = await sb
    .from('teams')
    .select('*, surveys(title)')
    .eq('id', teamId)
    .maybeSingle();
  if (teamErr) throw teamErr;

  const { data: members, error: membersErr } = await sb
    .from('team_members')
    .select('*, profiles(full_name, school, major)')
    .eq('team_id', teamId)
    .eq('status', 'approved');
  if (membersErr) throw membersErr;

  const { data: mergeRequests, error: mergeErr } = await sb
    .from('merge_requests')
    .select('*, teams:requesting_team_id(name, team_members(user_id, profiles(full_name, school, major)))')
    .eq('target_team_id', teamId)
    .eq('status', 'pending');
  if (mergeErr) throw mergeErr;

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

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mergeError, setMergeError] = useState(null);
  const [viewMode, setViewMode] = useState(null); // 'owner' | 'visitor' | 'pending'

  useEffect(() => {
    if (!teamId) return;
    setLoading(true);
    fetchTeamDetail(teamId, user?.id)
      .then(result => {
        setData(result);
        setViewMode(result.team.created_by === user?.id ? 'owner' : 'visitor');
      })
      .catch(err => setError(err.message ?? 'Failed to load team'))
      .finally(() => setLoading(false));
  }, [teamId, user?.id]);

  async function handleSendMergeRequest() {
    setMergeError(null);
    if (!data?.myTeamId) {
      setMergeError('You must be on a team in this survey to send a merge request.');
      return;
    }
    try {
      await api.post(`/teams/${teamId}/merge-requests`, { requesting_team_id: data.myTeamId });
      setViewMode('pending');
    } catch (err) {
      setMergeError(err.message ?? 'Failed to send merge request.');
    }
  }

  async function handleApproveMerge(reqId) {
    try {
      await api.post(`/teams/${teamId}/merge-requests/${reqId}/approve`);
      setData(prev => ({ ...prev, mergeRequests: prev.mergeRequests.filter(r => r.id !== reqId) }));
    } catch (err) {
      setMergeError(err.message ?? 'Failed to approve merge request.');
    }
  }

  async function handleRejectMerge(reqId) {
    try {
      await api.post(`/teams/${teamId}/merge-requests/${reqId}/reject`);
      setData(prev => ({ ...prev, mergeRequests: prev.mergeRequests.filter(r => r.id !== reqId) }));
    } catch (err) {
      setMergeError(err.message ?? 'Failed to reject merge request.');
    }
  }

  return (
    <PageShell loading={loading} error={error}>
      <Box sx={{ flex: 1, p: '32px 36px', bgcolor: 'grey.100', minHeight: '100vh' }}>
        <Box component="main" sx={{ maxWidth: 680 }}>

          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(-1)}
            sx={{ color: 'text.disabled', fontSize: 13, mb: 2.5, p: 0, minWidth: 0, '&:hover': { bgcolor: 'transparent', color: 'text.secondary' } }}
          >
            Browse teams
          </Button>

          {/* Team header */}
          <Paper variant="outlined" sx={{ p: 3, mb: 2, bgcolor: 'background.paper' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
              <Typography variant="h5" fontWeight={600} letterSpacing="-0.02em">
                {data?.team.name}
              </Typography>
              {data && (
                <Chip
                  label={`${data.team.max_size - data.members.length} spot${data.team.max_size - data.members.length !== 1 ? 's' : ''} left`}
                  size="small"
                  color={(data.team.max_size - data.members.length) > 0 ? 'success' : 'warning'}
                  sx={{ fontFamily: 'monospace', fontSize: 11 }}
                />
              )}
            </Box>

            {data?.team.description && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.6 }}>
                {data.team.description}
              </Typography>
            )}

            {data && (
              <>
                <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2 }}>
                  {data.team.surveys?.title && (
                    <Chip label={data.team.surveys.title} size="small" sx={{ bgcolor: 'grey.100', color: 'text.secondary', fontSize: 12 }} />
                  )}
                  <Chip label={`Max ${data.team.max_size} members`} size="small" sx={{ bgcolor: 'grey.100', color: 'text.secondary', fontSize: 12 }} />
                </Stack>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <LinearProgress
                    variant="determinate"
                    value={(data.members.length / data.team.max_size) * 100}
                    sx={{ flex: 1, height: 6, borderRadius: 3 }}
                  />
                  <Typography variant="caption" fontFamily="monospace" color="text.disabled" whiteSpace="nowrap">
                    {data.members.length} / {data.team.max_size} members
                  </Typography>
                </Box>
              </>
            )}
          </Paper>

          {/* Action row */}
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

          {/* Members */}
          <Paper variant="outlined" sx={{ p: 3, mb: 2, bgcolor: 'background.paper' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle2" fontWeight={600}>Members</Typography>
              <Typography variant="caption" fontFamily="monospace" color="text.disabled">
                {data?.members.length ?? 0} approved
              </Typography>
            </Box>
            {data?.members.map(m => (
              <MemberRow key={m.id} member={m} isCreator={m.user_id === data.team.created_by} />
            ))}
          </Paper>

          {/* Merge requests (owner only) */}
          {viewMode === 'owner' && data && (
            <Paper variant="outlined" sx={{ p: 3, bgcolor: 'background.paper' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle2" fontWeight={600}>Merge requests</Typography>
                <Typography variant="caption" fontFamily="monospace" color="text.disabled">
                  {data.mergeRequests.length} pending
                </Typography>
              </Box>

              {mergeError && <Alert severity="error" sx={{ fontSize: 13, mb: 1.5 }}>{mergeError}</Alert>}

              {data.mergeRequests.length === 0 ? (
                <Typography variant="body2" color="text.disabled" textAlign="center" py={2}>
                  No pending merge requests
                </Typography>
              ) : (
                data.mergeRequests.map(req => (
                  <MergeRequestCard
                    key={req.id}
                    request={req}
                    currentMemberCount={data.members.length}
                    maxSize={data.team.max_size}
                    onApprove={handleApproveMerge}
                    onReject={handleRejectMerge}
                  />
                ))
              )}
            </Paper>
          )}

        </Box>
      </Box>
    </PageShell>
  );
}
