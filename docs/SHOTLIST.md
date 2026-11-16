# Setback: shot list for the demo video

Seven shots, one continuous screen recording of the live app at https://setback-mocha.vercel.app. Total about 2 minutes 50 seconds. The words to say are in `docs/VIDEO_SCRIPT.md`. The caption numbers refer to `docs/captions.srt`.

## Browser setup (do this before recording)

- Use a fresh window with only the Setback tab open. A private or guest window is best: no personal tabs, no account picture, no extensions, no autofill.
- Window size 1280×720 or 1920×1080. Record the browser window only, not the whole desktop.
- Browser zoom 110% to 125%, so the numbers are readable on a small video player. Check that the "Before and after" table still fits without sideways scrolling.
- Hide the bookmarks bar (Ctrl+Shift+B in Chrome or Edge).
- Close notifications and chat apps. Turn on Do Not Disturb.
- Load https://setback-mocha.vercel.app with nothing after the address (no `#s=...`), so the landing page shows.
- Do a silent practice run first. Check that every number in the "Point at" column appears exactly. If one does not, stop and fix the documents before recording.
- Record the voice in a quiet room. Leave about one second of silence between shots for scrolling.

## Shots

The shots follow the "4 Results" page from top to bottom: headline, "Before and after", "Comfort check", "One week, hour by hour", "Why this works" (not shown), "Sanity check", "Scale it", "Program this tonight". You only scroll down.

| # | Time | Length | App state and clicks | Point at | Script lines |
| --- | --- | --- | --- | --- | --- |
| 1 | 0:00 to 0:15 | 15 s | Landing page, fresh load, no `#s=` in the address. Heading "Setback". Buttons "Try the Waterloo example" and "Start with my own place" both visible. No clicks. | The sentence under the heading, then rest the mouse beside "Try the Waterloo example". | Shot 1 SAY. Captions 1 to 3. |
| 2 | 0:16 to 0:58 | 42 s | Click "Try the Waterloo example". State: step "4 Results", an apartment in Waterloo, Ontario, gas furnace 95%, 22 °C all day before, the suggested schedule after, 1 home. Scroll to "Before and after". Leave the price field empty. | Headline: 8.8% and about 150 kg CO2e. Table row "Natural gas, m³": 879, 801, 78. | Shot 2 SAY. Captions 4 to 11. |
| 3 | 0:59 to 1:28 | 30 s | Scroll to "Comfort check", then to "One week, hour by hour". "Week to show" stays on its default: "Week of Jan 26, 2026 (average -15.0 °C outside), coldest week". Do not change the week. | Comfort check line "After, better schedule: below 20 °C for 6.9 of 1,934 hours at home and awake". Then the solid line "Inside, better schedule" falling after 11:00 PM on a weekday night, the heat chart at zero while it falls, and the warm-up from 5:00 AM. | Shot 3 SAY. Captions 12 to 17. |
| 4 | 1:29 to 1:53 | 24 s | Scroll past "Why this works" to "Sanity check". Nothing typed. | The NRCan quote, "Published figure: about 2%", "This model: 1.4%", verdict "below". Then the CMHC card: 6.5% published, 3.3% from the model, "below". Then "Why the model leans low". | Shot 4 SAY. Captions 18 to 23. |
| 5 | 1:54 to 2:11 | 17 s | Scroll to "Scale it". Click "How many homes like this?", clear it, type 40. The "estimate" box appears. | "Natural gas saved: 3,102 m³ per season" (said as about 3,100) and "Emissions saved: 5,990 kg CO2e per season". | Shot 5 SAY. Captions 24 to 27. |
| 6 | 2:12 to 2:25 | 13 s | Scroll to the card "Program this tonight". Hover "Print this card" but do not click it (the print dialog can show printer names). Click "Copy share link". | Weekdays: 5:00 AM 21 °C, 8:30 AM 18 °C, 3:30 PM 21 °C, 11:00 PM 18 °C. Weekend: 7:00 AM 21 °C, 11:30 PM 18 °C. Then the message "Link copied." and the "Share link" field. | Shot 6 SAY. Captions 28 to 30. |
| 7 | 2:26 to 2:51 | 26 s | Click "Sources and assumptions" (the button at the bottom of the Results page, or the one in the step bar at the top). Scroll slowly through "What the model uses" down to "Limits of this model" and stop there. | The kind labels ("cited", "calculated", "estimate"), a few source links, then the first limit: "These are simulations, not measured savings." | Shot 7 SAY. Captions 31 to 36. |

Note for shot 5: the screen shows 3,102 m³ because the app multiplies the unrounded saving by 40. The script and the documents say "about 3,100", which is the same number rounded to the nearest ten, as in `docs/SOURCES.md` section 8.

## Optional shortcut for retakes

The app keeps the whole scenario after `#s=` in the address and opens "4 Results" when a link with `#s=` is loaded. These two links were made with the app's own encoder (`lib/share.ts`) for the documented example. Use them to jump straight to a state when you retake a shot. Test each one once before relying on it. If one shows different numbers, use the clicks in the table.

Example with 1 home (shots 2, 3, 4, 6, 7):

```
https://setback-mocha.vercel.app/#s=eyJ2IjoxLCJjIjoid2F0ZXJsb28iLCJoIjoiYXBhcnRtZW50IiwidWEiOjgwLCJjbSI6MTEuNiwiaGsiOm51bGwsImh0IjoiZ2FzIiwiZmUiOjk1LCJyIjpbNDIwLDEzODAsMSw1MTAsMTA1MCw1NDAsMTQxMF0sImNmIjoyMCwiYiI6W1tbMCwyMl1dLFtbMCwyMl1dXSwiYSI6W1tbMzAwLDIxXSxbNTEwLDE4XSxbOTMwLDIxXSxbMTM4MCwxOF1dLFtbNDIwLDIxXSxbMTQxMCwxOF1dXSwibiI6MSwicCI6bnVsbH0
```

Same example with 40 homes already entered (shot 5):

```
https://setback-mocha.vercel.app/#s=eyJ2IjoxLCJjIjoid2F0ZXJsb28iLCJoIjoiYXBhcnRtZW50IiwidWEiOjgwLCJjbSI6MTEuNiwiaGsiOm51bGwsImh0IjoiZ2FzIiwiZmUiOjk1LCJyIjpbNDIwLDEzODAsMSw1MTAsMTA1MCw1NDAsMTQxMF0sImNmIjoyMCwiYiI6W1tbMCwyMl1dLFtbMCwyMl1dXSwiYSI6W1tbMzAwLDIxXSxbNTEwLDE4XSxbOTMwLDIxXSxbMTM4MCwxOF1dLFtbNDIwLDIxXSxbMTQxMCwxOF1dXSwibiI6NDAsInAiOm51bGx9
```

## After recording

1. Watch the video once with the sound off. Every number named in the script should be readable on screen.
2. Upload to YouTube (unlisted or public). Add `docs/captions.srt` as English subtitles, then nudge the timings to match your voice.
3. Put the video address in place of `VIDEO_URL_HERE` in `README.md` and `docs/DEVPOST.md`.
