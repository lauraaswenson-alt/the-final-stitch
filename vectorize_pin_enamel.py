#!/usr/bin/env python3
"""
vectorize_pin_enamel.py — Generate enamel pin factory spec sheets from images.

Produces manufacturing-ready output matching the format pin factories expect:
  - Hard enamel with printed detail layers
  - Multi-view spec sheet (enamel view, print view, silhouette/back)
  - Metal borders between enamel fill regions
  - Pantone color matching for each fill
  - Physical dimensions (mm) with dimension lines
  - Separated print layer for screen-printed detail
  - Default imitation gold metal

Usage:
    python3 vectorize_pin_enamel.py <image_path>
    python3 vectorize_pin_enamel.py <image_path> -c 5 --size 44
    python3 vectorize_pin_enamel.py <image_path> --metal silver --magnets 2

Output: Illustrator-compatible SVG spec sheet that can be sent directly to factory.
"""

import argparse
import colorsys
import math
import os
import sys

import numpy as np
from PIL import Image, ImageEnhance, ImageFilter


# --- Pantone Matching ---
# Common Pantone Coated colors used in enamel pin manufacturing
# Format: (R, G, B): ("Pantone Code", "Name")
PANTONE_TABLE = [
    ((255, 255, 255), "White", "White"),
    ((0, 0, 0), "Black", "Black 6c"),
    ((206, 46, 58), "Red", "186c"),
    ((190, 30, 45), "Dark Red", "187c"),
    ((128, 0, 0), "Maroon", "188c"),
    ((255, 103, 31), "Orange", "165c"),
    ((232, 119, 34), "Warm Orange", "716c"),
    ((196, 124, 54), "Amber", "7414c"),
    ((200, 140, 60), "Gold Enamel", "7414c"),
    ((180, 113, 54), "Brown", "7574c"),
    ((139, 90, 43), "Dark Brown", "7575c"),
    ((100, 68, 53), "Chocolate", "4695c"),
    ((255, 199, 44), "Yellow", "116c"),
    ((253, 218, 36), "Bright Yellow", "109c"),
    ((248, 193, 113), "Light Gold", "141c"),
    ((253, 232, 161), "Cream", "7401c"),
    ((0, 133, 63), "Green", "348c"),
    ((0, 104, 56), "Dark Green", "349c"),
    ((100, 160, 90), "Sage", "7490c"),
    ((135, 206, 235), "Sky Blue", "2905c"),
    ((173, 216, 230), "Light Blue", "2905c"),
    ((137, 207, 240), "Baby Blue", "291c"),
    ((100, 180, 220), "Cyan Blue", "2985c"),
    ((0, 114, 187), "Blue", "660c"),
    ((0, 84, 166), "Royal Blue", "661c"),
    ((100, 125, 177), "Periwinkle", "7683c"),
    ((70, 100, 150), "Steel Blue", "7683c"),
    ((0, 48, 135), "Navy", "281c"),
    ((50, 54, 80), "Dark Navy", "282c"),
    ((102, 45, 145), "Purple", "267c"),
    ((155, 79, 150), "Lavender", "2583c"),
    ((242, 169, 178), "Pink", "182c"),
    ((200, 200, 200), "Light Gray", "Cool Gray 3c"),
    ((150, 150, 150), "Gray", "Cool Gray 7c"),
    ((100, 100, 100), "Dark Gray", "Cool Gray 10c"),
    ((185, 162, 130), "Tan", "4665c"),
    ((210, 180, 140), "Beige", "468c"),
]

METAL_COLORS = {
    "gold": ("#c8a850", "#a08030"),       # raised, recessed
    "silver": ("#c0c0c0", "#909090"),
    "black": ("#1a1a1a", "#333333"),
    "rose-gold": ("#b76e79", "#9a5060"),
    "gunmetal": ("#4a4a4a", "#333333"),
}


def preprocess_image(img: Image.Image) -> Image.Image:
    """
    Preprocess a photo to prepare it for enamel pin vectorization.

    Enamel pins need flat, solid colors — no gradients, no shading, no texture.
    This pipeline aggressively simplifies the image:
    1. Strong blur to eliminate texture and merge shading into flat regions
    2. Posterize to snap colors to flat bands (removes subtle gradients)
    3. Boost saturation so distinct hues (blue, gold, etc.) don't get lost
    4. Increase contrast to sharpen boundaries between color regions
    5. Final blur to smooth any posterization artifacts
    """
    # Step 1: Strong blur to eliminate texture, shading, and fine detail
    # This merges gradients into uniform regions (e.g., shaded bull body -> flat gold)
    img = img.filter(ImageFilter.GaussianBlur(radius=3.0))

    # Step 2: Posterize — reduce each channel to fewer levels
    # This snaps similar shades to the same value, flattening gradients
    # 6 levels per channel (step=43) preserves browns/golds while still flattening
    step = 43
    img = Image.fromarray(
        (np.array(img) // step * step + step // 2).clip(0, 255).astype(np.uint8)
    )

    # Step 3: Boost saturation — makes distinct hues (blue china, gold) pop
    enhancer = ImageEnhance.Color(img)
    img = enhancer.enhance(1.5)  # Moderate boost — preserves browns vs pure orange

    # Step 4: Increase contrast to sharpen color region boundaries
    enhancer = ImageEnhance.Contrast(img)
    img = enhancer.enhance(1.4)

    # Step 5: Final smoothing blur to clean up posterization edges
    img = img.filter(ImageFilter.GaussianBlur(radius=2.0))

    return img


def select_colors_by_hue(
    layers: dict[tuple, np.ndarray], num_colors: int
) -> dict[tuple, np.ndarray]:
    """
    Select final colors ensuring distinct hues are represented.

    Instead of just picking the N largest regions (which gives 5 shades of gold),
    this groups colors by hue and picks the largest from each hue group first,
    then fills remaining slots by area.
    """
    if len(layers) <= num_colors:
        return layers

    # Group colors by hue bucket
    hue_buckets: dict[str, list] = {}
    for color, mask in layers.items():
        r, g, b = color
        brightness = (r * 299 + g * 587 + b * 114) / 1000
        saturation = max(r, g, b) - min(r, g, b)

        if brightness > 220 and saturation < 30:
            bucket = "white"
        elif brightness < 40:
            bucket = "black"
        elif saturation < 25:
            bucket = "gray"
        else:
            # Get hue
            h, _, _ = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            hue_deg = h * 360
            if hue_deg < 30 or hue_deg >= 330:
                bucket = "red"
            elif hue_deg < 75:
                bucket = "orange-gold"
            elif hue_deg < 150:
                bucket = "green"
            elif hue_deg < 260:
                bucket = "blue"
            else:
                bucket = "purple"

        if bucket not in hue_buckets:
            hue_buckets[bucket] = []
        hue_buckets[bucket].append((color, mask, int(np.sum(mask))))

    # Sort each bucket by area (largest first)
    for bucket in hue_buckets:
        hue_buckets[bucket].sort(key=lambda x: x[2], reverse=True)

    # Pick the largest from each hue bucket first
    selected = {}
    remaining_slots = num_colors

    # First pass: one from each distinct hue
    for bucket_name in sorted(hue_buckets.keys(), key=lambda b: hue_buckets[b][0][2], reverse=True):
        if remaining_slots <= 0:
            break
        color, mask, area = hue_buckets[bucket_name][0]
        selected[color] = mask
        remaining_slots -= 1

    # Second pass: fill remaining slots with largest unselected colors across all buckets
    all_remaining = []
    for bucket_name, items in hue_buckets.items():
        for color, mask, area in items:
            if color not in selected:
                all_remaining.append((color, mask, area))
    all_remaining.sort(key=lambda x: x[2], reverse=True)

    for color, mask, area in all_remaining:
        if remaining_slots <= 0:
            break
        selected[color] = mask
        remaining_slots -= 1

    # Merge anything not selected into closest selected color
    for bucket_items in hue_buckets.values():
        for color, mask, area in bucket_items:
            if color not in selected:
                best_dist = float("inf")
                best_color = list(selected.keys())[0]
                for sel_color in selected:
                    d = color_distance(color, sel_color)
                    if d < best_dist:
                        best_dist = d
                        best_color = sel_color
                selected[best_color] = np.maximum(selected[best_color], mask)

    return selected


def find_closest_pantone(r: int, g: int, b: int) -> tuple[str, str]:
    """Find the closest Pantone color match. Returns (pantone_code, name)."""
    best_dist = float("inf")
    best_name = "Custom"
    best_code = f"#{r:02x}{g:02x}{b:02x}"

    for (pr, pg, pb), name, code in PANTONE_TABLE:
        dist = math.sqrt((r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2)
        if dist < best_dist:
            best_dist = dist
            best_name = name
            best_code = code

    return best_code, best_name


def quantize_colors(image: Image.Image, num_colors: int) -> Image.Image:
    """Reduce image to a limited color palette."""
    return image.quantize(colors=num_colors, method=Image.Quantize.MEDIANCUT).convert("RGB")


def color_distance(c1: tuple, c2: tuple) -> float:
    """Euclidean RGB distance."""
    return math.sqrt(sum((a - b) ** 2 for a, b in zip(c1, c2)))


def merge_similar_colors(
    layers: dict[tuple, np.ndarray], threshold: float = 35.0
) -> dict[tuple, np.ndarray]:
    """Merge similar colors, larger regions absorb smaller ones."""
    colors = sorted(layers.keys(), key=lambda c: int(np.sum(layers[c])), reverse=True)
    merged = {}
    color_map = {}

    for color in colors:
        found = False
        for rep in merged:
            if color_distance(color, rep) < threshold:
                color_map[color] = rep
                found = True
                break
        if not found:
            color_map[color] = color
            merged[color] = np.zeros_like(layers[color])

    for color, mask in layers.items():
        rep = color_map[color]
        merged[rep] = np.maximum(merged[rep], mask)

    return merged


def clean_mask(mask: np.ndarray) -> np.ndarray:
    """Morphological cleanup for clean enamel fill regions."""
    img = Image.fromarray((mask * 255).astype(np.uint8), mode="L")
    img = img.filter(ImageFilter.MaxFilter(3))
    img = img.filter(ImageFilter.MinFilter(3))
    img = img.filter(ImageFilter.MinFilter(3))
    img = img.filter(ImageFilter.MaxFilter(3))
    return (np.array(img) > 127).astype(np.uint8)


def find_borders(layers: dict, width: int, height: int, border_width: float = 1.5) -> np.ndarray:
    """Find borders between color regions."""
    label_map = np.zeros((height, width), dtype=np.int32)
    for i, (color, mask) in enumerate(layers.items(), 1):
        label_map[mask == 1] = i

    border = np.zeros((height, width), dtype=np.uint8)
    border[:-1, :] |= (label_map[:-1, :] != label_map[1:, :]).astype(np.uint8)
    border[1:, :] |= (label_map[:-1, :] != label_map[1:, :]).astype(np.uint8)
    border[:, :-1] |= (label_map[:, :-1] != label_map[:, 1:]).astype(np.uint8)
    border[:, 1:] |= (label_map[:, :-1] != label_map[:, 1:]).astype(np.uint8)

    if border_width > 1:
        border_img = Image.fromarray(border * 255, mode="L")
        for _ in range(max(1, int(border_width))):
            border_img = border_img.filter(ImageFilter.MaxFilter(3))
        border = (np.array(border_img) > 127).astype(np.uint8)

    return border


def extract_print_layer(
    image: Image.Image, base_layers: dict[tuple, np.ndarray]
) -> tuple[np.ndarray | None, tuple | None]:
    """
    Extract fine detail that should be screen-printed rather than enameled.
    Looks for small, detailed patterns (like china floral prints) that are
    too fine for enamel and need to be printed on top of a base color.

    Returns (print_mask, print_color) or (None, None) if no print layer found.
    """
    arr = np.array(image)
    h, w, _ = arr.shape

    # Find the "detail" layer: colors with lots of small disconnected regions
    # These are patterns that should be printed, not enameled
    best_detail_score = 0
    best_detail_color = None
    best_detail_mask = None

    for color, mask in base_layers.items():
        pixel_count = int(np.sum(mask))
        if pixel_count < 100 or pixel_count > (h * w * 0.4):
            continue

        # Skip whites/near-whites and very light colors — these are enamel base, not print
        r, g, b = color
        brightness = (r * 299 + g * 587 + b * 114) / 1000
        saturation = max(r, g, b) - min(r, g, b)
        if brightness > 200 and saturation < 50:
            continue  # Skip white/cream — never a print layer

        # Count transitions (edges) - detailed patterns have many
        h_transitions = np.sum(np.abs(np.diff(mask.astype(np.int8), axis=1)))
        v_transitions = np.sum(np.abs(np.diff(mask.astype(np.int8), axis=0)))
        total_transitions = int(h_transitions + v_transitions)

        # Detail score: transitions per pixel (higher = more fragmented/detailed)
        detail_score = total_transitions / max(pixel_count, 1)

        if detail_score > best_detail_score and detail_score > 0.5:
            best_detail_score = detail_score
            best_detail_color = color
            best_detail_mask = mask

    if best_detail_mask is not None:
        return best_detail_mask, best_detail_color

    return None, None


def merge_horizontal_runs(mask: np.ndarray) -> list[str]:
    """Merge pixel runs into rectangles for compact SVG."""
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


def build_spec_sheet(
    width: int,
    height: int,
    layers: dict[tuple, np.ndarray],
    print_mask: np.ndarray | None,
    print_color: tuple | None,
    metal: str,
    pin_width_mm: float,
    border_width: float,
) -> str:
    """
    Build a full manufacturing spec sheet SVG matching factory format.

    Layout:
      [Enamel View]  [With Print]  [Silhouette/Back]
      [Print Detail]  [Color Legend]
    """
    metal_raised, metal_recessed = METAL_COLORS.get(metal, METAL_COLORS["gold"])

    # Calculate physical dimensions
    aspect = height / width
    pin_height_mm = pin_width_mm * aspect
    px_per_mm = width / pin_width_mm

    total_pixels = width * height
    sorted_layers = sorted(layers.items(), key=lambda x: int(np.sum(x[1])), reverse=True)

    # Find borders
    print("  Computing metal divider lines...")
    borders = find_borders(layers, width, height, border_width)

    # Create combined silhouette (union of all layers)
    silhouette = np.zeros((height, width), dtype=np.uint8)
    for _, mask in layers.items():
        silhouette = np.maximum(silhouette, mask)

    # Spec sheet layout: 2 views across top, detail + legend below
    margin = 40
    spacing = 60
    view_w = width
    view_h = height
    sheet_w = margin + view_w * 2 + spacing + margin
    # Bottom section for print detail and legend
    legend_h = max(200, len(sorted_layers) * 28 + 80)
    sheet_h = margin + view_h + spacing + legend_h + margin

    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        f'<svg xmlns="http://www.w3.org/2000/svg"',
        f'     xmlns:i="http://ns.adobe.com/AdobeIllustrator/10.0/"',
        f'     viewBox="0 0 {sheet_w} {sheet_h}"',
        f'     width="{sheet_w}" height="{sheet_h}">',
        '',
        '  <style>',
        '    text { font-family: Arial, Helvetica, sans-serif; }',
        '    .dim { font-size: 12px; fill: #cc0000; }',
        '    .label { font-size: 11px; fill: #333; }',
        '    .title { font-size: 14px; fill: #333; font-weight: bold; }',
        '    .legend-text { font-size: 10px; fill: #333; }',
        '  </style>',
        '',
        f'  <!-- Sheet background -->',
        f'  <rect width="{sheet_w}" height="{sheet_h}" fill="white"/>',
        '',
    ]

    # =========================================
    # VIEW 1: Enamel fills only (no print)
    # =========================================
    v1_x = margin
    v1_y = margin + 20

    lines.append(f'  <!-- VIEW 1: Enamel fills -->')
    lines.append(f'  <text x="{v1_x + view_w / 2}" y="{v1_y - 6}" text-anchor="middle" class="title">Enamel Fills</text>')
    lines.append(f'  <g id="View 1 - Enamel Fills" i:layer="yes" transform="translate({v1_x},{v1_y})">')

    # Metal base for pin shape
    silhouette_paths = merge_horizontal_runs(silhouette)
    if silhouette_paths:
        lines.append(f'    <path d="{" ".join(silhouette_paths)}" fill="{metal_raised}"/>')

    # Enamel fills
    for idx, (clr, mask) in enumerate(sorted_layers):
        fill_mask = mask.copy()
        fill_mask[borders == 1] = 0
        hex_color = f"#{clr[0]:02x}{clr[1]:02x}{clr[2]:02x}"
        rect_paths = merge_horizontal_runs(fill_mask)
        if rect_paths:
            lines.append(f'    <path d="{" ".join(rect_paths)}" fill="{hex_color}"/>')

    # Metal borders
    border_paths = merge_horizontal_runs(borders)
    if border_paths:
        lines.append(f'    <path d="{" ".join(border_paths)}" fill="{metal_raised}"/>')

    lines.append('  </g>')

    # Dimension lines for View 1
    dim_y_top = v1_y - 5
    dim_y_bot = v1_y + view_h + 15
    dim_x_left = v1_x - 15
    dim_x_right = v1_x + view_w + 5

    # Width dimension (bottom)
    lines.append(f'  <line x1="{v1_x}" y1="{dim_y_bot}" x2="{v1_x + view_w}" y2="{dim_y_bot}" stroke="#cc0000" stroke-width="0.5"/>')
    lines.append(f'  <text x="{v1_x + view_w / 2}" y="{dim_y_bot + 14}" text-anchor="middle" class="dim">{pin_width_mm:.2f} mm</text>')

    # Height dimension (left)
    lines.append(f'  <line x1="{dim_x_left}" y1="{v1_y}" x2="{dim_x_left}" y2="{v1_y + view_h}" stroke="#cc0000" stroke-width="0.5"/>')
    lines.append(f'  <text x="{dim_x_left - 2}" y="{v1_y + view_h / 2}" text-anchor="end" class="dim" transform="rotate(-90,{dim_x_left - 2},{v1_y + view_h / 2})">{pin_height_mm:.2f} mm</text>')

    # =========================================
    # VIEW 2: With print layer
    # =========================================
    v2_x = margin + view_w + spacing
    v2_y = v1_y

    lines.append(f'  <!-- VIEW 2: With print layer -->')
    lines.append(f'  <text x="{v2_x + view_w / 2}" y="{v2_y - 6}" text-anchor="middle" class="title">With Print Layer</text>')
    lines.append(f'  <g id="View 2 - With Print" i:layer="yes" transform="translate({v2_x},{v2_y})">')

    # Same as view 1
    if silhouette_paths:
        lines.append(f'    <path d="{" ".join(silhouette_paths)}" fill="{metal_raised}"/>')
    for idx, (clr, mask) in enumerate(sorted_layers):
        fill_mask = mask.copy()
        fill_mask[borders == 1] = 0
        hex_color = f"#{clr[0]:02x}{clr[1]:02x}{clr[2]:02x}"
        rect_paths = merge_horizontal_runs(fill_mask)
        if rect_paths:
            lines.append(f'    <path d="{" ".join(rect_paths)}" fill="{hex_color}"/>')
    if border_paths:
        lines.append(f'    <path d="{" ".join(border_paths)}" fill="{metal_raised}"/>')

    # Print layer on top
    if print_mask is not None and print_color is not None:
        print_hex = f"#{print_color[0]:02x}{print_color[1]:02x}{print_color[2]:02x}"
        print_paths = merge_horizontal_runs(print_mask)
        if print_paths:
            lines.append(f'    <path d="{" ".join(print_paths)}" fill="{print_hex}"/>')

    lines.append('  </g>')

    # Width dimension for view 2
    lines.append(f'  <line x1="{v2_x}" y1="{dim_y_bot}" x2="{v2_x + view_w}" y2="{dim_y_bot}" stroke="#cc0000" stroke-width="0.5"/>')
    lines.append(f'  <text x="{v2_x + view_w / 2}" y="{dim_y_bot + 14}" text-anchor="middle" class="dim">{pin_width_mm:.2f} mm</text>')

    # Cut-out marks removed — not needed for solid pins

    # =========================================
    # BOTTOM: Print detail + Color Legend
    # =========================================
    bottom_y = margin + view_h + spacing + 20

    # Print detail (bottom left) — scaled to fit within bottom section
    if print_mask is not None and print_color is not None:
        print_hex = f"#{print_color[0]:02x}{print_color[1]:02x}{print_color[2]:02x}"
        pantone_code, pantone_name = find_closest_pantone(*print_color)

        # Scale print detail to fit in the available bottom space
        max_detail_h = legend_h - 40  # Leave room for label below
        detail_scale = min(1.0, max_detail_h / view_h)
        detail_scale = min(detail_scale, (view_w * 0.8) / view_w)  # Also limit width

        lines.append(f'  <!-- Print detail layer -->')
        lines.append(f'  <g id="Print Detail" i:layer="yes" transform="translate({margin},{bottom_y}) scale({detail_scale:.3f})">')
        print_detail_paths = merge_horizontal_runs(print_mask)
        if print_detail_paths:
            lines.append(f'    <path d="{" ".join(print_detail_paths)}" fill="{print_hex}"/>')
        lines.append('  </g>')

        # Print label (below scaled detail)
        label_y = bottom_y + int(view_h * detail_scale) + 10
        lines.append(f'  <rect x="{margin}" y="{label_y}" width="16" height="12" fill="{print_hex}"/>')
        lines.append(f'  <text x="{margin + 22}" y="{label_y + 10}" class="legend-text">print {pantone_code}</text>')

    # Color Legend (center-right area)
    legend_x = margin + view_w + spacing
    legend_y = bottom_y

    lines.append(f'  <!-- Color Legend -->')
    lines.append(f'  <g id="Color Legend" i:layer="yes">')

    row = 0
    # Metal entries
    lines.append(f'    <rect x="{legend_x}" y="{legend_y + row * 24}" width="40" height="16" fill="{metal_raised}" stroke="#999" stroke-width="0.5"/>')
    lines.append(f'    <text x="{legend_x + 48}" y="{legend_y + row * 24 + 12}" class="legend-text">raised metal  Imitation {metal}</text>')
    row += 1

    lines.append(f'    <rect x="{legend_x}" y="{legend_y + row * 24}" width="40" height="16" fill="{metal_recessed}" stroke="#999" stroke-width="0.5"/>')
    lines.append(f'    <text x="{legend_x + 48}" y="{legend_y + row * 24 + 12}" class="legend-text">recessed metal</text>')
    row += 1

    # Enamel fill entries
    for clr, mask in sorted_layers:
        pixel_count = int(np.sum(mask))
        if pixel_count < 10:
            continue
        hex_color = f"#{clr[0]:02x}{clr[1]:02x}{clr[2]:02x}"
        pantone_code, pantone_name = find_closest_pantone(*clr)

        # Skip print color from legend (it's listed separately)
        if print_color and color_distance(clr, print_color) < 30:
            continue

        lines.append(f'    <rect x="{legend_x}" y="{legend_y + row * 24}" width="40" height="16" fill="{hex_color}" stroke="#999" stroke-width="0.5"/>')
        lines.append(f'    <text x="{legend_x + 48}" y="{legend_y + row * 24 + 12}" class="legend-text">{pantone_name.lower()}  {pantone_code}</text>')
        row += 1

    lines.append('  </g>')
    lines.append('</svg>')

    return '\n'.join(lines) + '\n'


def vectorize_enamel(
    image_path: str,
    output_path: str | None = None,
    num_colors: int = 5,
    max_dimension: int = 512,
    metal: str = "gold",
    border_width: float = 0.8,
    merge_threshold: float = 35.0,
    pin_width_mm: float = 44.0,
    print_color_hint: str | None = None,
) -> str:
    """Enamel pin manufacturing spec sheet pipeline."""
    if not os.path.isfile(image_path):
        print(f"Error: File not found: {image_path}", file=sys.stderr)
        sys.exit(1)

    if output_path is None:
        base, _ = os.path.splitext(image_path)
        output_path = base + "_enamel_spec.svg"

    img = Image.open(image_path).convert("RGB")
    orig_w, orig_h = img.size

    if max(orig_w, orig_h) > max_dimension:
        scale = max_dimension / max(orig_w, orig_h)
        new_w = int(orig_w * scale)
        new_h = int(orig_h * scale)
        img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
        print(f"Resized {orig_w}x{orig_h} -> {new_w}x{new_h}")

    w, h = img.size

    # Step 0: Preprocess image for clean color extraction
    print("Step 0: Simplifying image (flatten shading, posterize, boost color)...")
    img = preprocess_image(img)

    # Step 1: Initial quantization
    initial_colors = min(num_colors * 6, 48)
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

    # Step 2: Extract print layer
    print_mask = None
    print_color = None

    if print_color_hint:
        # User specified which color is the print layer
        print(f"Step 2: Using specified print color: {print_color_hint}")
        # Map color names to hue ranges
        hue_map = {
            "blue": (180, 260), "red": (330, 30), "green": (90, 150),
            "purple": (260, 330), "orange": (15, 45), "yellow": (45, 75),
        }
        hint = print_color_hint.lower().strip()

        if hint in hue_map:
            hue_lo, hue_hi = hue_map[hint]
            # Find all layers matching this hue and combine them
            matching_masks = []
            matching_color = None
            best_area = 0
            for clr, mask in list(layers.items()):
                r, g, b = clr
                sat = max(r, g, b) - min(r, g, b)
                if sat < 20:
                    continue  # skip grays
                h_val, _, _ = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
                hue_deg = h_val * 360
                # Handle wrap-around for red
                if hue_lo > hue_hi:
                    in_range = hue_deg >= hue_lo or hue_deg < hue_hi
                else:
                    in_range = hue_lo <= hue_deg < hue_hi
                if in_range:
                    matching_masks.append(mask)
                    area = int(np.sum(mask))
                    if area > best_area:
                        best_area = area
                        matching_color = clr

            if matching_masks:
                # Combine all matching color masks into one print layer
                print_mask = matching_masks[0]
                for m in matching_masks[1:]:
                    print_mask = np.maximum(print_mask, m)
                print_color = matching_color
                pantone_code, pantone_name = find_closest_pantone(*print_color)
                print(f"  Print layer: #{print_color[0]:02x}{print_color[1]:02x}{print_color[2]:02x} ({pantone_name}, {pantone_code})")
                # Remove matching colors from enamel layers
                colors_to_remove = [clr for clr in layers
                                    if any(np.array_equal(layers[clr], m) for m in matching_masks)
                                    or color_distance(clr, print_color) < merge_threshold]
                for clr in set(colors_to_remove):
                    if clr in layers:
                        del layers[clr]
            else:
                print(f"  Warning: No {hint} colors found, skipping print layer")
        else:
            print(f"  Warning: Unknown color '{hint}', use: blue, red, green, purple, orange, yellow")
    else:
        # Auto-detect
        print("Step 2: Auto-detecting print layer (fine detail patterns)...")
        print_mask, print_color = extract_print_layer(img, layers)
        if print_color is not None:
            pantone_code, pantone_name = find_closest_pantone(*print_color)
            print(f"  Detected print layer: #{print_color[0]:02x}{print_color[1]:02x}{print_color[2]:02x} ({pantone_name}, {pantone_code})")
            colors_to_remove = []
            for clr in layers:
                if color_distance(clr, print_color) < merge_threshold:
                    colors_to_remove.append(clr)
            for clr in colors_to_remove:
                del layers[clr]
        else:
            print("  No distinct print layer detected")

    # Step 3: Merge similar colors
    print(f"Step 3: Merging similar colors (threshold={merge_threshold})...")
    merged = merge_similar_colors(layers, threshold=merge_threshold)
    print(f"  Reduced to {len(merged)} colors")

    # Step 4: Select colors ensuring hue diversity (not just 5 golds)
    if len(merged) > num_colors:
        print(f"Step 4: Selecting {num_colors} colors with hue diversity...")
        merged = select_colors_by_hue(merged, num_colors)

    # Step 4b: Final dedup — merge any remaining near-duplicate colors
    # (e.g., two yellows that slipped through hue selection)
    if len(merged) > 2:
        merged = merge_similar_colors(merged, threshold=60.0)
        if len(merged) < num_colors:
            print(f"  Deduped to {len(merged)} distinct colors")

    # Step 5: Clean masks
    print(f"Step 5: Cleaning up {len(merged)} enamel fill regions...")
    cleaned = {}
    for clr, mask in merged.items():
        cleaned[clr] = clean_mask(mask)

    # Print color summary
    print(f"\nEnamel fills:")
    total_pixels = w * h
    for i, (clr, mask) in enumerate(
        sorted(cleaned.items(), key=lambda x: int(np.sum(x[1])), reverse=True), 1
    ):
        pcount = int(np.sum(mask))
        pct = pcount / total_pixels * 100
        hex_c = f"#{clr[0]:02x}{clr[1]:02x}{clr[2]:02x}"
        pantone_code, pantone_name = find_closest_pantone(*clr)
        print(f"  Fill {i}: {hex_c} -> {pantone_code} ({pantone_name}) {pct:.1f}%")

    # Step 6: Build spec sheet
    print(f"\nStep 6: Building spec sheet...")
    content = build_spec_sheet(
        w, h, cleaned, print_mask, print_color,
        metal, pin_width_mm, border_width,
    )

    with open(output_path, "w", encoding="utf-8") as f:
        f.write(content)

    file_size = os.path.getsize(output_path)
    pin_height_mm = pin_width_mm * (h / w)
    print(f"\nSpec sheet written to: {output_path} ({file_size:,} bytes)")
    print(f"\nManufacturing summary:")
    print(f"  Pin size: {pin_width_mm:.1f} x {pin_height_mm:.1f} mm")
    print(f"  Metal: Imitation {metal}")
    print(f"  Enamel fills: {len(cleaned)}")
    if print_color:
        pc, pn = find_closest_pantone(*print_color)
        print(f"  Print layer: {pc} ({pn})")

    return output_path


def main():
    parser = argparse.ArgumentParser(
        description="Generate enamel pin factory spec sheets from images (The Final Stitch).",
        epilog="Examples:\n"
        "  python3 vectorize_pin_enamel.py photo.png\n"
        "  python3 vectorize_pin_enamel.py photo.png -c 5 --size 44\n"
        "  python3 vectorize_pin_enamel.py photo.png --metal silver --magnets 2\n"
        "\n"
        "Metal: gold (default), silver, black, rose-gold, gunmetal\n",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("image", help="Path to input image")
    parser.add_argument("-o", "--output", help="Output SVG spec sheet path")
    parser.add_argument(
        "-c", "--colors", type=int, default=5,
        help="Number of enamel fill colors, not counting print (default: 5)",
    )
    parser.add_argument(
        "--metal", default="gold",
        help="Metal type: gold, silver, black, rose-gold, gunmetal (default: gold)",
    )
    parser.add_argument(
        "--size", type=float, default=44.0,
        help="Pin width in millimeters (default: 44.0)",
    )
    parser.add_argument(
        "--print-color", default=None,
        help="Color of the print layer: blue, red, green, purple, orange, yellow (default: auto-detect)",
    )
    parser.add_argument(
        "--border-width", type=float, default=0.8,
        help="Metal border line width in pixels (default: 0.8)",
    )
    parser.add_argument(
        "--merge-threshold", type=float, default=35.0,
        help="Color similarity merge threshold (default: 35)",
    )
    parser.add_argument(
        "--max-res", type=int, default=512,
        help="Max image dimension for processing (default: 512)",
    )

    args = parser.parse_args()

    if args.colors < 2:
        parser.error("Colors must be at least 2")

    vectorize_enamel(
        image_path=args.image,
        output_path=args.output,
        num_colors=args.colors,
        max_dimension=args.max_res,
        metal=args.metal,
        border_width=args.border_width,
        merge_threshold=args.merge_threshold,
        pin_width_mm=args.size,
        print_color_hint=args.print_color,
    )


if __name__ == "__main__":
    main()
