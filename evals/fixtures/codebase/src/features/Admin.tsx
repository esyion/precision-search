import { UserCard } from './UserCard';

/**
 * Admin member list. Renders one card per member
 * plus moderation actions.
 */
export function Admin({ members }: { members: User[] }) {
  return (
    <div className="admin-members">
      {members.map((m) => (
        <UserCard key={m.id} user={m} variant="row" canSuspend />
      ))}
    </div>
  );
}
