# World News — Wednesday 18 November 2026

[![make.fun](https://make.fun/badge/news-image-20261118.svg)](https://make.fun/c/news-image-20261118)
[![rank](https://make.fun/badge/news-image-20261118/acch50827-maker/world-news-18-november-2026/rank.svg)](https://make.fun/c/news-image-20261118)
[![reward](https://make.fun/badge/news-image-20261118/acch50827-maker/world-news-18-november-2026/reward.svg)](https://make.fun/c/news-image-20261118)

One image that sums up Wednesday 18 November 2026: a newspaper front page
drawn entirely from code.

The lead story is the APEC summit in Shenzhen, where Xi Jinping and Vladimir
Putin met ahead of a trilateral with Donald Trump. Around it: the US-Iran
escalation, the second day of strikes on the Kerch Bridge, Mary Peltola
winning Alaska's Senate seat, Voyager 1 reaching one light-day from Earth,
the United States losing its measles-free status, plus Ebola in DR Congo and
Nvidia's record quarter in the footer.

| Panel | Story |
| --- | --- |
| Lead | Xi and Putin meet in Shenzhen; Trump joins next (APEC) |
| Middle East | US strikes an Iranian missile site on Qeshm Island; Iran hits back |
| Ukraine | Kerch Bridge hit again — road span collapsed |
| US Senate | Peltola wins Alaska; Democrats take a 56-44 majority |
| Space | Voyager 1 reaches one light-day (about 16 billion miles) |
| Health | US loses measles-free status after 26 years (5,412 cases) |
| Footer | Ebola in DR Congo passes 11,000 cases; Nvidia posts a record $115.8B quarter |

The masthead names the day — Wednesday 18 November 2026 — so the image
stands on its own, with no news feed needed to read it.

## How it is made

`main.ts` (Node 22, standard library only) draws the whole front page pixel
by pixel: a hand-written 5x7 bitmap font, flat colours, simple pictograms for
each story, and a hand-written PNG encoder. No network, no downloaded assets,
no copied image. The program is deterministic: run it twice and the two
`entry.png` files are byte-identical (same sha256, 22,053 bytes).

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

This writes `out/entry.png` (1024x1024 PNG, well under the 1 MiB limit).

---

Built for [make.fun](https://make.fun) — referral: https://make.fun/r/xzdd07z5
