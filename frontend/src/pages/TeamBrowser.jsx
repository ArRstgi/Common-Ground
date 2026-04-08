import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import AvatarGroup from '@mui/material/AvatarGroup';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import LinearProgress from '@mui/material/LinearProgress';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import SearchIcon from '@mui/icons-material/Search';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import NavigationSidebar from '../components/NavigationSidebar';
import { getClient } from '../lib/supabase';

// ── Helpers ───────────────────────────────────────────────────────────────────

function initials(name = '') {
  return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
}

const AVATAR_COLORS = ['#60a5fa', '#f472b6', '#fb923c', '#34d399', '#a78bfa', '#facc15'];
function avatarColor(id = '') {
  const sum = [...id].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

function daysLeft(deadline) {
  if (!deadline) return null;
  const diff = Math.ceil((new Date(deadline) - Date.now()) / 86_400_000);
  if (diff <= 0) return 'Deadline passed';
  return `${diff} day${diff !== 1 ? 's' : ''} left`;
}

// ── Data fetching ─────────────────────────────────────────────────────────────

async function fetchBrowserData() {
  const sb = getClient();

  // Use the most recent survey
  const { data: survey, error: sErr } = await sb
    .from('surveys')
    .select('id, title, deadline')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (sErr) throw sErr;
  if (!survey) throw new Error('No surveys found. Make sure the seed script has been run and RLS allows reads.');

  // All non-merged teams for this survey with approved members + profiles
  const { data: teams, error: tErr } = await sb
    .from('teams')
    .select('id, name, description, max_size, created_by, team_members(user_id, status, profiles(full_name))')
    .eq('survey_id', survey.id)
    .is('merged_into', null);
  if (tErr) throw tErr;

  // Filter to approved members only
  const normalised = (teams ?? []).map(t => ({
    ...t,
    team_members: (t.team_members ?? []).filter(m => m.status === 'approved'),
  }));

  return { survey, teams: normalised };
}

// ── Team card ─────────────────────────────────────────────────────────────────

function TeamCard({ team, isMyTeam, matchPct, onView, onRequestMerge }) {
  const members   = team.team_members ?? [];
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
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
        <Typography variant="body2" fontWeight={600}>{team.name}</Typography>
        {isMyTeam ? (
          <Chip label="Your team" size="small" color="primary" variant="outlined" sx={{ fontSize: 10, fontFamily: 'monospace', height: 20 }} />
        ) : (
          <Chip
            label={`${spotsLeft} spot${spotsLeft !== 1 ? 's' : ''}`}
            size="small"
            color={spotsLeft > 0 ? 'success' : 'warning'}
            sx={{ fontSize: 10, fontFamily: 'monospace', height: 20 }}
          />
        )}
      </Box>

      {/* Match bar (recommended tab only) */}
      {matchPct != null && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LinearProgress variant="determinate" value={matchPct} sx={{ flex: 1, height: 4, borderRadius: 2 }} />
          <Typography variant="caption" fontFamily="monospace" color="primary" whiteSpace="nowrap">
            {matchPct}% match
          </Typography>
        </Box>
      )}

      {/* Avatars + empty slots */}
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        {members.map((m, i) => (
          <Avatar
            key={m.user_id}
            sx={{ width: 26, height: 26, fontSize: 10, fontWeight: 600, bgcolor: avatarColor(m.user_id), border: '2px solid white', ml: i === 0 ? 0 : '-5px' }}
          >
            {initials(m.profiles?.full_name)}
          </Avatar>
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

      {/* Description */}
      {team.description && (
        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.5, flex: 1 }}>
          {team.description}
        </Typography>
      )}

      {/* Actions */}
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

// ── Main component ────────────────────────────────────────────────────────────

// For demo: treat the first team as "my team" (no real auth in demo mode)
const DEMO_MY_TEAM_INDEX = 0;

// Mock match scores for Recommended tab (real algorithm is Contributor N's work)
const MOCK_MATCH_SCORES = [91, 74, 58, 45];

export default function TeamBrowser() {
  const navigate = useNavigate();

  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [tab, setTab]           = useState('all');
  const [search, setSearch]     = useState('');
  const [openOnly, setOpenOnly] = useState(false);

  useEffect(() => {
    fetchBrowserData()
      .then(setData)
      .catch(err => setError(err.message ?? 'Failed to load teams'))
      .finally(() => setLoading(false));
  }, []);

  const myTeam = data?.teams[DEMO_MY_TEAM_INDEX] ?? null;

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.teams.filter(t => {
      const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase());
      const matchesOpen   = !openOnly || (t.max_size - t.team_members.length) > 0;
      return matchesSearch && matchesOpen;
    });
  }, [data, search, openOnly]);

  const recommended = useMemo(() => {
    if (!data) return [];
    return data.teams
      .filter((_, i) => i !== DEMO_MY_TEAM_INDEX)
      .map((t, i) => ({ ...t, matchPct: MOCK_MATCH_SCORES[i] ?? 40 }))
      .sort((a, b) => b.matchPct - a.matchPct);
  }, [data]);

  function handleView(teamId) {
    navigate(`/teams/${teamId}`);
  }

  // Navigate to team detail — visitor view lets them send the merge request
  function handleRequestMerge(teamId) {
    navigate(`/teams/${teamId}`);
  }

  // ── Loading / error ─────────────────────────────────────────────────────────

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

  const { survey } = data;
  const deadline   = daysLeft(survey.deadline);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'grey.100' }}>
      <NavigationSidebar activeId="find-teams" />

      <Box component="main" sx={{ flex: 1, p: '32px 36px', overflowY: 'auto' }}>

        {/* Page header */}
        <Box sx={{ mb: 2.5 }}>
          <Typography variant="h5" fontWeight={600} letterSpacing="-0.02em">Find a team</Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            Request to merge your team with another
          </Typography>
        </Box>

        {/* Survey context pill */}
        <Box
          sx={{
            display: 'inline-flex', alignItems: 'center', gap: 1,
            bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider',
            borderRadius: '100px', px: 1.75, py: 0.75, mb: 2.5,
          }}
        >
          <FiberManualRecordIcon sx={{ fontSize: 9, color: 'success.main' }} />
          <Typography variant="caption" color="text.secondary">
            Viewing: <strong style={{ color: 'inherit' }}>{survey.title}</strong>
            {deadline && <>&nbsp;·&nbsp;{deadline}</>}
          </Typography>
        </Box>

        {/* My team banner */}
        {myTeam && (
          <Paper
            variant="outlined"
            sx={{ p: '16px 20px', mb: 2.5, bgcolor: 'primary.50', borderColor: '#c7d4f8', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <AvatarGroup max={4} sx={{ '& .MuiAvatar-root': { width: 28, height: 28, fontSize: 10, fontWeight: 600, borderColor: 'primary.50' } }}>
                {(myTeam.team_members ?? []).map(m => (
                  <Avatar key={m.user_id} sx={{ bgcolor: avatarColor(m.user_id) }}>
                    {initials(m.profiles?.full_name)}
                  </Avatar>
                ))}
              </AvatarGroup>
              <Box>
                <Typography variant="body2" fontWeight={600} color="primary.main">
                  {myTeam.name} · {myTeam.team_members.length} member{myTeam.team_members.length !== 1 ? 's' : ''}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {myTeam.max_size - myTeam.team_members.length} spot{myTeam.max_size - myTeam.team_members.length !== 1 ? 's' : ''} remaining
                </Typography>
              </Box>
            </Box>
            <Button variant="outlined" size="small" sx={{ fontSize: 12, whiteSpace: 'nowrap' }} onClick={() => handleView(myTeam.id)}>
              View my team
            </Button>
          </Paper>
        )}

        {/* Tab switcher */}
        <Box sx={{ display: 'flex', gap: '2px', bgcolor: 'grey.200', borderRadius: 1.5, p: '3px', width: 'fit-content', mb: 2.5 }}>
          {[{ id: 'all', label: 'All teams' }, { id: 'recommended', label: 'Recommended' }].map(t => (
            <Box
              key={t.id}
              component="button"
              onClick={() => setTab(t.id)}
              sx={{
                px: 2, py: 0.875, borderRadius: 1.25, border: 'none', cursor: 'pointer',
                fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 500,
                bgcolor: tab === t.id ? 'background.paper' : 'transparent',
                color: tab === t.id ? 'text.primary' : 'text.secondary',
                boxShadow: tab === t.id ? 1 : 'none',
                transition: 'all 0.15s',
              }}
            >
              {t.label}
            </Box>
          ))}
        </Box>

        {/* ── All teams ─────────────────────────────────────────────────────── */}
        {tab === 'all' && (
          <>
            <Box sx={{ display: 'flex', gap: 1.25, mb: 3, alignItems: 'center', flexWrap: 'wrap' }}>
              <TextField
                size="small"
                placeholder="Search teams…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                sx={{ flex: 1, minWidth: 200, maxWidth: 340 }}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" sx={{ color: 'text.disabled' }} />
                      </InputAdornment>
                    ),
                  },
                }}
              />
              <FormControlLabel
                control={<Checkbox size="small" checked={openOnly} onChange={e => setOpenOnly(e.target.checked)} />}
                label={<Typography variant="body2" color="text.secondary">Open spots only</Typography>}
                sx={{
                  m: 0, border: '1px solid', borderColor: openOnly ? 'primary.main' : 'divider',
                  borderRadius: 1, px: 1.5, py: 0.5,
                  bgcolor: openOnly ? 'primary.50' : 'background.paper',
                }}
              />
              <Typography variant="caption" fontFamily="monospace" color="text.disabled" sx={{ ml: 'auto' }}>
                {filtered.length} team{filtered.length !== 1 ? 's' : ''}
              </Typography>
            </Box>

            {filtered.length === 0 ? (
              <Typography variant="body2" color="text.disabled" textAlign="center" mt={6}>
                No teams match your filters.
              </Typography>
            ) : (
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 1.75 }}>
                {filtered.map(team => (
                  <TeamCard
                    key={team.id}
                    team={team}
                    isMyTeam={team.id === myTeam?.id}
                    onView={handleView}
                    onRequestMerge={handleRequestMerge}
                  />
                ))}
              </Box>
            )}
          </>
        )}

        {/* ── Recommended ───────────────────────────────────────────────────── */}
        {tab === 'recommended' && (
          <>
            <Typography variant="body2" color="text.secondary" mb={2.5}>
              Ranked by how well their survey responses match yours.
            </Typography>
            {recommended.length === 0 ? (
              <Typography variant="body2" color="text.disabled" textAlign="center" mt={6}>
                No other teams found.
              </Typography>
            ) : (
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 1.75 }}>
                {recommended.map((team, i) => (
                  <Box key={team.id} sx={{ position: 'relative' }}>
                    {i === 0 && (
                      <Box sx={{ position: 'absolute', top: -10, right: 12, zIndex: 1, bgcolor: 'primary.main', color: 'white', fontSize: 10, fontFamily: 'monospace', px: 1, py: '2px', borderRadius: '100px' }}>
                        Top match
                      </Box>
                    )}
                    <TeamCard
                      team={team}
                      isMyTeam={false}
                      matchPct={team.matchPct}
                      onView={handleView}
                      onRequestMerge={handleRequestMerge}
                    />
                  </Box>
                ))}
              </Box>
            )}
          </>
        )}

      </Box>
    </Box>
  );
}
