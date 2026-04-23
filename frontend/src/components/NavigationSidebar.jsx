import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Avatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import PollOutlinedIcon from '@mui/icons-material/PollOutlined';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import Person2OutlinedIcon from '@mui/icons-material/Person2Outlined';
import CircleIcon from '@mui/icons-material/Circle';

import { Link } from "react-router-dom";

// ── Constants ──────────────────────────────────────────────────────────────────

const DRAWER_WIDTH = 220;

const NAV_ITEMS = [
    { id: 'dashboard',  label: 'Dashboard',  href: '/dashboard',  icon: <DashboardOutlinedIcon fontSize="small" /> },
    // TODO: make this go to a "My Surveys" page rather than surveydetail
    { id: 'surveys',    label: 'My Surveys', href: '/surveydetail',    icon: <PollOutlinedIcon fontSize="small" />     },
    { id: 'find-teams', label: 'Find Teams', href: '/teams',      icon: <GroupsOutlinedIcon fontSize="small" />  },
    { id: 'profile',    label: 'Profile',    href: '/profile',    icon: <Person2OutlinedIcon fontSize="small" />   },
    { id: 'create-survey',    label: 'Create Survey',    href: '/surveycreate',    icon: <CircleIcon fontSize="small" />   },
    { id: 'survey-join',    label: 'Join Survey',    href: '/surveyjoin',    icon: <CircleIcon fontSize="small" />   },
];

const USER = {
    initials: 'AC',
    name: 'Alice Chen',
    role: 'Amherst College',
};

// ── Component ──────────────────────────────────────────────────────────────────

/**
 * NavigationSidebar
 *
 * Props:
 *   activeId   {string}    – ID of the currently active nav item.
 *                            One of: 'dashboard' | 'surveys' | 'find-teams' | 'profile'
 *   onNavigate {function}  – Optional callback: (id) => void
 *                            Called when a nav item is clicked.
 *                            Use this to update activeId in the parent.
 */
export default function NavigationSidebar({ activeId }) {
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
                sx={{
                    px: 1,
                    mb: 3,
                    letterSpacing: '0.08em',
                    fontWeight: 500,
                    color: 'text.secondary',
                }}
            >
                Common Ground
            </Typography>

            {/* Nav items */}
            <List disablePadding sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                {NAV_ITEMS.map((item) => {
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
                    <Avatar
                        sx={{
                            width: 28,
                            height: 28,
                            fontSize: 11,
                            fontWeight: 600,
                            bgcolor: 'primary.main',
                        }}
                    >
                        {USER.initials}
                    </Avatar>
                    <Box>
                        <Typography variant="body2" fontWeight={500}>
                            {USER.name}
                        </Typography>
                        <Typography variant="caption" color="text.disabled">
                            {USER.role}
                        </Typography>
                    </Box>
                </Box>
            </Box>
        </Drawer>
    );
}