import { NavLink } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';

interface NavItemProps {
  to: string;
  icon: LucideIcon;
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
          `flex min-w-0 flex-1 basis-0 flex-col items-center gap-1 px-0.5 py-2 text-[10px] font-bold transition-all duration-200 xs:text-[11px] ${
            isActive
              ? 'text-primary-700 dark:text-sky-300'
              : 'text-neutral-400 hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-200'
          }`
        }
      >
        {({ isActive }) => (
          <>
            <span
              className={`flex h-8 w-11 max-w-full items-center justify-center rounded-2xl transition-all duration-200 xs:w-12 ${
                isActive
                  ? 'bg-gradient-to-br from-primary-700 to-sky-500 text-white shadow-[0_8px_20px_-8px_rgba(11,61,145,.8)]'
                  : ''
              }`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
            </span>
            <span className="w-full truncate px-0.5 text-center">{label}</span>
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
        `group flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-bold transition-all duration-200 ${
          isActive
            ? light
              ? 'bg-white/15 text-white shadow-[inset_0_1px_0_rgba(255,255,255,.2)] ring-1 ring-white/20'
              : 'bg-gradient-to-r from-primary-700 to-sky-600 text-white shadow-[0_10px_24px_-10px_rgba(11,61,145,.8)]'
            : light
              ? 'text-sky-100/80 hover:bg-white/10 hover:text-white'
              : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-white/5'
        }`
      }
    >
      <Icon size={18} className="shrink-0 transition-transform duration-200 group-active:scale-90" />
      {label}
    </NavLink>
  );
}
