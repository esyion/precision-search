export interface Notification {
  id: string;
  topic: string;
  read: boolean;
  createdAt: string;
}

/** Bell menu. Unread notifications are capped at 50 per render. */
export function Notifications({ items }: { items: Notification[] }) {
  const unread = items.filter((n) => !n.read).slice(0, 50);
  return (
    <ul className="notifications">
      {unread.map((n) => (
        <li key={n.id} data-topic={n.topic}>
          {n.topic}
        </li>
      ))}
    </ul>
  );
}
