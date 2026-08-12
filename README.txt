Discord Orbs Nitro Redeemer v0.1.1
==================================

WHAT IT DOES
- You manually choose how many 3-Day Nitro Credits to redeem.
- The extension uses Discord's visible web UI only.
- It does NOT use your Discord token and does NOT call Discord's private APIs directly.
- Each loop attempts:
  1. Open "3-Day Nitro Credit"
  2. Click "Redeem for 1400 orbs"
  3. Click "Claim with Orbs"
  4. Wait for "Nitro Credit Acquired"
  5. Click Close
  6. Repeat
- Stops when your requested count is complete.
- Stops if it sees "Not enough Orbs", a rate-limit/error message, or an unexpected UI timeout.

INSTALL (Chrome / Brave / Edge)
1. Extract this folder somewhere permanent.
2. Open chrome://extensions
   Brave: brave://extensions
   Edge: edge://extensions
3. Enable Developer mode.
4. Click "Load unpacked".
5. Choose the discord-orbs-nitro-redeemer folder.

USE
1. Open https://discord.com/shop?tab=orbs
2. Wait until the Orbs shop is fully loaded.
3. Click the extension icon.
4. Set the number of credits.
5. Leave the delay at 1.3 sec initially.
6. Start with ONE redemption first.
7. If that succeeds, run the larger count you want.

IMPORTANT
- Discord Orb purchases are final/non-refundable.
- Discord can change its Shop UI at any time. If the extension stops on a timeout,
  don't keep retrying blindly; capture the new HTML/UI and update the selectors.
- The extension deliberately avoids bypassing rate limits or making private API calls.
