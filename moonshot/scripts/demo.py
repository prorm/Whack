"""Render a short overview from the verified browser captures. Source media are preserved."""
import subprocess
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageOps

from .media import OUT, ROOT, font

CAPTURE = ROOT / "moonshot/benchmarks/captures"
SCENES = [
    ("mobile-capture", "One shop problem", "A stock ledger and a physical count disagree. The demo uses invented counts."),
    ("mobile-facts", "Read the evidence", "Gemini proposed the facts from a staged recording. The contributor confirms them."),
    ("mobile-expert-review", "Correct the source", "At 0:08, C4 replaces C5. A contributor checks each step against the source."),
    ("mobile-source-answer", "Ask the recording", "Find the reason for using C4, then return to the exact source moment."),
    ("mobile-big-text-recall", "Recall a corrected rule", "The personalized reel revisits a sign mistake and pauses for a new answer."),
    ("mobile-offline-proof", "Solve a new worksheet", "The browser graded the attempt and kept a private explanation offline."),
    ("mobile-reviewed-proof", "Share with consent", "The reviewer sees the exact worksheet. The learner controls the demo preview."),
    ("mobile-community", "Make the next version better", "A new suggestion goes to moderation. The evidence remains attached to its original version."),
]


def wrap(draw, x, y, content, size, color, max_width, bold=False):
    f = font(size, bold)
    row = ""
    for word in content.split():
        combined = (row + " " + word).strip()
        if draw.textlength(combined, font=f) > max_width and row:
            draw.text((x,y),row,font=f,fill=color)
            y += int(size * 1.3)
            row = word
        else:
            row = combined
    draw.text((x,y),row,font=f,fill=color)


def main():
    with tempfile.TemporaryDirectory() as folder:
        work = Path(folder)
        playlist = []
        for i,(name,title,notes) in enumerate(SCENES,1):
            canvas = Image.new("RGB", (1280,720), "#172029")
            d = ImageDraw.Draw(canvas)
            original = Image.open(CAPTURE/(name+".png")).convert("RGB")
            if original.height / original.width > 3:
                original = original.crop((0,0,original.width,round(original.width*3)))
            preview = ImageOps.contain(original,(470,640))
            canvas.paste(preview,(40+(470-preview.width)//2,40))
            d.line((534,56,534,664),fill="#7d6e49",width=1)
            d.text((590,105),f"CAPABLE X  /  {i:02d}",font=font(23, True),fill="#ffd671")
            wrap(d,590,184,title,54,"#fff7df",620,True)
            wrap(d,590,395,notes,32,"#e0dde0",580)
            d.text((590,632),"SYNTHETIC RESEARCH DEMO",font=font(19,True),fill="#d7bf86")
            frame = work / f"scene-{i}.png"
            canvas.save(frame)
            playlist.extend((f"file '{frame.as_posix()}'","duration 4"))
        playlist.append(playlist[-2])
        source = work / "list.txt"
        source.write_text("\n".join(playlist)+"\n",encoding="utf8")
        subprocess.run(["ffmpeg","-y","-hide_banner","-loglevel","error","-f","concat","-safe","0","-i",str(source),
                        "-vf","fps=24,format=yuv420p","-t","32","-c:v","libx264","-crf","22","-movflags","+faststart",str(OUT/"moonshot-walkthrough.mp4")],check=True)


if __name__ == "__main__":
    main()
