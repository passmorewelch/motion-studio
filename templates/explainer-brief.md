# Template: Animated explainer brief

Fill in every [bracket], then paste the brief to Claude.
Starting point in code: `videos/loveandlight-explainer.html` (title → numbered steps → brand close).
First used for: `out/loveandlight-explainer.mp4` (15s, 3 steps).

---

CONTEXT: I run [BRAND NAME], [WHAT THE BRAND DOES] for [WHO IT SERVES]. This video plays on [WHERE IT PLAYS, e.g. Instagram, YouTube, my website] for [WHO WATCHES IT].

RESULT: A [LENGTH]-second animated explainer, [WIDTH]x[HEIGHT], using brand.css.
Title: "[TITLE LINE 1] [TITLE LINE 2] [TITLE LINE 3]"
Then these steps appear one at a time, each with a big number, a short headline and one small line under it:

1. [STEP 1 HEADLINE] / [STEP 1 LINE]
2. [STEP 2 HEADLINE] / [STEP 2 LINE]
3. [STEP 3 HEADLINE] / [STEP 3 LINE]

End on "[END CARD NAME]" with "[END CARD TAGLINE]"

Visual direction: Use the [BRAND NAME] brand colors: [COLOR NAME] [#HEX], [COLOR NAME] [#HEX], [COLOR NAME] [#HEX], [ADD OR REMOVE COLORS]. Use [HEADLINE FONT] for headlines and [BODY FONT] for body text. Feature [LOGO / BRAND SYMBOL, e.g. the gold-heart AI logo — file: assets/loveandlight-mark.png] as the central brand symbol. [STYLE DIRECTION, e.g. elegant gold accents, soft glowing transitions, subtle light effects, modern clean animations]. Keep the design [MOOD WORDS, e.g. bright, welcoming, feminine, professional, technology-forward]. Smooth easing, no hard cuts.

```
OFF-LIMITS: No stock footage, no people, no words I didn't write, no colors outside brand.css. If anything is unclear, ask me before you build.

SHOW YOUR WORK: Before you write code, give me a scene-by-scene storyboard with timings and wait for my OK. After you build it, run --stills 3 and show me the stills before the full render.

NEVER TWICE: When I approve the video, save this brief as a template in a templates folder with [brackets] for the parts that change.
```

---

## Notes from the first run (for Claude)

- **Logo:** if the logo file has a background baked in, cut the mark out and recolour it to brand gold/cream
  (see `assets/loveandlight-mark.png`); leave out any wordmark/tagline in the logo that the brief doesn't use.
  Ask which brand name spelling goes on the end card if the logo and brief differ.
- **Timing that worked at 15s:** title 0–4.0s · steps start 4.0 / 6.55 / 9.1s, 2.65s each · brand close 11.6–15s.
  With more steps or longer lines, lengthen the video rather than shorten each step.
- **Transitions:** each step must fully clear about 0.1s before the next number arrives. Overlapping big
  numbers in the same spot ghost into each other.
- **Contrast:** gold and muted on the blush background are for large elements only; reading text stays in the text colour.
- **Stills:** `--stills 3` misses the end card on this structure, so also show a frame from the last second.
