"""Two controlled local comparison renders and an extract of the synthetic source."""
from pathlib import Path
import json
import subprocess
from time import perf_counter

from PIL import Image, ImageDraw
from .media import font, OUT, ROOT


WIDTH, HEIGHT, FPS = 540, 960, 24
BEATS = [
    (0.0, "THE PAYOUT CHECK", "20% of ₹350", "₹370?", "A percentage is a share of the bill."),
    (3.0, "THE REPAIR", "Multiply, then divide", "₹70", "₹350 × 20 ÷ 100"),
    (8.0, "YOUR TURN", "What is 15% of ₹200?", "?", "Take a moment to work it out."),
    (14.0, "THE ANSWER", "15% of ₹200", "₹30", "₹200 × 15 ÷ 100"),
]


def monogram(draw, xy, label, size, color, bold=False):
    draw.text(xy, label, fill=color, font=font(size, bold))


def motion(seconds, grounded):
    index = max(i for i, item in enumerate(BEATS) if item[0] <= seconds)
    start, label, title, amount, note = BEATS[index]
    age = seconds - start
    base = ["#1d1927", "#f1ce61", "#29213c", "#142d2c"][index]
    text = "#18171b" if index == 1 else "#fff8e7"
    accent = "#3b2b13" if index == 1 else "#eec658"
    image = Image.new("RGB", (WIDTH, HEIGHT), base)
    d = ImageDraw.Draw(image)
    nudge = round(25 * max(0, 1-age/.45)**3)
    monogram(d,(52,62),"SCROLLPROOF  /  DEMO",20,accent,True)
    monogram(d,(52,110),label,24,text,True)
    if grounded:
        d.rounded_rectangle((42,184,498,585),radius=11,fill="#f3f0e7")
        monogram(d,(72,211),"PAYOUT WORKSHEET",20,"#172b39",True)
        monogram(d,(72,278),"Order value      Rate",22,"#172b39")
        monogram(d,(72,315),"₹350 × 20%" if index < 2 else "₹200 × 15%",30,"#172b39",True)
        d.line((70,380,466,380),fill="#8e9187",width=2)
        d.rounded_rectangle((70,415,466,496),radius=8,fill="#ead06d")
        monogram(d,(83,435),amount,43,"#172b39",True)
        monogram(d,(52,624 + nudge), title,32,text,True)
    else:
        monogram(d,(52,328 + nudge),title,36,text,True)
        monogram(d,(47,383 + nudge),amount,112,accent,True)
        if index == 1:
            d.rectangle((54,569,485,596),fill="#b69a4d")
            d.rectangle((54,569,54+round(431*.2*min(1,age/.75)),596),fill="#3b2b13")
    monogram(d,(52,758),note,22,text,True)
    d.rectangle((52,865,488,870), fill="#a59364")
    d.rectangle((52,865,52+round(seconds/18*436),870),fill=accent)
    return image


def render(name, grounded):
    target = OUT/name
    start = perf_counter()
    with subprocess.Popen(["ffmpeg","-y","-hide_banner","-loglevel","error","-f","rawvideo","-pixel_format","rgb24",
        "-video_size",f"{WIDTH}x{HEIGHT}","-framerate",str(FPS),"-i","-","-vf","format=yuv420p","-c:v","libx264",
        "-preset","fast","-crf","24","-movflags","+faststart",str(target)], stdin=subprocess.PIPE) as codec:
        for frame in range(FPS * 18):
            codec.stdin.write(motion(frame/FPS, grounded).tobytes())
        codec.stdin.close()
        if codec.wait() != 0:
            raise RuntimeError("Encoding failed")
    return {"filename":name,"bytes":target.stat().st_size,"ms":round((perf_counter()-start)*1000)}


def main():
    comparison = [render("payout-minimal.mp4", False), render("payout-worksheet-cut.mp4", True)]
    started = perf_counter()
    excerpt = OUT/"inventory-source-excerpt.mp4"
    subprocess.run(["ffmpeg","-y","-hide_banner","-loglevel","error","-ss","4","-i",str(OUT/"source-narrated.mp4"),
                    "-t","19","-c:v","libx264","-crf","24","-c:a","aac","-b:a","32k","-movflags","+faststart",str(excerpt)],check=True)
    comparison.append({"filename":excerpt.name,"bytes":excerpt.stat().st_size,"ms":round((perf_counter()-started)*1000)})
    (ROOT/"moonshot/benchmarks/reels.json").write_text(json.dumps(comparison,indent=2)+"\n", encoding="utf8")


if __name__ == "__main__":
    main()
