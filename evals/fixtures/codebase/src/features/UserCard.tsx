import { Avatar } from './Avatar';

export interface UserCardProps {
  user: User;
  variant?: 'wide' | 'compact' | 'row';
  showEmail?: boolean;
  canSuspend?: boolean;
}

/** Shared user identity card. */
export function UserCard({ user, variant = 'compact', showEmail, canSuspend }: UserCardProps) {
  return (
    <article className={`user-card user-card--${variant}`}>
      <Avatar user={user} size={variant === 'row' ? 32 : 64} />
      <div>
        <strong>{user.name}</strong>
        {showEmail && <span>{user.email}</span>}
      </div>
      {canSuspend && <button data-test="suspend-user">Suspend</button>}
    </article>
  );
}
