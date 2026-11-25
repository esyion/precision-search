import { Toggle } from './Toggle';

export function Settings({ user }: { user: User }) {
  return (
    <form className="settings">
      <h2>Settings</h2>
      <Toggle name="emails.enabled" defaultOn={user.prefs.emails} />
      <Toggle name="emails.digest" defaultOn={user.prefs.digest} />
      <button type="submit">Save</button>
    </form>
  );
}
