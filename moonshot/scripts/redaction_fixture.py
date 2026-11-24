"""Exercise explicit rectangular masking on a known, wholly invented screenshot."""
from pathlib import Path
from PIL import ImageDraw
from .media import OUT, font, worksheet


def main():
    synthetic = worksheet(2)
    canvas = ImageDraw.Draw(synthetic)
    bounds = (34,400,550,456)
    canvas.rectangle(bounds, fill="#fff")
    canvas.text((47,416), "Fictional contact: redaction-test@example.com", font=font(17), fill="#172936")
    hidden = synthetic.copy()
    mask = ImageDraw.Draw(hidden)
    mask.rectangle(bounds, fill="#172936")
    assert hidden.crop((35,401,550,456)).getextrema() == ((23,23),(41,41),(54,54))
    assert hidden.getpixel((35,252)) == synthetic.getpixel((35,252))
    hidden.save(Path(OUT) / "worksheet-manual-mask.png")
    print("Known synthetic box masked. The worksheet row outside it was preserved.")


if __name__ == "__main__":
    main()
