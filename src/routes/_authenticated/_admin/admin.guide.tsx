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
    body: `Discover is the original Wink pillar — find people who are physically near you right now. A user taps "Go Live" to become visible to others nearby.

Going live requires location permission — the app captures the user's GPS coordinates and writes them to their profile alongside is_live = true. Both free and premium users get unlimited sessions per day with the same configurable session duration (10, 20, or 30 minutes). Where they differ: free users are capped at 3 lifetime matches (see "How Wink Premium works" below).

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

There are two contexts a wink can come from:
• Discover wink — sent during a live Go Live session to someone nearby.
• Spot wink — sent from inside a Wink Spot to another member of that Spot. See "How Wink Spots work" below.

Both kinds end up in the same Wink In / Wink Out tabs. A small "from {SpotName}" badge appears on Spot winks so the user knows which pillar a wink came from.

Wink In tab — winks the user has received that haven't yet become matches.
Wink Out tab — winks the user has sent that are still awaiting a response. Once a wink becomes a mutual match it disappears from Wink Out and shows up as a chat in Chats.

When a wink arrives in real time the receiver gets a toast notification: "👀 [Name] winked at you" and a native push if they have the iOS/Android app installed.

Response windows:
• Live (Discover) wink: free users can wink back for free_winkback_window_minutes, paid users for paid_winkback_window_minutes (both set in Config). After the paid window it disappears from Wink In.
• Spot wink: never expires. It stays in Wink In until the receiver declines or winks back.

Winking is idempotent: winking the same person again, or a double tap on Wink back, never sends a second wink or a second notification (send_wink RPC + one wink per sender and receiver).

Free-tier paywall on Spot winks: when a free user is on the receiving end of a Spot wink, the sender's name is hidden as "Someone" and both Decline + Wink back are paywalled. They have to upgrade to act. Wink Out always shows the recipient's name regardless of tier.

Passing on someone in Discover (tapping X) hides them for the rest of the current session only — they reappear in the next session.

If a user winks someone they've already winked before, the old wink is replaced with a fresh one. This enables clean re-matching without residual history.`,
  },
  {
    title: "How Matching works",
    body: `A match occurs the moment two users have both sent each other a wink — a mutual wink.

A match counts the same way regardless of how the winks were sent. Two Discover winks → match. Two Spot winks → match. One Discover + one Spot → still a match. The pillar each wink came from is recorded but doesn't change the outcome.

When user B winks back user A (or vice versa), a database trigger detects the mutual wink and automatically creates a 24-hour chat room between them. If the two users previously matched and a chat already exists, the old chat and all its messages are deleted and a fresh chat is created — every match starts clean.

Every new chat increments the free-tier match counter for both users (see "How Wink Premium works"). Once a free user has joined 3 chats they hit the cap and Discover Go Live + new wink-back / wink-send actions are blocked until they upgrade.

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
    body: `Chats don't expire. A match opens a chat that stays until one person unmatches (which removes it for both) or blocks.

Inside a chat, users can:
• Send text messages, with emoji, in real time
• Send photos, videos (up to 60 seconds, 25 MB) and voice notes (up to 2 minutes). Media is stored privately; only the two people in the chat can open it.
• React to any message with an emoji
• Report a single message, photo, video or voice note. The report lands in Moderation with the message attached.

Read receipts follow WhatsApp: one grey tick means sent, two grey ticks delivered to the other person's phone (even if Wink is closed there), two pink ticks read. Settings › Privacy › Read receipts: if either person turns it off, neither sees read ticks; delivered ticks still show. Contact sharing was removed; contact cards shared before that still show in their chats.

Blocking: from the ⋯ menu a user can block the other person, optionally with a report. Both people then see a note in the chat ("You blocked X..." / "X has blocked you...") and neither can message. The chat stays visible, read-only, for 24 hours after the block, then disappears for both. The blocker can unblock in Settings › Blocked people.`,
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

Profiles are only visible to other users in Discover while the profile owner is live. Outside of a live session, a profile is visible to users who share an active wink or chat with the owner — and to other members of any Wink Spot the owner has joined.`,
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

The free tier is designed to let users actually experience the product (the old "5-minute timer + 1 session per day" friction has been removed). Free and Premium users use Discover, Spots, Winks, and Chats with the same UX. The only difference is a lifetime cap on free-tier matches.

Free tier:
• Unlimited Go Live sessions per day with the same 10 / 20 / 30 min duration options Premium gets
• 24-hour Wink In response window for Discover winks (same as Premium)
• Spot winks they send: pre-cap, work normally
• Spot winks they receive: name hidden as "Someone" + Decline and Wink back paywalled (Spots is positioned as the premium pillar on the receive side)
• Lifetime cap: 3 matches. Each new chat counts as 1 match toward the cap, regardless of which pillar the wink pair came from

At-cap free user (match_count ≥ 3):
• Go Live button blocked with "You've used your 3 free matches. Upgrade to keep going live."
• Wink back on every incoming wink (Discover OR Spot) paywalled — funnels to Settings › Plan
• Spot wink-send button paywalled — funnels to Settings › Plan
• Decline still works (it doesn't create a match)
• Existing chats still work: messages, media and block all unaffected
• Browsing Spots, joining Spots, A2C toggle all still work — none of those create matches
• A capped free user is also effectively invisible in Discover (they can't go live) and indirectly invisible in Spots (they can't initiate winks)

Premium tier:
• Unlimited everything — no session caps, no match caps, no wink-back paywall, no Spot-wink paywall on receive side
• Same Go Live, Wink, Chat, Spot UX as free users; no premium-only features yet
• All future premium features as they are released

The match counter is prospective — it starts at 0 for every user on the day this model shipped. No retroactive backfill from historical chats.

Users manage their subscription from Settings › Plan. Cancellations and renewals are handled via the Stripe customer portal. When a free user upgrades, all paywalls lift immediately; their match_count stays where it is but stops mattering because it's only consulted for free users.`,
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
When blocking, users see a two-option category picker (Inappropriate messages, No longer needed) and an optional free-text field for additional context. Either is sufficient — picking a category alone is a valid report, typing freely without a category is also accepted. Both can be submitted together. Reports appear in the Admin › Moderation section with the reporter's name, the reported person's name, the category, any details the user typed, and a timestamp. Admins can dismiss, mark as reviewed, or ban the reported user directly from the moderation queue.

Deleted accounts:
When a user deletes their account, their email is blocklisted. They cannot log back in or register a new account with the same address.`,
  },
  {
    title: "How Wink Spots work",
    body: `Wink Spots is the second discovery pillar — find people through shared places and interests within your current city, instead of needing both parties to be live and physically near each other.

Tab placement: Spots sits between Discover and Winks in the bottom nav.

Current city detection: admin defines each launched city as a row in the cities table with a center latitude/longitude and a radius_m (default 25 km). When the Spots tab opens, the app reads the user's GPS, finds the closest city whose center is within radius_m, and stamps that as profile.current_city_id. Users outside every launched city see an "isn't in your area yet" empty state with a Suggest-a-Spot CTA. Their location is silently tracked in city_launch_interest so they get a push when admin launches in their area.

Categories: admin maintains a global taxonomy of categories (Cafés, Fitness, Karaoke, Beaches, etc.) plus a per-city subset via the city_categories join table. Only categories enabled for the user's current city appear in their Spots tab.

Joining a Spot: tapping a Spot opens its detail page (cover image, description, address, member count). The user taps "Join Spot" to enter; once joined they see the members list. Members are split into two sections: "Available to Connect" (members who flipped the per-Spot A2C toggle on) and "Other Members." Each member row shows display name, age, bio, and a "N mutual spots" badge if applicable.

Available to Connect: a per-membership boolean (NOT a global per-user setting). A user can be A2C on at the gym they frequent and off at the library. Surfaces them at the top of the Spot's member list.

Sending a Spot wink: the Wink button on a member sends a wink with context = 'spot' and spot_id pointing at the current Spot (send_wink RPC, same as Live). For at-cap free users the button becomes an upgrade link.

Receiving a Spot wink: lands in the user's Wink In tab with a "from {SpotName}" badge. Spot winks never expire. For free users the sender's name is hidden as "Someone" and the action buttons are paywalled. See "How Winks work."

Matching from a Spot: identical to Discover matching. Mutual wink → handle_wink_match trigger creates the chat, the match modal appears, and both people get "You and X matched." Same match counter increments.

Suggestions queue: tapping "Suggest a Spot" opens a form (name, category, city if known, address, notes). Submissions land in the Admin → Spot Suggestions queue. Admin can Approve, Reject, or Convert (creates the actual Spot row from the suggestion). All three transitions push the suggester via the push_spot_suggestion_status trigger.

City paused state: if a user has joined Spots in a different city than their current one, those memberships are preserved but show a "Discovery paused" card on the Spot detail page — they need to return to that city to interact.`,
  },
  {
    title: "How native apps work",
    body: `Wink runs on the web (TanStack Start SSR site on Cloudflare Workers) AND as native iOS + Android apps. Same React codebase, same Supabase backend, same Cloudflare worker.

How it's wrapped: the same SPA bundle that powers the browser is packaged into a Capacitor iOS and Android shell with Bundle ID com.usewink.app. The native shell hosts the React app in a system webview. Server function calls from the native app are rewritten to point at the deployed worker URL (spa-server-fn-patch.ts) so they go to the same backend as the browser path.

Native features wired:
• Status bar styling + splash screen (Wink-pink background + W logo)
• Safe-area handling so content clears the iPhone notch + Android navigation bar
• Photo library access — used by the avatar picker; declared via Info.plist usage descriptions on iOS and AndroidManifest.xml permissions on Android
• Location services — used by Discover and Spots
• Firebase Cloud Messaging for push notifications (see next section)

The browser-SSR site and the native apps deploy independently. Web users get changes the moment the wink-user-dashboard worker is redeployed. Native users get changes when the APK / IPA is rebuilt with the new SPA bundle and shipped through Play Store / TestFlight / App Store.`,
  },
  {
    title: "How Push Notifications work",
    body: `Push notifications are delivered to native iOS + Android apps via Firebase Cloud Messaging (FCM). Browser-SSR users don't get pushes (browser push isn't wired).

Pipeline: every notification-worthy event in Postgres fires a database trigger. Triggers call notify_push(), which uses the pg_net extension to POST to the Cloudflare worker's /api/internal/send-push route (shared-secret authenticated). The worker resolves the recipient's FCM tokens from device_tokens, signs an OAuth2 JWT with the Firebase service account, and calls Firebase HTTP v1 to deliver.

Push categories firing today:
• New wink received — title "You got a wink", body includes the sender's display name. Fires on every winks INSERT, sent to the receiver.
• New match: title "It's a Wink Match!", body "You and X matched.", fires on every chats INSERT (which only happens on a mutual wink), sent to both parties.
• New chat message: title is the sender's name, body is the first 140 chars of the message, or "📷 Photo", "🎥 Video", "🎤 Voice note". Sent to the OTHER party in the chat (not when they've blocked the sender).
• Wink credit received: "You received Wink credit", sent to the person a transfer went to.
• Spot suggestion status change — title varies (approved / converted / rejected), fires on spot_suggestions UPDATE when status moves out of "pending."
• City just launched in your area: fires when admin clicks "Enable" on a city. The city-launch-notify edge function emails everyone waiting for that city (people the app found outside every launched city, within the new city's area), then sends the push. Each person is told once.

Delivery: pushes go out from the send-push edge function on Supabase (no longer through the web app), so they keep working if the web app is down.

Token lifecycle: on every app launch, the user's FCM token is captured and upserted into device_tokens against their user_id. Tokens rotate occasionally — handled by FCM's own tokenReceived listener. Invalid tokens (uninstalls, app data cleared) are automatically pruned by the worker when FCM returns an "unregistered" error.`,
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
