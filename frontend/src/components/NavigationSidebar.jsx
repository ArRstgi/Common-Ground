import './styles/NavigationSidebar.css';

// ── Icons ──────────────────────────────────────────────────────────────────────

const DashboardIcon = () => (
    <svg className="nav-sidebar__icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="1" y="1" width="6" height="6" rx="1" />
        <rect x="9" y="1" width="6" height="6" rx="1" />
        <rect x="1" y="9" width="6" height="6" rx="1" />
        <rect x="9" y="9" width="6" height="6" rx="1" />
    </svg>
);

const SurveysIcon = () => (
    <svg className="nav-sidebar__icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M14 10c0 2.2-2.7 4-6 4S2 12.2 2 10c0-1.4 1-2.6 2.5-3.3" />
        <ellipse cx="8" cy="6" rx="6" ry="4" />
    </svg>
);

const FindTeamsIcon = () => (
    <svg className="nav-sidebar__icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M2 12c0-2.2 2.7-4 6-4s6 1.8 6 4" />
        <circle cx="8" cy="5" r="3" />
    </svg>
);

const ProfileIcon = () => (
    <svg className="nav-sidebar__icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="8" cy="6" r="3" />
        <path d="M2 14c0-2.8 2.7-5 6-5s6 2.2 6 5" />
    </svg>
);

// ── Nav items config ───────────────────────────────────────────────────────────

const NAV_ITEMS = [
    { id: 'dashboard',  label: 'Dashboard',   icon: <DashboardIcon />,  href: '#' },
    { id: 'surveys',    label: 'My Surveys',  icon: <SurveysIcon />,    href: '#' },
    { id: 'find-teams', label: 'Find Teams',  icon: <FindTeamsIcon />,  href: '#' },
    { id: 'profile',    label: 'Profile',     icon: <ProfileIcon />,    href: '#' },
];

// ── User config ────────────────────────────────────────────────────────────────

const USER = {
    initials: 'AB',
    name: 'Alice Chen',
    role: 'Amherst College',
};

// ── Component ──────────────────────────────────────────────────────────────────

/**
 * NavigationSidebar
 *
 * Props:
 *   activeId  {string}    – ID of the currently active nav item.
 *                           Matches one of: 'dashboard' | 'surveys' | 'find-teams' | 'profile'
 *   onNavigate {function} – Optional callback: (id, href) => void
 *                           Called when a nav item is clicked.
 *                           Use this to update activeId in the parent.
 */
export default function NavigationSidebar({ activeId, onNavigate }) {
    const handleClick = (e, item) => {
        if (onNavigate) {
            e.preventDefault();
            onNavigate(item.id, item.href);
        }
    };

    return (
        <aside className="nav-sidebar">
            <div className="nav-sidebar__logo">Common Ground</div>

            {NAV_ITEMS.map((item) => (
                <a
                    key={item.id}
                    href={item.href}
                    className={[
                        'nav-sidebar__item',
                        item.id === activeId ? 'nav-sidebar__item--active' : '',
                    ].join(' ').trim()}
                    onClick={(e) => handleClick(e, item)}
                >
                    {item.icon}
                    {item.label}
                </a>
            ))}

            <div className="nav-sidebar__footer">
                <div className="nav-sidebar__user">
                    <div className="nav-sidebar__avatar">{USER.initials}</div>
                    <div>
                        <div className="nav-sidebar__user-name">{USER.name}</div>
                        <div className="nav-sidebar__user-role">{USER.role}</div>
                    </div>
                </div>
            </div>
        </aside>
    );
}