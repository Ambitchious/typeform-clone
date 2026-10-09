import { Icon, type IconName } from "../icons";
import { SoonBadge } from "../ui";

const INTEGRATIONS: { name: string; icon: IconName; text: string }[] = [
  { name: "Google Sheets", icon: "chart", text: "Send every new response to a spreadsheet row." },
  { name: "Slack", icon: "users", text: "Post a message to a channel when someone submits." },
  { name: "Webhooks", icon: "zap", text: "POST each response to your own endpoint as JSON." },
  { name: "Email notifications", icon: "email", text: "Get an email for every new response." },
  { name: "Zapier", icon: "branch", text: "Connect to 5,000+ apps without code." },
  { name: "Team collaboration", icon: "users", text: "Invite teammates to edit and view results." },
];

/** The Connect tab: integrations are out of scope for this build, so they're placeholders. */
export function ConnectPanel() {
  return (
    <div className="mx-auto w-full max-w-[860px] overflow-y-auto px-2 pb-24">
      <h1 className="mt-2 text-[22px]">Connect</h1>
      <p className="mb-6 text-[14px] text-ink-2">Send your responses to the tools you already use.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {INTEGRATIONS.map((i) => (
          <div key={i.name} className="flex gap-3 rounded-xl bg-panel p-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-surface text-ink-2"><Icon name={i.icon} size={20} /></span>
            <div className="flex-1">
              <div className="flex items-center justify-between gap-2"><h2 className="text-[15px] font-medium">{i.name}</h2><SoonBadge /></div>
              <p className="mt-1 text-[13px] text-ink-2">{i.text}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
