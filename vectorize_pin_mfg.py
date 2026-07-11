#!/usr/bin/env python3
"""
vectorize_pin_mfg.py — Manufacturing-ready vectorization for needlepoint.

Generates an Adobe Illustrator-compatible SVG with:
  - Each color on a separate named layer (opens as layers in Illustrator)
  - Color palette summary with hex values and pixel coverage
  - Higher color fidelity (default 24 colors) to preserve detail
  - Optional EPS output for direct Illustrator import

Usage:
    python3 vectorize_pin_mfg.py <image_path>
    python3 vectorize_pin_mfg.py <image_path> -c 32 -o output.svg
    python3 vectorize_pin_mfg.py <image_path> --eps

The output SVG can be opened directly in Adobe Illustrator via:
    File > Open > select the .svg file
Each color will appear as a separate, named layer.
"""

import argparse
import os
import sys

import numpy as np
from PIL import Image


def quantize_colors(image: Image.Image, num_colors: int) -> Image.Image:
    """Reduce image to a limited color palette using median-cut quantization."""
    return image.quantize(colors=num_colors, method=Image.Quantize.MEDIANCUT).convert(
        "RGB"
    )


def image_to_color_layers(
    image: Image.Image,
) -> dict[tuple[int, int, int], np.ndarray]:
    """Split a quantized image into binary masks, one per unique color."""
    arr = np.array(image)
    pixels = arr.reshape(-1, 3)
    unique_colors = np.unique(pixels, axis=0)

    layers = {}
    for color in unique_colors:
        r, g, b = int(color[0]), int(color[1]), int(color[2])
        mask = np.all(arr == color, axis=2).astype(np.uint8)
        layers[(r, g, b)] = mask

    return layers


def color_name_hint(r: int, g: int, b: int) -> str:
    """Generate a simple human-readable color description."""
    brightness = (r * 299 + g * 587 + b * 114) / 1000

    if brightness < 40:
        return "Black"
    if brightness > 220 and max(r, g, b) - min(r, g, b) < 30:
        return "White"
    if max(r, g, b) - min(r, g, b) < 20:
        if brightness < 100:
            return "Dark Gray"
        if brightness < 180:
            return "Gray"
        return "Light Gray"

    # Determine dominant hue
    if r > g and r > b:
        if g > b + 40:
            return "Orange" if g > 120 else "Dark Red"
        return "Red" if r > 150 else "Dark Red"
    if g > r and g > b:
        if r > b + 40:
            return "Yellow-Green" if r > 120 else "Green"
        return "Green" if g > 100 else "Dark Green"
    if b > r and b > g:
        if r > g + 40:
            return "Purple"
        return "Blue" if b > 100 else "Dark Blue"

    if r > 180 and g > 150 and b < 100:
        return "Gold"
    if r > 150 and g > 100 and b > 80 and r > b:
        return "Tan"

    return "Mixed"


def merge_horizontal_runs(mask: np.ndarray) -> list[str]:
    """Merge horizontal runs into larger rectangles for compact SVG output."""
    h, w = mask.shape
    used = np.zeros_like(mask, dtype=bool)
    rects = []

    for y in range(h):
        x = 0
        while x < w:
            if mask[y, x] == 1 and not used[y, x]:
                x_end = x
                while x_end < w and mask[y, x_end] == 1 and not used[y, x_end]:
                    x_end += 1

                y_end = y + 1
                while y_end < h:
                    row_ok = True
                    for xi in range(x, x_end):
                        if mask[y_end, xi] != 1 or used[y_end, xi]:
                            row_ok = False
                            break
                    if row_ok:
                        y_end += 1
                    else:
                        break

                used[y:y_end, x:x_end] = True
                rw = x_end - x
                rh = y_end - y
                rects.append(f"M{x},{y}h{rw}v{rh}h-{rw}Z")
                x = x_end
            else:
                x += 1

    return rects


def build_illustrator_svg(
    width: int,
    height: int,
    layers: dict[tuple[int, int, int], np.ndarray],
) -> str:
    """
    Build an Illustrator-compatible SVG with named layers.

    Uses the Illustrator XML namespace so each <g> becomes a named layer
    when opened in Adobe Illustrator.
    """
    total_pixels = width * height

    # Sort layers by pixel count (largest first)
    sorted_layers = sorted(layers.items(), key=lambda x: int(np.sum(x[1])), reverse=True)

    # Build SVG manually to control namespace declarations
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        f'<svg xmlns="http://www.w3.org/2000/svg"',
        f'     xmlns:i="http://ns.adobe.com/AdobeIllustrator/10.0/"',
        f'     viewBox="0 0 {width} {height}"',
        f'     width="{width}" height="{height}"',
        f'     shape-rendering="geometricPrecision">',
    ]

    # Color palette summary as a comment
    lines.append("  <!-- COLOR PALETTE")
    lines.append(f"       Image: {width}x{height} pixels, {len(sorted_layers)} colors")
    lines.append("       ==========================================")
    for i, (color, mask) in enumerate(sorted_layers, 1):
        pcount = int(np.sum(mask))
        pct = pcount / total_pixels * 100
        hex_c = f"#{color[0]:02x}{color[1]:02x}{color[2]:02x}"
        name = color_name_hint(*color)
        lines.append(f"       Layer {i:2d}: {hex_c}  {name:15s}  {pcount:6d} px ({pct:5.1f}%)")
    lines.append("  -->")

    # Background layer
    if sorted_layers:
        bg_color, bg_mask = sorted_layers[0]
        bg_total = np.sum(bg_mask)
        if bg_total > (total_pixels * 0.3):
            hex_bg = f"#{bg_color[0]:02x}{bg_color[1]:02x}{bg_color[2]:02x}"
            name = color_name_hint(*bg_color)
            layer_name = f"Background - {hex_bg} ({name})"
            lines.append(f'  <g id="{layer_name}" i:layer="yes" i:dimmedPercent="50">')
            lines.append(f'    <rect width="{width}" height="{height}" fill="{hex_bg}"/>')
            lines.append("  </g>")
            sorted_layers = sorted_layers[1:]

    total = len(sorted_layers)
    for idx, (color, mask) in enumerate(sorted_layers, 1):
        pixel_count = int(np.sum(mask))
        if pixel_count < 4:
            continue

        hex_color = f"#{color[0]:02x}{color[1]:02x}{color[2]:02x}"
        name = color_name_hint(*color)
        pct = pixel_count / total_pixels * 100
        layer_name = f"Color {idx} - {hex_color} ({name})"

        print(f"  Layer {idx}/{total}: {hex_color} {name:15s} {pixel_count:6d} px ({pct:.1f}%)")

        rect_paths = merge_horizontal_runs(mask)
        if rect_paths:
            lines.append(f'  <g id="{layer_name}" i:layer="yes" i:dimmedPercent="50">')
            lines.append(f'    <path d="{" ".join(rect_paths)}" fill="{hex_color}"/>')
            lines.append("  </g>")

    lines.append("</svg>")
    return "\n".join(lines) + "\n"


def build_eps(
    width: int,
    height: int,
    layers: dict[tuple[int, int, int], np.ndarray],
) -> str:
    """
    Build an EPS (Encapsulated PostScript) file with color layers.

    EPS files open natively in Adobe Illustrator with full editability.
    """
    total_pixels = width * height
    sorted_layers = sorted(layers.items(), key=lambda x: int(np.sum(x[1])), reverse=True)

    lines = [
        "%!PS-Adobe-3.0 EPSF-3.0",
        f"%%BoundingBox: 0 0 {width} {height}",
        f"%%HiResBoundingBox: 0 0 {width} {height}",
        "%%Title: The Final Stitch - Vectorized Pin",
        "%%Creator: vectorize_pin_mfg.py",
        "%%Pages: 1",
        "%%EndComments",
        "",
        "% Color Palette:",
    ]

    for i, (color, mask) in enumerate(sorted_layers, 1):
        pcount = int(np.sum(mask))
        pct = pcount / total_pixels * 100
        hex_c = f"#{color[0]:02x}{color[1]:02x}{color[2]:02x}"
        name = color_name_hint(*color)
        lines.append(f"%   Layer {i}: {hex_c} {name} ({pcount} px, {pct:.1f}%)")

    lines.append("")
    # Flip Y axis since PostScript origin is bottom-left
    lines.append(f"0 {height} translate")
    lines.append("1 -1 scale")
    lines.append("")

    total = len(sorted_layers)
    for idx, (color, mask) in enumerate(sorted_layers, 1):
        pixel_count = int(np.sum(mask))
        if pixel_count < 4:
            continue

        r, g, b = color[0] / 255.0, color[1] / 255.0, color[2] / 255.0
        hex_color = f"#{color[0]:02x}{color[1]:02x}{color[2]:02x}"
        name = color_name_hint(*color)
        pct = pixel_count / total_pixels * 100

        print(f"  Layer {idx}/{total}: {hex_color} {name:15s} {pixel_count:6d} px ({pct:.1f}%)")

        lines.append(f"% Layer: {hex_color} ({name})")
        lines.append(f"{r:.4f} {g:.4f} {b:.4f} setrgbcolor")

        # Generate rectangles
        h, w = mask.shape
        used = np.zeros_like(mask, dtype=bool)

        for y in range(h):
            x = 0
            while x < w:
                if mask[y, x] == 1 and not used[y, x]:
                    x_end = x
                    while x_end < w and mask[y, x_end] == 1 and not used[y, x_end]:
                        x_end += 1
                    y_end = y + 1
                    while y_end < h:
                        row_ok = True
                        for xi in range(x, x_end):
                            if mask[y_end, xi] != 1 or used[y_end, xi]:
                                row_ok = False
                                break
                        if row_ok:
                            y_end += 1
                        else:
                            break
                    used[y:y_end, x:x_end] = True
                    rw = x_end - x
                    rh = y_end - y
                    lines.append(f"{x} {y} {rw} {rh} rectfill")
                    x = x_end
                else:
                    x += 1

        lines.append("")

    lines.append("showpage")
    lines.append("%%EOF")
    return "\n".join(lines) + "\n"


def vectorize_mfg(
    image_path: str,
    output_path: str | None = None,
    num_colors: int = 24,
    max_dimension: int = 512,
    eps: bool = False,
) -> str:
    """Manufacturing-ready vectorization pipeline."""
    if not os.path.isfile(image_path):
        print(f"Error: File not found: {image_path}", file=sys.stderr)
        sys.exit(1)

    ext = ".eps" if eps else ".svg"
    if output_path is None:
        base, _ = os.path.splitext(image_path)
        output_path = base + ext

    img = Image.open(image_path).convert("RGB")
    orig_w, orig_h = img.size

    if max(orig_w, orig_h) > max_dimension:
        scale = max_dimension / max(orig_w, orig_h)
        new_w = int(orig_w * scale)
        new_h = int(orig_h * scale)
        img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
        print(f"Resized {orig_w}x{orig_h} -> {new_w}x{new_h}")

    w, h = img.size

    quantized = quantize_colors(img, num_colors)
    layers = image_to_color_layers(quantized)

    fmt = "EPS" if eps else "Illustrator-compatible SVG"
    print(f"Generating {fmt} with {len(layers)} color layers...")

    if eps:
        content = build_eps(w, h, layers)
    else:
        content = build_illustrator_svg(w, h, layers)

    with open(output_path, "w", encoding="utf-8") as f:
        f.write(content)

    file_size = os.path.getsize(output_path)
    print(f"\nOutput written to: {output_path} ({file_size:,} bytes)")

    if not eps:
        print("\nTo open in Adobe Illustrator:")
        print("  File > Open > select the .svg file")
        print("  Each color will appear as a separate named layer.")

    return output_path


def main():
    parser = argparse.ArgumentParser(
        description="Manufacturing-ready vectorization for needlepoint (The Final Stitch).",
        epilog="Examples:\n"
        "  python3 vectorize_pin_mfg.py photo.png\n"
        "  python3 vectorize_pin_mfg.py canvas.jpg -c 32\n"
        "  python3 vectorize_pin_mfg.py photo.png --eps\n",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("image", help="Path to input image (PNG, JPG, WebP, etc.)")
    parser.add_argument("-o", "--output", help="Output file path")
    parser.add_argument(
        "-c", "--colors", type=int, default=24,
        help="Number of colors (default: 24, more = better fidelity)",
    )
    parser.add_argument(
        "--max-size", type=int, default=512,
        help="Max image dimension before downscaling (default: 512)",
    )
    parser.add_argument(
        "--eps", action="store_true",
        help="Output as EPS instead of SVG (opens natively in Illustrator)",
    )

    args = parser.parse_args()

    if args.colors < 2:
        parser.error("Colors must be at least 2")

    vectorize_mfg(
        image_path=args.image,
        output_path=args.output,
        num_colors=args.colors,
        max_dimension=args.max_size,
        eps=args.eps,
    )


if __name__ == "__main__":
    main()
