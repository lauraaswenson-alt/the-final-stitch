#!/usr/bin/env python3
"""
vectorize_pin_enamel.py — Convert images to enamel pin manufacturing-ready vectors.

Designed specifically for enamel pin production. Generates clean, flat color
regions with metal border lines between fills — exactly what a pin factory needs.

Features:
  - Merges similar colors automatically (no duplicate whites/creams)
  - Adds metal divider lines between color regions
  - Limits to manufacturer-friendly palette (default 6 colors)
  - Outputs Illustrator-compatible layered SVG or EPS
  - Includes color spec sheet in output

Usage:
    python3 vectorize_pin_enamel.py <image_path>
    python3 vectorize_pin_enamel.py <image_path> -c 8 --metal gold
    python3 vectorize_pin_enamel.py <image_path> --eps --metal black
"""

import argparse
import os
import sys
from collections import defaultdict

import numpy as np
from PIL import Image, ImageFilter


METAL_COLORS = {
    "gold": "#c8a850",
    "silver": "#c0c0c0",
    "black": "#1a1a1a",
    "rose-gold": "#b76e79",
    "gunmetal": "#4a4a4a",
}


def quantize_colors(image: Image.Image, num_colors: int) -> Image.Image:
    """Reduce image to a limited color palette using median-cut quantization."""
    return image.quantize(colors=num_colors, method=Image.Quantize.MEDIANCUT).convert(
        "RGB"
    )


def color_distance(c1: tuple[int, int, int], c2: tuple[int, int, int]) -> float:
    """Euclidean distance between two RGB colors."""
    return ((c1[0] - c2[0]) ** 2 + (c1[1] - c2[1]) ** 2 + (c1[2] - c2[2]) ** 2) ** 0.5


def merge_similar_colors(
    layers: dict[tuple[int, int, int], np.ndarray],
    threshold: float = 35.0,
) -> dict[tuple[int, int, int], np.ndarray]:
    """
    Merge colors that are too similar into one.
    Uses the larger region's color as the representative.
    """
    colors = list(layers.keys())
    # Sort by pixel count descending so larger regions absorb smaller ones
    colors.sort(key=lambda c: int(np.sum(layers[c])), reverse=True)

    merged = {}
    color_map = {}  # maps original color -> representative color

    for color in colors:
        # Check if this color is close to any already-chosen representative
        found = False
        for rep in merged:
            if color_distance(color, rep) < threshold:
                color_map[color] = rep
                found = True
                break
        if not found:
            color_map[color] = color
            merged[color] = np.zeros_like(layers[color])

    # Combine masks
    for color, mask in layers.items():
        rep = color_map[color]
        merged[rep] = np.maximum(merged[rep], mask)

    return merged


def clean_mask(mask: np.ndarray, min_region_pixels: int = 20) -> np.ndarray:
    """
    Clean up a binary mask by removing tiny isolated regions
    and filling small holes. Makes cleaner enamel fill regions.
    """
    from PIL import Image as PILImage

    # Convert to PIL for morphological operations
    img = PILImage.fromarray((mask * 255).astype(np.uint8), mode="L")

    # Dilate then erode to close small gaps
    img = img.filter(ImageFilter.MaxFilter(3))
    img = img.filter(ImageFilter.MinFilter(3))

    # Erode then dilate to remove small noise
    img = img.filter(ImageFilter.MinFilter(3))
    img = img.filter(ImageFilter.MaxFilter(3))

    result = (np.array(img) > 127).astype(np.uint8)
    return result


def find_borders(
    layers: dict[tuple[int, int, int], np.ndarray],
    width: int,
    height: int,
    border_width: float = 1.5,
) -> np.ndarray:
    """
    Find border pixels between different color regions.
    Returns a binary mask of border locations.
    """
    # Create a label map (each pixel gets its color index)
    label_map = np.zeros((height, width), dtype=np.int32)
    for i, (color, mask) in enumerate(layers.items(), 1):
        label_map[mask == 1] = i

    # Find pixels where adjacent pixels have different labels
    border = np.zeros((height, width), dtype=np.uint8)

    # Check 4-connected neighbors
    # Right neighbor
    border[:-1, :] |= (label_map[:-1, :] != label_map[1:, :]).astype(np.uint8)
    border[1:, :] |= (label_map[:-1, :] != label_map[1:, :]).astype(np.uint8)
    # Bottom neighbor
    border[:, :-1] |= (label_map[:, :-1] != label_map[:, 1:]).astype(np.uint8)
    border[:, 1:] |= (label_map[:, :-1] != label_map[:, 1:]).astype(np.uint8)

    # Thicken the border
    if border_width > 1:
        from PIL import Image as PILImage
        border_img = PILImage.fromarray(border * 255, mode="L")
        dilate_rounds = max(1, int(border_width))
        for _ in range(dilate_rounds):
            border_img = border_img.filter(ImageFilter.MaxFilter(3))
        border = (np.array(border_img) > 127).astype(np.uint8)

    return border


def merge_horizontal_runs(mask: np.ndarray) -> list[str]:
    """Merge horizontal pixel runs into rectangles for compact SVG."""
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


def color_name(r: int, g: int, b: int) -> str:
    """Human-readable color name."""
    brightness = (r * 299 + g * 587 + b * 114) / 1000
    saturation = max(r, g, b) - min(r, g, b)

    if brightness < 40:
        return "Black"
    if brightness > 220 and saturation < 30:
        return "White"
    if saturation < 25:
        if brightness < 100:
            return "Dark Gray"
        if brightness < 180:
            return "Gray"
        return "Light Gray"

    if r > g and r > b:
        if g > b + 40:
            if g > 140:
                return "Gold" if r > 180 else "Olive"
            return "Orange" if r > 160 else "Brown"
        return "Red" if r > 140 else "Dark Red"
    if g > r and g > b:
        return "Green" if g > 100 else "Dark Green"
    if b > r and b > g:
        if r > 80 and b > 140:
            return "Periwinkle"
        return "Blue" if b > 100 else "Dark Blue"
    if r > 180 and g > 150 and b < 120:
        return "Gold"
    if r > 150 and g > 100 and b < 80:
        return "Amber"

    return "Mixed"


def build_enamel_svg(
    width: int,
    height: int,
    layers: dict[tuple[int, int, int], np.ndarray],
    metal_color: str = "#c8a850",
    metal_name: str = "gold",
    border_width: float = 1.5,
) -> str:
    """Build an enamel pin manufacturing SVG with metal borders."""
    total_pixels = width * height
    sorted_layers = sorted(layers.items(), key=lambda x: int(np.sum(x[1])), reverse=True)

    # Find borders between regions
    print("  Finding metal divider lines...")
    borders = find_borders(layers, width, height, border_width)

    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        f'<svg xmlns="http://www.w3.org/2000/svg"',
        f'     xmlns:i="http://ns.adobe.com/AdobeIllustrator/10.0/"',
        f'     viewBox="0 0 {width} {height}"',
        f'     width="{width}" height="{height}"',
        f'     shape-rendering="geometricPrecision">',
        '',
        '  <!-- ENAMEL PIN MANUFACTURING SPEC',
        f'       Dimensions: {width}x{height} px',
        f'       Metal: {metal_name} ({metal_color})',
        f'       Enamel fills: {len(sorted_layers)} colors',
        '       ==========================================',
    ]

    for i, (clr, mask) in enumerate(sorted_layers, 1):
        pcount = int(np.sum(mask))
        pct = pcount / total_pixels * 100
        hex_c = f"#{clr[0]:02x}{clr[1]:02x}{clr[2]:02x}"
        name = color_name(*clr)
        lines.append(f'       Fill {i}: {hex_c}  {name:15s}  {pct:5.1f}% coverage')

    lines.append('  -->')
    lines.append('')

    # Background (metal base)
    lines.append(f'  <g id="Metal Base - {metal_name}" i:layer="yes" i:dimmedPercent="50">')
    lines.append(f'    <rect width="{width}" height="{height}" fill="{metal_color}"/>')
    lines.append('  </g>')

    # Enamel fill layers
    total = len(sorted_layers)
    for idx, (clr, mask) in enumerate(sorted_layers, 1):
        pixel_count = int(np.sum(mask))
        if pixel_count < 10:
            continue

        hex_color = f"#{clr[0]:02x}{clr[1]:02x}{clr[2]:02x}"
        name = color_name(*clr)
        pct = pixel_count / total_pixels * 100

        print(f"  Fill {idx}/{total}: {hex_color} {name:15s} {pixel_count:6d} px ({pct:.1f}%)")

        # Subtract border pixels from fill to create gap for metal lines
        fill_mask = mask.copy()
        fill_mask[borders == 1] = 0

        rect_paths = merge_horizontal_runs(fill_mask)
        if rect_paths:
            layer_name = f"Enamel Fill {idx} - {hex_color} ({name})"
            lines.append(f'  <g id="{layer_name}" i:layer="yes" i:dimmedPercent="50">')
            lines.append(f'    <path d="{" ".join(rect_paths)}" fill="{hex_color}"/>')
            lines.append('  </g>')

    # Metal borders on top
    print("  Adding metal border lines...")
    border_paths = merge_horizontal_runs(borders)
    if border_paths:
        lines.append(f'  <g id="Metal Borders - {metal_name}" i:layer="yes" i:dimmedPercent="50">')
        lines.append(f'    <path d="{" ".join(border_paths)}" fill="{metal_color}"/>')
        lines.append('  </g>')

    lines.append('</svg>')
    return '\n'.join(lines) + '\n'


def build_enamel_eps(
    width: int,
    height: int,
    layers: dict[tuple[int, int, int], np.ndarray],
    metal_color: str = "#c8a850",
    metal_name: str = "gold",
    border_width: float = 1.5,
) -> str:
    """Build an EPS file for enamel pin manufacturing."""
    total_pixels = width * height
    sorted_layers = sorted(layers.items(), key=lambda x: int(np.sum(x[1])), reverse=True)

    # Parse metal hex color
    mc = metal_color.lstrip('#')
    mr, mg, mb = int(mc[0:2], 16) / 255, int(mc[2:4], 16) / 255, int(mc[4:6], 16) / 255

    borders = find_borders(layers, width, height, border_width)

    lines = [
        '%!PS-Adobe-3.0 EPSF-3.0',
        f'%%BoundingBox: 0 0 {width} {height}',
        '%%Title: Enamel Pin Manufacturing File - The Final Stitch',
        '%%Creator: vectorize_pin_enamel.py',
        '%%EndComments',
        '',
        '% ENAMEL PIN SPEC',
        f'% Metal: {metal_name} ({metal_color})',
        f'% Enamel fills: {len(sorted_layers)} colors',
    ]

    for i, (clr, mask) in enumerate(sorted_layers, 1):
        pcount = int(np.sum(mask))
        pct = pcount / total_pixels * 100
        hex_c = f"#{clr[0]:02x}{clr[1]:02x}{clr[2]:02x}"
        name = color_name(*clr)
        lines.append(f'%   Fill {i}: {hex_c} {name} ({pct:.1f}%)')

    lines.append('')
    lines.append(f'0 {height} translate')
    lines.append('1 -1 scale')
    lines.append('')

    # Metal base
    lines.append(f'% Metal base')
    lines.append(f'{mr:.4f} {mg:.4f} {mb:.4f} setrgbcolor')
    lines.append(f'0 0 {width} {height} rectfill')
    lines.append('')

    # Enamel fills
    total = len(sorted_layers)
    for idx, (clr, mask) in enumerate(sorted_layers, 1):
        pixel_count = int(np.sum(mask))
        if pixel_count < 10:
            continue

        r, g, b = clr[0] / 255.0, clr[1] / 255.0, clr[2] / 255.0
        hex_color = f"#{clr[0]:02x}{clr[1]:02x}{clr[2]:02x}"
        name = color_name(*clr)

        fill_mask = mask.copy()
        fill_mask[borders == 1] = 0

        lines.append(f'% Enamel Fill: {hex_color} ({name})')
        lines.append(f'{r:.4f} {g:.4f} {b:.4f} setrgbcolor')

        h, w = fill_mask.shape
        used = np.zeros_like(fill_mask, dtype=bool)
        for y in range(h):
            x = 0
            while x < w:
                if fill_mask[y, x] == 1 and not used[y, x]:
                    x_end = x
                    while x_end < w and fill_mask[y, x_end] == 1 and not used[y, x_end]:
                        x_end += 1
                    y_end = y + 1
                    while y_end < h:
                        row_ok = True
                        for xi in range(x, x_end):
                            if fill_mask[y_end, xi] != 1 or used[y_end, xi]:
                                row_ok = False
                                break
                        if row_ok:
                            y_end += 1
                        else:
                            break
                    used[y:y_end, x:x_end] = True
                    rw = x_end - x
                    rh = y_end - y
                    lines.append(f'{x} {y} {rw} {rh} rectfill')
                    x = x_end
                else:
                    x += 1
        lines.append('')

    # Metal borders on top
    lines.append(f'% Metal borders')
    lines.append(f'{mr:.4f} {mg:.4f} {mb:.4f} setrgbcolor')
    h, w = borders.shape
    used = np.zeros_like(borders, dtype=bool)
    for y in range(h):
        x = 0
        while x < w:
            if borders[y, x] == 1 and not used[y, x]:
                x_end = x
                while x_end < w and borders[y, x_end] == 1 and not used[y, x_end]:
                    x_end += 1
                y_end = y + 1
                while y_end < h:
                    row_ok = True
                    for xi in range(x, x_end):
                        if borders[y_end, xi] != 1 or used[y_end, xi]:
                            row_ok = False
                            break
                    if row_ok:
                        y_end += 1
                    else:
                        break
                used[y:y_end, x:x_end] = True
                rw = x_end - x
                rh = y_end - y
                lines.append(f'{x} {y} {rw} {rh} rectfill')
                x = x_end
            else:
                x += 1

    lines.append('')
    lines.append('showpage')
    lines.append('%%EOF')
    return '\n'.join(lines) + '\n'


def vectorize_enamel(
    image_path: str,
    output_path: str | None = None,
    num_colors: int = 6,
    max_dimension: int = 512,
    metal: str = "gold",
    border_width: float = 1.5,
    merge_threshold: float = 35.0,
    eps: bool = False,
) -> str:
    """Enamel pin manufacturing vectorization pipeline."""
    if not os.path.isfile(image_path):
        print(f"Error: File not found: {image_path}", file=sys.stderr)
        sys.exit(1)

    ext = ".eps" if eps else ".svg"
    if output_path is None:
        base, _ = os.path.splitext(image_path)
        output_path = base + f"_enamel{ext}"

    metal_hex = METAL_COLORS.get(metal, metal)
    if metal_hex.startswith("#") and len(metal_hex) == 7:
        pass  # valid hex
    elif metal in METAL_COLORS:
        metal_hex = METAL_COLORS[metal]
    else:
        print(f"Warning: Unknown metal '{metal}', using gold", file=sys.stderr)
        metal = "gold"
        metal_hex = METAL_COLORS["gold"]

    img = Image.open(image_path).convert("RGB")
    orig_w, orig_h = img.size

    if max(orig_w, orig_h) > max_dimension:
        scale = max_dimension / max(orig_w, orig_h)
        new_w = int(orig_w * scale)
        new_h = int(orig_h * scale)
        img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
        print(f"Resized {orig_w}x{orig_h} -> {new_w}x{new_h}")

    w, h = img.size

    # Step 1: Quantize to more colors than needed, then merge similar
    # This gives better results than quantizing directly to few colors
    initial_colors = min(num_colors * 4, 48)
    print(f"Step 1: Quantizing to {initial_colors} initial colors...")
    quantized = quantize_colors(img, initial_colors)

    arr = np.array(quantized)
    pixels = arr.reshape(-1, 3)
    unique_colors = np.unique(pixels, axis=0)
    layers = {}
    for color in unique_colors:
        r, g, b = int(color[0]), int(color[1]), int(color[2])
        mask = np.all(arr == color, axis=2).astype(np.uint8)
        layers[(r, g, b)] = mask

    print(f"  Found {len(layers)} unique colors")

    # Step 2: Merge similar colors
    print(f"Step 2: Merging similar colors (threshold={merge_threshold})...")
    merged = merge_similar_colors(layers, threshold=merge_threshold)
    print(f"  Reduced to {len(merged)} colors")

    # Step 3: Keep only the top N colors by coverage
    if len(merged) > num_colors:
        print(f"Step 3: Keeping top {num_colors} colors...")
        sorted_colors = sorted(merged.items(), key=lambda x: int(np.sum(x[1])), reverse=True)
        # Keep top N, merge the rest into closest match
        kept = dict(sorted_colors[:num_colors])
        dropped = sorted_colors[num_colors:]
        for drop_color, drop_mask in dropped:
            # Find closest kept color
            best_dist = float('inf')
            best_color = list(kept.keys())[0]
            for kept_color in kept:
                d = color_distance(drop_color, kept_color)
                if d < best_dist:
                    best_dist = d
                    best_color = kept_color
            kept[best_color] = np.maximum(kept[best_color], drop_mask)
        merged = kept

    # Step 4: Clean up masks
    print(f"Step 4: Cleaning up {len(merged)} color regions...")
    cleaned = {}
    for clr, mask in merged.items():
        cleaned[clr] = clean_mask(mask)

    # Step 5: Build output
    fmt = "EPS" if eps else "SVG"
    print(f"Step 5: Building {fmt} with {metal} metal borders...")

    if eps:
        content = build_enamel_eps(w, h, cleaned, metal_hex, metal, border_width)
    else:
        content = build_enamel_svg(w, h, cleaned, metal_hex, metal, border_width)

    with open(output_path, "w", encoding="utf-8") as f:
        f.write(content)

    file_size = os.path.getsize(output_path)
    print(f"\nOutput written to: {output_path} ({file_size:,} bytes)")
    print(f"\nManufacturing summary:")
    print(f"  Metal: {metal} ({metal_hex})")
    print(f"  Enamel fills: {len(cleaned)}")

    total_pixels = w * h
    for i, (clr, mask) in enumerate(
        sorted(cleaned.items(), key=lambda x: int(np.sum(x[1])), reverse=True), 1
    ):
        pcount = int(np.sum(mask))
        pct = pcount / total_pixels * 100
        hex_c = f"#{clr[0]:02x}{clr[1]:02x}{clr[2]:02x}"
        name = color_name(*clr)
        lines_marker = "***" if pct > 5 else "   "
        print(f"  {lines_marker} Fill {i}: {hex_c} {name:15s} ({pct:.1f}%)")

    return output_path


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


def main():
    parser = argparse.ArgumentParser(
        description="Convert images to enamel pin manufacturing-ready vectors.",
        epilog="Examples:\n"
        "  python3 vectorize_pin_enamel.py photo.png\n"
        "  python3 vectorize_pin_enamel.py photo.png -c 8 --metal silver\n"
        "  python3 vectorize_pin_enamel.py photo.png --eps --metal black\n"
        "\n"
        "Metal options: gold, silver, black, rose-gold, gunmetal\n"
        "  (or pass a hex code like '#c0c0c0')\n",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("image", help="Path to input image")
    parser.add_argument("-o", "--output", help="Output file path")
    parser.add_argument(
        "-c", "--colors", type=int, default=6,
        help="Number of enamel fill colors (default: 6, typical range: 4-8)",
    )
    parser.add_argument(
        "--metal", default="gold",
        help="Metal color: gold, silver, black, rose-gold, gunmetal, or hex (default: gold)",
    )
    parser.add_argument(
        "--border-width", type=float, default=1.5,
        help="Metal border line width in pixels (default: 1.5)",
    )
    parser.add_argument(
        "--merge-threshold", type=float, default=35.0,
        help="Color similarity threshold for merging (default: 35, higher = more merging)",
    )
    parser.add_argument(
        "--max-size", type=int, default=512,
        help="Max image dimension (default: 512)",
    )
    parser.add_argument(
        "--eps", action="store_true",
        help="Output as EPS instead of SVG",
    )

    args = parser.parse_args()

    if args.colors < 2:
        parser.error("Colors must be at least 2")

    vectorize_enamel(
        image_path=args.image,
        output_path=args.output,
        num_colors=args.colors,
        max_dimension=args.max_size,
        metal=args.metal,
        border_width=args.border_width,
        merge_threshold=args.merge_threshold,
        eps=args.eps,
    )


if __name__ == "__main__":
    main()
