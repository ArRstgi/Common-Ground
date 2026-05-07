import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import PollOutlinedIcon from '@mui/icons-material/PollOutlined';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import Person2OutlinedIcon from '@mui/icons-material/Person2Outlined';
import AddCircleOutlinedIcon from '@mui/icons-material/AddCircleOutlined';
import LoginOutlinedIcon from '@mui/icons-material/LoginOutlined';
import LogoutIcon from '@mui/icons-material/Logout';

import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import UserAvatar from "./UserAvatar";

const DRAWER_WIDTH = 220;

const BASE_NAV_ITEMS = [
  { id: 'dashboard',    label: 'Dashboard',     href: '/dashboard',    icon: <DashboardOutlinedIcon fontSize="small" /> },
  { id: 'my-surveys',label: 'My Surveys',    href: '/mysurveys',    icon: <PollOutlinedIcon fontSize="small" /> },
  { id: 'find-teams',   label: 'Find Teams',    href: '/teams',        icon: <GroupsOutlinedIcon fontSize="small" /> },
  { id: 'profile',      label: 'Profile',       href: '/profile',      icon: <Person2OutlinedIcon fontSize="small" /> },
  { id: 'survey-join',  label: 'Join Survey',   href: '/surveyjoin',   icon: <LoginOutlinedIcon fontSize="small" /> },
];

const CREATOR_NAV_ITEMS = [
  { id: 'create-survey', label: 'Create Survey', href: '/surveycreate', icon: <AddCircleOutlinedIcon fontSize="small" /> },
];

export const NAV_ID_BY_PATH = {};
[...BASE_NAV_ITEMS, ...CREATOR_NAV_ITEMS].forEach(item => {
  NAV_ID_BY_PATH[item.href] = item.id;
});

export function nav_id_by_path(path) {
    if (path.includes("/surveydetail")) {
        return "my-surveys";
    }
    return NAV_ID_BY_PATH[path];
}


const ROLE_LABELS = {
  survey_creator: 'Survey Creator',
  member: 'Member',
};

export default function NavigationSidebar({ activeId }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const isSurveyCreator = user?.role === 'survey_creator';
  const navItems = isSurveyCreator
    ? [...BASE_NAV_ITEMS, ...CREATOR_NAV_ITEMS]
    : BASE_NAV_ITEMS;

  const displayName = user?.full_name ?? user?.email ?? 'You';
  const roleLabel = ROLE_LABELS[user?.role] ?? 'Member';

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
          bgcolor: 'background.paper',
          borderRight: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          flexDirection: 'column',
          px: 1,
          py: 3.5,
        },
      }}
    >
      {/* Logo */}
      <Typography
        variant="overline"
        sx={{ px: 1, mb: 3, letterSpacing: '0.08em', fontWeight: 500, color: 'text.secondary' }}
      >
        Common Ground
      </Typography>

      {/* Nav items */}
      <List disablePadding sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {navItems.map(item => {
          const isActive = item.id === activeId;
          return (
            <ListItemButton
              key={item.id}
              component={Link}
              to={item.href}
              selected={isActive}
              sx={{
                borderRadius: 2,
                py: '9px',
                px: 1.5,
                '&.Mui-selected': {
                  bgcolor: 'primary.50',
                  color: 'primary.main',
                  '&:hover': { bgcolor: 'primary.50' },
                },
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 0,
                  mr: 1.25,
                  color: isActive ? 'primary.main' : 'text.secondary',
                  opacity: isActive ? 1 : 0.7,
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                slotProps={{
                  primary: {
                    fontSize: 14,
                    fontWeight: isActive ? 500 : 400,
                    color: isActive ? 'primary.main' : 'text.secondary',
                  },
                }}
              />
            </ListItemButton>
          );
        })}
      </List>

      {/* Footer */}
      <Box sx={{ mt: 'auto' }}>
        <Divider sx={{ mb: 2 }} />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, px: 1.5 }}>
          <UserAvatar userId={user?.id ?? ''} name={displayName} size={28} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" fontWeight={500} noWrap>{displayName}</Typography>
            <Typography variant="caption" color="text.disabled">{roleLabel}</Typography>
          </Box>
          <Tooltip title="Sign out">
            <IconButton size="small" onClick={handleLogout} sx={{ color: 'text.disabled', '&:hover': { color: 'text.secondary' } }}>
              <LogoutIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </Drawer>
  );
}
