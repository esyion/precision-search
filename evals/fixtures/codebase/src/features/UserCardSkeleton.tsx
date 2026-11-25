import { Avatar } from './Avatar';

/** Placeholder shown while a user profile is loading. */
export function UserCardSkeleton({ variant = 'compact' }: { variant?: string }) {
  return (
    <article className={`user-card user-card--${variant} user-card--skeleton`} aria-hidden>
      <Avatar />
      <div className="skeleton-lines" />
    </article>
  );
}
