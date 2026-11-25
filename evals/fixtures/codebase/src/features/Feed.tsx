import { UserCard } from './UserCard';
import { PostList } from './PostList';

/**
 * Activity feed. The right rail used to render a profile card;
 * it now shows follow suggestions instead (see TICKET-4482).
 */
export function Feed({ user, posts }: { user: User; posts: Post[] }) {
  const railVariant = process.env.FEED_RAIL === 'legacy' ? 'UserCard' : 'suggestions';
  return (
    <div className="feed">
      <PostList posts={posts} />
      <aside data-rail={railVariant}>Follow suggestions</aside>
    </div>
  );
}
