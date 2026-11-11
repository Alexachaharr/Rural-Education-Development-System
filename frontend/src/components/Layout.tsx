import { NavLink, Outlet, useNavigate } from 'react-router';
import { Award, BookOpen, CalendarCheck, ClipboardList, Home, LogOut, UserRound } from 'lucide-react';
import { useUser, useAuth } from '../lib/auth';
import { initials } from '../lib/format';

export function BrandMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 64 64" aria-hidden>
      <rect x="10" y="6" width="44" height="52" rx="8" fill="#E4DBFB" />
      <rect x="10" y="6" width="8" height="52" rx="4" fill="#2B2D5C" />
      <rect x="24" y="18" width="24" height="12" rx="3" fill="#fff" />
      <path d="M27 24h18" stroke="#2B2D5C" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="44" cy="46" r="7" fill="#FFF0B5" />
    </svg>
  );
}

export function Layout() {
  const user = useUser();
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const nav = [
    { to: '/', label: 'Home', icon: Home, end: true },
    { to: '/courses', label: user.role === 'teacher' ? 'Content' : 'Courses', icon: BookOpen },
    { to: '/quizzes', label: 'Quizzes', icon: ClipboardList },
    { to: '/attendance', label: 'Attendance', icon: CalendarCheck },
    { to: '/opportunities', label: 'Scholarships', icon: Award },
  ];

  const logout = () => {
    signOut();
    navigate('/auth');
  };

  const roleLine =
    user.role === 'student'
      ? `Class ${user.class_grade ?? '?'}${user.roll_number ? `, roll ${user.roll_number}` : ''}`
      : user.role === 'teacher'
        ? 'Teacher'
        : 'Parent';

  return (
    <div className="shell">
      <aside className="sidebar">
        <NavLink to="/" className="brand">
          <BrandMark />
          <div>
            <div className="brand-name">Vidya Setu</div>
            <div className="brand-sub">Learning for every village</div>
          </div>
        </NavLink>
        <nav className="nav" aria-label="Main">
          {nav.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end}>
              <n.icon size={20} strokeWidth={2} />
              {n.label}
            </NavLink>
          ))}
          <NavLink to="/profile">
            <UserRound size={20} strokeWidth={2} />
            Profile
          </NavLink>
        </nav>
        <div className="sidebar-foot">
          <div className="avatar">{initials(user.name)}</div>
          <div className="who">
            <strong>{user.name}</strong>
            <span className="faint small">{roleLine}</span>
          </div>
          <button className="icon-btn" onClick={logout} aria-label="Sign out" title="Sign out">
            <LogOut size={17} />
          </button>
        </div>
      </aside>

      <div>
        <header className="mobile-top">
          <NavLink to="/" className="brand">
            <BrandMark />
            <div className="brand-name">Vidya Setu</div>
          </NavLink>
          <div className="row">
            <NavLink to="/profile" className="avatar" aria-label="Profile" style={{ textDecoration: 'none' }}>
              {initials(user.name)}
            </NavLink>
            <button className="icon-btn" onClick={logout} aria-label="Sign out">
              <LogOut size={17} />
            </button>
          </div>
        </header>

        <main className="main">
          <Outlet />
        </main>
      </div>

      <nav className="tabbar" aria-label="Main">
        {nav.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end}>
            <n.icon size={20} />
            {n.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
