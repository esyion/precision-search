import { UserCard } from './UserCard';
import { fetchStats } from '../stats';

/**
 * Landing dashboard: shows the signed-in user's stats
 * and a grid of recommended reports.
 */
export function Dashboard({ user }: { user: User }) {
  const stats = fetchStats(user.id);
  return (
    <main className="dashboard">
      <h1>Welcome back, {user.name}</h1>
      <StatsGrid stats={stats} />
      <UserCard user={user} variant="wide" showEmail />
    </main>
  );
}
