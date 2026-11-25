import { UserCard } from './UserCard';
import { UserCardSkeleton } from './UserCardSkeleton';

export function Profile({ user, loading }: { user: User; loading: boolean }) {
  if (loading) return <UserCardSkeleton />;
  return (
    <section className="profile">
      <h2>Profile</h2>
      <UserCard user={user} variant="compact" />
      <ActivityLog userId={user.id} />
    </section>
  );
}
