# Where the titles, descriptions and dates came from

`art.json` is the source of truth. This file explains how it was filled in and
what's worth checking.

## Status

Only `tet.svg` has been copied from OneDrive so far. OneDrive wouldn't download
the other files (they're cloud-only placeholders and the download hung). Until
they're copied into `art/` and `npm run thumbs` is run, the page shows tet in
place of every piece. Tet itself isn't in the gallery. After the files are in,
remove the `PLACEHOLDER_*` lines in `app.js` and delete `art/tet.svg` and
`thumbs/tet.jpg`.

## Tweets

The saved X profile page only had 6 posts in it, because X loads posts as you
scroll. Saving the page again after scrolling to the bottom would let more
pieces be matched.

All 6 matched by title and by eye. Each is an Affinity Designer piece with a PNG
export (no SVG):

| piece | post | how it matched |
|---|---|---|
| Mob and Reigen | 2020-05-19 | title |
| Part 4 Jotaro | 2020-05-26 | title |
| Part 4 Jotaro Recolor | 2020-05-26 | title |
| Saitama (`saitama gum.png`) | 2020-10-01 | title |
| Itachi Uchiha (blue) | 2020-10-04 | image: the 19:57 post has the blue moon |
| Itachi Uchiha (red) | 2020-10-04 | image: the 19:58 post has the red moon |

## Dates for the other pieces

File creation times are useless: every file in the folder was created on
2024-05-04 at 13:39 or 13:40, the day the folder was copied. File
modification times line up with the tweets, 3 to 7 minutes before each post
for all six tweeted pieces. So the 19 untweeted pieces use the modified date of
their exported file, marked `"dateSource": "file-modified"`.

## Not matched to a post (19)

Ocular Patdown, Koichi Pose, Pro Genji, Corrin, Kakkoii Kakyoin, Bucci, ZSS
Corrin, Daga Kotowaru, Giorno Arrow, Hayato, Shigechi Holding His Lunch, Joker
Looking Cool, Falcon Come On, Light Yagami, Light Yagami (red), Lelouch, Lelouch
Emperor, Magic Snake, Mint Jams. These have no description. Titles come from
the filenames.

## Worth checking

- Left out at Mike's request: tet, virgil, phos, rock flag and eagle.

- **Light Yagami (red)** and **Lelouch Emperor** are listed as their own pieces.
  They might be better as alternate versions of Light Yagami and Lelouch.
- Left out as alternate crops of a listed piece: `zsscorrin mobile`,
  `falcon come on with legs.svg`, `koichi pose cropped.png`, and `bad/bucci mobile`
  (the only thing in `bad/`, a phone-shaped crop of Bucci).
- Left out: `corrin.svg.2019_06_29_17_59_45.1.svg` (an Inkscape autosave) and
  `pol_*.png` (slices of the Polnareff piece).
- Left out because there's no exported image, only the `.afdesign` file: gyro,
  levi cleaning, mikitaka, polnareff snake, squideki no kyojin, zeke catch.
  Exporting them from Affinity would let them join the gallery.
