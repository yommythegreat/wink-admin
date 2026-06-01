import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/_admin/admin/guide")({
  component: AdminGuidePage,
});

type Section = {
  title: string;
  body: string;
};

const sections: Section[] = [
  {
    title: "How Discover works",
    body: `Discover is the core of Wink. A user taps "Go Live" to become visible to others nearby.

Going live requires location permission — the app captures the user's GPS coordinates and writes them to their profile alongside is_live = true. Free users get one live session per day, capped at 5 minutes. Premium users can go live unlimited times and set their own session duration.

While live, Wink scans for other users who are also live within the configured radius (default 50 m). Results appear in three views the user can switch between:

• Stack — one profile at a time, swipe-style. Tap the wink button to send a wink or X to pass.
• Radar — an animated radar showing all nearby profiles as dots. Tap a dot to expand and act.
• Grid — a photo grid of everyone nearby. Tap a card to view and wink.

The Nearby count in the status bar reflects exactly how many profiles are currently visible in the feed (not a raw total). When the timer reaches zero the session ends automatically and the user goes invisible again. They can also tap "End session" at any time.

Blocks are enforced at the database level — a blocked user will never appear in Discover regardless of live status.`,
  },
  {
    title: "How Winks work",
    body: `A wink is a lightweight expression of interest — Wink's equivalent of a like or a tap.

Wink In tab — shows winks the user has received that are still within the response window and have not yet become matches.
Wink Out tab — shows winks the user has sent that are still awaiting a response. Once a wink becomes a mutual match, it disappears from Wink Out and shows up as a chat in Chats.

When a wink arrives in real time, the receiver gets a toast notification: "👀 [Name] winked at you."

Response windows (determined by the receiver's plan):
• Free receiver — 30 minutes from when the wink was sent.
• Premium receiver — 24 hours from when the wink was sent.

If the receiver does not wink back within their window, the wink expires and disappears from their Wink In tab. The sender can then rediscover and wink that person again in a future live session.

Passing on someone in Discover (tapping X) hides them for the rest of the current session only — they reappear in the next session.

If a user winks someone they have already winked before, the old wink is replaced with a fresh one. This enables clean re-matching without residual history.`,
  },
  {
    title: "How Matching works",
    body: `A match occurs the moment two users have both sent each other a wink — a mutual wink.

When user B winks back user A (or vice versa), a database trigger detects the mutual wink and automatically creates a 24-hour chat room between them. If the two users previously matched and a chat already exists, the old chat and all its messages are deleted and a fresh chat is created — every match starts clean.

Both users see the same success modal:
• Title: "It's a Wink Match! 🎉"
• Subtitle: "You both winked. Start the conversation while the moment is still fresh."
• Two buttons: Proceed to Chat (lands on the Chats list) and Later (dismisses the modal).

The modal appears for the user who initiated the wink-back immediately. For the original sender, the modal appears the next time they are in the app — whether they are currently active or sign in later. Either button on the modal marks the match as acknowledged, so it does not reappear on refresh or future logins.

If a user receives multiple match-backs while offline, a single modal still appears on next login — Proceed to Chat takes them to the Chats list where all matched conversations are waiting.

The 24-hour chat countdown starts from the moment of the mutual wink, not from when the first wink was sent. Matched winks no longer appear in Wink In or Wink Out — the match lives as a chat from that point on.

Scenario where user B finds user A in Discover and winks (after A has already winked at B): this is treated as a wink-back, not a new wink. The match is created immediately, B sees the modal, A's profile leaves B's Discover feed, and A sees the modal on next interaction.`,
  },
  {
    title: "How Chats work",
    body: `Every chat has a 24-hour window. Once it expires the conversation is gone and cannot be recovered — this is by design.

Inside a chat, users can:
• Send plain text messages in real time
• Tap "Share Contact" to send a contact card containing their phone number and any social links (Instagram, X, TikTok) they have saved in their profile. The other person can tap directly through to call or open social profiles.

The countdown is shown in the chat header at all times. A reminder banner inside the thread reads "This conversation disappears in Xh. Share contact to keep it."

Blocking: from the ⋯ menu in the chat header a user can block the other person. This immediately ends the conversation, marks the chat as blocked, and ensures neither party ever appears in the other's Discover feed again. When blocking, the user can optionally submit a report with a reason — this goes to the admin Moderation queue.`,
  },
  {
    title: "How Profiles work",
    body: `A user's profile is set up during onboarding and can be edited at any time from Profile › Edit.

Fields:
• Display name — shown in Discover, Winks, and Chats
• Bio — short description shown on their Discover card
• Avatar — profile photo
• Date of birth — used to show approximate age in Discover (e.g. "Sofia, 27")
• Gender — M, F, or Other
• Interests — free-form tags

Wink doesn't ask users to pick an intent (Dating / Networking / Both). The app supports both organically — the user's bio and interests communicate context, and matches happen on mutual winks regardless of category.

Profiles are only visible to other users in Discover while the profile owner is live. Outside of a live session, a profile is only visible to users who share an active wink or chat with them.`,
  },
  {
    title: "How Contact Info works",
    body: `Contact Info (Profile › Contact) is where users store the details they are willing to share with a match.

Fields available:
• Phone number
• Instagram URL
• X (Twitter) URL
• TikTok URL

None of this information is shown publicly in Discover. It is only shared when a user taps "Share Contact" inside an active chat. The recipient sees a contact card bubble in the thread with tappable links.

If a user has not filled in any contact fields and tries to share, they see a prompt directing them to Profile › Contact to add at least one detail first.`,
  },
  {
    title: "How Settings work",
    body: `Settings contains account-level controls.

Theme — users can toggle between light mode, dark mode, and system default. The toggle is also available in the top-right corner of most screens.

Delete Account — permanently removes the account. To confirm, the user must type their exact email address into a text field. If the email doesn't match, the action is rejected. Once deleted, the email address is added to a blocklist — it cannot be used to log in or create a new account.

Plan — links to the subscription management screen (Settings › Plan).`,
  },
  {
    title: "How Wink Premium works",
    body: `Wink has a free tier and a Premium paid tier. Premium is managed through Stripe and is available as a weekly, monthly, or yearly subscription.

Free tier:
• 1 live session per day
• Sessions last 5 minutes
• Wink response window: 30 minutes (you have 30 min to wink back before the wink expires)

Premium tier:
• Unlimited live sessions per day
• Session duration: choose from 10, 20, or 30 minutes (set in preferences)
• Wink response window: 24 hours
• All future premium features as they are released

Users manage their subscription from Settings › Plan. Cancellations and renewals are handled via the Stripe customer portal.`,
  },
  {
    title: "How Safety works",
    body: `Wink has layered safety protections at both the database and product level.

Blocking:
Any user can block another person from inside an active chat (⋯ menu › Block [Name]). Blocking immediately:
• Ends the conversation and makes it read-only for both parties
• Prevents either user from ever appearing in the other's Discover feed — this is enforced at the database level and cannot be circumvented by going live
• Optionally submits a report to the admin Moderation queue

Reporting:
When blocking, users see a two-option category picker (Harassment, No longer needed) and an optional free-text field for additional context. Either is sufficient — picking a category alone is a valid report, typing freely without a category is also accepted. Both can be submitted together. Reports appear in the Admin › Moderation section with the reporter's name, the reported person's name, the category, any details the user typed, and a timestamp. Admins can dismiss, mark as reviewed, or ban the reported user directly from the moderation queue.

Deleted accounts:
When a user deletes their account, their email is blocklisted. They cannot log back in or register a new account with the same address.`,
  },
];

function AdminGuidePage() {
  const [query, setQuery] = useState("");
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const visible = query.trim()
    ? sections.filter(
        (s) =>
          s.title.toLowerCase().includes(query.toLowerCase()) ||
          s.body.toLowerCase().includes(query.toLowerCase()),
      )
    : sections;

  return (
    <div className="flex flex-col">
      <AdminHeader crumbs={[{ label: "Product Guide" }]} />

      <div className="space-y-6 p-6">
        {/* Intro */}
        <div>
          <p className="text-sm text-muted-foreground">
            How everything works, explained simply.
          </p>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search topics…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Sections */}
        <div className="space-y-2">
          {visible.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No topics match "{query}"
            </p>
          ) : (
            visible.map((section, i) => {
              // When filtering, use the section's global index to keep open state stable
              const globalIndex = sections.indexOf(section);
              const isOpen = openIndex === globalIndex;
              return (
                <div
                  key={section.title}
                  className="overflow-hidden rounded-xl border border-border bg-card"
                >
                  <button
                    type="button"
                    onClick={() => setOpenIndex(isOpen ? null : globalIndex)}
                    className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-medium text-foreground transition-colors hover:bg-secondary/40"
                  >
                    <span>{section.title}</span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
                        isOpen && "rotate-180",
                      )}
                    />
                  </button>
                  {isOpen && (
                    <div className="border-t border-border px-5 pb-5 pt-4">
                      {section.body.split("\n\n").map((paragraph, pi) => (
                        <p
                          key={pi}
                          className="mt-2 text-sm leading-relaxed text-muted-foreground first:mt-0"
                        >
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
