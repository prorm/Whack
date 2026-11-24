"""Render labeled synthetic worksheet sources and controlled reel comparators without cloud use."""
import json
import os
import subprocess
import tempfile
from pathlib import Path
from time import perf_counter

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "moonshot" / "media"
PUBLIC = ROOT / "app" / "public" / "media" / "moonshot"
CASE = json.loads((ROOT / "moonshot/datasets/tin-24.json").read_text(encoding="utf8"))
FONT_ROOT = Path(os.environ.get("WINDIR", "C:/Windows")) / "Fonts"


def font(size, bold=False):
    path = FONT_ROOT / ("segoeuib.ttf" if bold else "segoeui.ttf")
    return ImageFont.truetype(str(path), size) if path.exists() else ImageFont.load_default(size=size)


def run(*args):
    subprocess.run(args, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)


def worksheet(i, messy=False):
    image = Image.new("RGB", (960, 540), "#e9edf2")
    d = ImageDraw.Draw(image)
    d.rectangle((0, 0, 960, 60), fill="#172936")
    d.text((32, 15), "STOCK CLOSE / SHIFT 02", fill="#fff6d7", font=font(23, True))
    d.text((653, 19), "SYNTHETIC SCREEN DEMO", fill="#e4cf9c", font=font(16, True))
    d.text((30, 90), "Inventory worksheet", fill="#172936", font=font(38, True))
    d.rectangle((30, 154, 930, 207), fill="#fff")
    d.text((48, 169), "E4      " + ("=B4+C5-D4" if i < 2 else "=B4+C4-D4"), fill="#172936", font=font(22, True))
    columns = (34, 173, 286, 400, 498, 608, 718, 824)
    for x, title in zip(columns, ("SKU", "Opening", "Received","Sold","Expected","Counted","Variance","Status")):
        d.text((x, 224), title, fill="#334d5d", font=font(17, True))
    for row, values in enumerate((("TIN-24","120","30","18","114" if i < 2 else "132","128","−4" if i >= 3 else "—","SHORT 4" if i >= 4 else "—"),
                                  ("BOLT-9","41","12","9","44","44","0","MATCH"))):
        y = 252 + row * 55
        d.rectangle((24, y, 938, y + 49), fill="#fff" if row else "#e4f3f2")
        for index, (x, value) in enumerate(zip(columns, values)):
            if (i == 1 and row == 1 and index == 2) or (i == 2 and row == 0 and index == 4) or (i == 3 and row == 0 and index in (5,6)) or (i == 4 and row == 0 and index == 7):
                d.rounded_rectangle((x-7, y+2, min(x+103,936), y+47), radius=6, fill="#ffd971")
            d.text((x, y + 9), value, fill="#152633", font=font(20, True))
    if i == 4:
        d.text((34, 394), "Record the shortage. Check the receipt and recount before adjusting.", fill="#172936", font=font(20, True))
    if messy and i in (1, 3):
        d.rectangle((206, 142, 565, 315), fill="#32444e")
        d.text((225, 160), "Other window", fill="white", font=font(21, True))
    d.text((34, 483), "CAPABLE X • Illustrative stock data", fill="#47606e", font=font(16))
    return image


def build_source(work):
    for name, messy in (("source-silent", False), ("source-occluded", True)):
        playlist = work / (name + ".txt")
        records = []
        for index, span in enumerate(CASE["spans"]):
            frame = OUT / f"frame-{span['id']}.png" if not messy else work / f"occluded-{index}.png"
            worksheet(index, messy).save(frame)
            records.extend((f"file '{frame.resolve().as_posix()}'", f"duration {span['end'] - span['at']}"))
        records.append(records[-2])
        playlist.write_text("\n".join(records) + "\n", encoding="utf8")
        run("ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", str(playlist),
            "-vf", "fps=24,format=yuv420p", "-t", "23", "-c:v", "libx264", "-preset", "fast", "-crf", "24", "-movflags", "+faststart", str(OUT / (name + ".mp4")))
    (OUT / "worksheet.png").write_bytes((OUT / "frame-fix.png").read_bytes())
    source = OUT / "source-silent.mp4"
    voice = OUT / "source-narration.m4a"
    if voice.exists():
        narrated = OUT / "source-narrated.mp4"
        run("ffmpeg","-y","-hide_banner","-loglevel","error","-i",str(source),"-i",str(voice),"-c:v","copy",
            "-c:a","copy","-t","23","-movflags","+faststart",str(narrated))
        source = narrated
    (PUBLIC / "inventory-demo.mp4").write_bytes(source.read_bytes())
    run("ffmpeg","-y","-hide_banner","-loglevel","error","-i",str(OUT / "worksheet.png"),"-vf","scale=580:-2","-quality","82",str(PUBLIC/"inventory-poster.webp"))
    captions = ["WEBVTT", ""]
    for span in CASE["spans"]:
        captions.extend((f"00:00:{span['at']:02}.000 --> 00:00:{span['end']:02}.000", span["speech"], ""))
    (PUBLIC / "inventory-en.vtt").write_text("\n".join(captions),encoding="utf8")


def main():
    OUT.mkdir(exist_ok=True, parents=True)
    PUBLIC.mkdir(exist_ok=True, parents=True)
    clock = perf_counter()
    with tempfile.TemporaryDirectory() as directory:
        build_source(Path(directory))
    print(f"Rendered inventory sources in {perf_counter() - clock:.2f} s")


if __name__ == "__main__":
    main()
