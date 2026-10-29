import { Link, useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCircle2,
  ChevronRight,
  Compass,
  Film,
  Home as HomeIcon,
  LogOut,
  Moon,
  Plus,
  Radio,
  Search,
  Settings,
  ShieldAlert,
  Sparkles,
  Sun,
  Upload,
  User,
  Users,
  Video,
  X,
  Youtube,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export function Navbar({ user, onLogout }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const dropdownRef = useRef(null);

  const handleSearch = (e) => {
    e.preventDefault();
    if (search.trim()) {
      navigate(`/explore?search=${encodeURIComponent(search.trim())}`);
    }
  };

  // Dismiss dropdown on outside click or Escape key
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setProfileOpen(false);
      }
    }
    if (profileOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [profileOpen]);

  const username = user?.username || user?.name?.toLowerCase().replace(/\s+/g, '') || 'sankarakrishnan';
  const email = user?.email || 'sankarakrishnan468@gmail.com';
  const name = user?.name || 'Sankarakrishnan';
  const role = user?.role || 'Creator';

  return (
    <header className="content-header">
      {/* Search Input */}
      <form className="header-search" onSubmit={handleSearch}>
        <Search size={16} className="text-secondary shrink-0" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search videos, streams, creators..."
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="text-secondary hover:text-white"
          >
            <X size={14} />
          </button>
        )}
      </form>

      {/* Action Controls */}
      <div className="header-actions">
        <Link className="button ghost" to="/meetings" title="Start or Join Private Meeting">
          <Users size={16} />
          <span className="hidden sm:inline">New Meeting</span>
        </Link>

        <Link className="button primary" to="/live/create" title="Start Live Broadcast">
          <Radio size={16} />
          <span className="hidden sm:inline">Go Live</span>
        </Link>

        <Link className="icon-button" to="/notifications" aria-label="Notifications" title="Notifications">
          <Bell size={18} />
        </Link>

        {user ? (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="avatar-small flex items-center justify-center font-bold relative focus:outline-none focus:ring-2 focus:ring-purple-500 transition-transform"
              style={{
                width: '2.4rem',
                height: '2.4rem',
                background: 'linear-gradient(135deg, #4f46e5 0%, #9333ea 100%)',
                boxShadow: '0 2px 10px rgba(124, 58, 237, 0.4)',
                border: '1.5px solid rgba(255, 255, 255, 0.2)',
              }}
              aria-expanded={profileOpen}
              aria-haspopup="true"
              aria-label="User profile menu"
            >
              {name[0]?.toUpperCase()}
              {/* Online indicator */}
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-black rounded-full" />
            </button>

            {profileOpen && (
              <div
                className="profile-dropdown"
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 0.65rem)',
                  right: 0,
                  width: '300px',
                  backgroundColor: '#12151e',
                  borderRadius: '1rem',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.7), 0 0 20px rgba(139, 92, 246, 0.15)',
                  padding: '0.65rem 0',
                  zIndex: 100,
                  animation: 'fadeIn 0.15s ease-out',
                }}
                role="menu"
              >
                {/* User Header Section */}
                <div style={{ padding: '0.85rem 1.15rem 1rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <div
                      style={{
                        width: '2.75rem',
                        height: '2.75rem',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.15rem',
                        fontWeight: 700,
                        color: '#fff',
                        boxShadow: '0 4px 12px rgba(99, 102, 241, 0.35)',
                      }}
                    >
                      {name[0]?.toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {name}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#818cf8', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        @{username}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {email}
                      </div>
                    </div>
                  </div>
                  <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        padding: '0.2rem 0.6rem',
                        borderRadius: '9999px',
                        background: 'rgba(99, 102, 241, 0.15)',
                        color: '#a5b4fc',
                        border: '1px solid rgba(99, 102, 241, 0.3)',
                      }}
                    >
                      {role === 'admin' ? 'Administrator' : 'Verified Creator'}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                      Online
                    </span>
                  </div>
                </div>

                {/* Primary Navigation Menu */}
                <div style={{ padding: '0.4rem 0' }}>
                  <DropdownLink
                    to="/profile"
                    icon={<User size={16} />}
                    label="Profile & Channel"
                    onClick={() => setProfileOpen(false)}
                  />
                  <DropdownLink
                    to="/creator-dashboard"
                    icon={<Video size={16} />}
                    label="Creator Studio"
                    badge="Pro"
                    onClick={() => setProfileOpen(false)}
                  />
                  <DropdownLink
                    to="/live"
                    icon={<Radio size={16} />}
                    label="My Live Streams"
                    onClick={() => setProfileOpen(false)}
                  />
                  <DropdownLink
                    to="/meetings"
                    icon={<Users size={16} />}
                    label="Private Meetings"
                    onClick={() => setProfileOpen(false)}
                  />
                  <DropdownLink
                    to="/notifications"
                    icon={<Bell size={16} />}
                    label="Notifications"
                    onClick={() => setProfileOpen(false)}
                  />
                </div>

                <div style={{ height: '1px', backgroundColor: 'rgba(255, 255, 255, 0.08)', margin: '0.35rem 0' }} />

                {/* Settings & Sign Out */}
                <div style={{ padding: '0.2rem 0' }}>
                  <DropdownLink
                    to="/profile"
                    icon={<Settings size={16} />}
                    label="Settings"
                    onClick={() => setProfileOpen(false)}
                  />
                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      onLogout();
                    }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.65rem 1.15rem',
                      fontSize: '0.86rem',
                      fontWeight: 500,
                      color: '#f87171',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'background-color 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.12)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <LogOut size={16} />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <Link to="/login" className="button secondary">
            Sign In
          </Link>
        )}
      </div>
    </header>
  );
}

function DropdownLink({ to, icon, label, badge, onClick }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.6rem 1.15rem',
        fontSize: '0.86rem',
        fontWeight: 500,
        color: '#cbd5e1',
        textDecoration: 'none',
        transition: 'background-color 0.15s ease, color 0.15s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
        e.currentTarget.style.color = '#ffffff';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
        e.currentTarget.style.color = '#cbd5e1';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span style={{ color: '#818cf8', display: 'flex', alignItems: 'center' }}>{icon}</span>
        <span>{label}</span>
      </div>
      {badge && (
        <span
          style={{
            fontSize: '0.68rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            padding: '0.1rem 0.45rem',
            borderRadius: '0.25rem',
            background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
            color: '#fff',
          }}
        >
          {badge}
        </span>
      )}
    </Link>
  );
}

export function Sidebar({ collapsed, onToggle, user, onLogout }) {
  const mainLinks = [
    { to: '/', label: 'Home', icon: HomeIcon },
    { to: '/live', label: 'Live Streams', icon: Radio },
    { to: '/explore', label: 'Explore Videos', icon: Compass },
    { to: '/youtube', label: 'Explore YouTube', icon: Youtube },
    { to: '/meetings', label: 'Private Meetings', icon: Users },
  ];

  const studioLinks = [
    { to: '/live/create', label: 'Go Live', icon: Radio },
    { to: '/creator-dashboard', label: 'My Studio', icon: Video },
    { to: '/videos/history', label: 'Watch History', icon: Sparkles },
  ];

  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div className="sidebar-head">
        <Link className="brand" to="/">
          <span className="brand-mark">
            <Radio size={18} />
          </span>
          <span className="brand-title font-extrabold tracking-tight">StreamConnect</span>
        </Link>
      </div>

      {/* Quick Action Button */}
      <Link className="new-meeting" to="/meetings">
        <Plus size={18} />
        <span>New Meeting</span>
      </Link>

      {/* Navigation Sections */}
      <nav className="side-nav">
        <div className="side-label">Workspace</div>
        {mainLinks.map((item) => (
          <Link key={item.to} to={item.to} className="side-link">
            <item.icon size={18} />
            <span>{item.label}</span>
          </Link>
        ))}

        <div className="side-label">Creator Studio</div>
        {studioLinks.map((item) => (
          <Link key={item.to} to={item.to} className="side-link">
            <item.icon size={18} />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* User Card & Settings Footer */}
      <div className="sidebar-footer">
        <div className="profile-mini">
          <span className="avatar-small">
            {user?.name?.[0]?.toUpperCase() || 'S'}
          </span>
          <span className="profile-copy">
            <strong>{user?.name || 'Sankarakrishnan'}</strong>
            <small>{user?.email || 'sankarakrishnan468@gmail.com'}</small>
          </span>
        </div>

        <div className="footer-actions">
          <Link className="mini-link" to="/profile">
            <Settings size={16} />
            <span>Settings</span>
          </Link>
          {user ? (
            <button className="mini-link logout-button" onClick={onLogout}>
              <LogOut size={16} />
              <span>Sign Out</span>
            </button>
          ) : (
            <Link className="mini-link" to="/login">
              <LogOut size={16} />
              <span>Sign In</span>
            </Link>
          )}
        </div>
      </div>
    </aside>
  );
}
