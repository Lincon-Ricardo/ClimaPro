import { NavLink } from 'react-router-dom';

interface NavItemProps {
  to: string;
  icon: any;
  label: string;
  light?: boolean;
  mobile?: boolean;
}

export function NavItem({ to, icon: Icon, label, light = false, mobile = false }: NavItemProps) {
  if (mobile) {
    return (
      <NavLink
        to={to}
        end={to === '/app'}
        className={({ isActive }) =>
          `flex min-w-0 flex-1 flex-col items-center gap-1 py-1.5 text-[11px] font-medium transition ${
            isActive
              ? 'text-primary-700 dark:text-primary-300'
              : 'text-neutral-400 hover:text-neutral-600 dark:text-neutral-400 dark:hover:text-neutral-200'
          }`
        }
      >
        {({ isActive }) => (
          <>
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full transition ${
                isActive ? 'bg-primary-100 dark:bg-primary-900/50' : ''
              }`}
            >
              <Icon size={22} />
            </span>
            {label}
          </>
        )}
      </NavLink>
    );
  }

  return (
    <NavLink
      to={to}
      end={to === '/app'}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
          isActive
            ? light
              ? 'bg-white/15 text-white'
              : 'bg-primary-100 text-primary-800 dark:bg-primary-900/60 dark:text-primary-200'
            : light
              ? 'text-primary-200 hover:bg-white/10 hover:text-white'
              : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800'
        }`
      }
    >
      <Icon size={18} />
      {label}
    </NavLink>
  );
}
