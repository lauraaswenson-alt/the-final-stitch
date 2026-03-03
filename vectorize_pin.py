#!/usr/bin/env python3
"""
Enamel Pin PNG to Layered SVG Converter
Converts a flat-color PNG illustration to a layered SVG file
with each color on its own named layer, ready for manufacturer.
"""

import sys
import os
import subprocess


# Install required libraries
def install_requirements():
    packages = ["vtracer", "Pillow", "numpy"]
    for package in packages:
        subprocess.check_call([sys.executable, "-m", "pip", "install", package, "--break-system-packages", "-q"])


install_requirements()

import numpy as np
from PIL import Image
import vtracer


# Target Pantone colors with hex values
PANTONE_COLORS = {
    "Bull_Light_7499C":   (0xF5, 0xE6, 0xB8),
    "Bull_Mid_7508C":     (0xC8, 0x92, 0x2A),
    "Bull_Shadow_7412C":  (0xA0, 0x62, 0x2A),
    "Bull_Outline_7414C": (0x4A, 0x20, 0x10),
    "China_Blue_7683C":   (0x40, 0x60, 0xB8),
    "China_White":        (0xFF, 0xFF, 0xFF),
    "Background_427C":    (0xF0, 0xED, 0xE8),
    "Border_141C":        (0xC8, 0xA0, 0x20),
}

TOLERANCE = 40  # Color matching tolerance (0-255)


def hex_to_rgb(hex_color):
    h = hex_color.lstrip('#')
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))


def color_distance(c1, c2):
    return sum((int(a) - int(b)) ** 2 for a, b in zip(c1, c2)) ** 0.5


def snap_to_palette(img_array):
    """Snap each pixel to the nearest Pantone color."""
    palette = list(PANTONE_COLORS.values())
    names = list(PANTONE_COLORS.keys())

    h, w, _ = img_array.shape
    snapped = np.zeros_like(img_array)

    for y in range(h):
        for x in range(w):
            pixel = tuple(img_array[y, x, :3])
            distances = [color_distance(pixel, c) for c in palette]
            nearest_idx = np.argmin(distances)
            snapped[y, x, :3] = palette[nearest_idx]
            if img_array.shape[2] == 4:
                snapped[y, x, 3] = img_array[y, x, 3]

    return snapped, names, palette


def create_color_mask(img_array, target_color, tolerance=TOLERANCE):
    """Create a binary mask for pixels matching target color."""
    diff = np.abs(img_array[:, :, :3].astype(int) - np.array(target_color))
    mask = np.all(diff <= tolerance, axis=2)
    return mask


def mask_to_png(mask, output_path):
    """Save a binary mask as a black-and-white PNG."""
    h, w = mask.shape
    img = Image.new("RGB", (w, h), "white")
    pixels = img.load()
    for y in range(h):
        for x in range(w):
            if mask[y, x]:
                pixels[x, y] = (0, 0, 0)
    img.save(output_path)


def png_to_svg_path(png_path):
    """Use vtracer to convert a BW PNG to SVG paths."""
    svg_path = png_path.replace(".png", ".svg")
    vtracer.convert_image_to_svg_py(
        png_path,
        svg_path,
        colormode="binary",
        hierarchical="cutout",
        mode="spline",
        filter_speckle=4,
        color_precision=6,
        layer_difference=16,
        corner_threshold=60,
        length_threshold=4.0,
        max_iterations=10,
        splice_threshold=45,
        path_precision=3
    )
    with open(svg_path, "r") as f:
        content = f.read()
    os.remove(svg_path)
    return content


def extract_paths_from_svg(svg_content, color_hex, layer_name):
    """Extract path elements and wrap in a named layer."""
    import re
    paths = re.findall(r'<path[^>]*d="[^"]*"[^>]*/>', svg_content)

    if not paths:
        return ""

    # Replace fill colors with our target color
    layer_paths = []
    for path in paths:
        # Remove existing fill, set to our color
        path = re.sub(r'fill="[^"]*"', f'fill="{color_hex}"', path)
        if 'fill=' not in path:
            path = path.replace('<path', f'<path fill="{color_hex}"')
        # Remove white/background fills (those are the negative space)
        if 'fill="#ffffff"' in path.lower() or 'fill="white"' in path.lower():
            continue
        layer_paths.append(path)

    if not layer_paths:
        return ""

    paths_str = "\n    ".join(layer_paths)
    return f'''  <g
 id="{layer_name}"
 inkscape:label="{layer_name}"
 inkscape:groupmode="layer">
    {paths_str}
  </g>'''


def build_layered_svg(layers_content, width, height):
    """Assemble all layers into a single SVG file."""
    header = f'''<?xml version="1.0" encoding="UTF-8"?>
<svg
  xmlns="http://www.w3.org/2000/svg"
  xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"
  width="{width}px"
  height="{height}px"
  viewBox="0 0 {width} {height}"
  version="1.1">

  <title>Bull in a China Shop - Enamel Pin Production File</title>
  <desc>
    Layered SVG for hard enamel pin production.
    Each layer corresponds to one Pantone color.
    Layers (bottom to top): Background, China White, Bull Light, Bull Mid, Bull Shadow, China Blue, Border, Bull Outline
  </desc>
'''
    footer = "\n</svg>"
    return header + "\n".join(layers_content) + footer


def main():
    if len(sys.argv) < 2:
        print("Usage: python vectorize_pin.py <input.png>")
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = "bull_in_china_shop_vector.svg"
    temp_dir = "/tmp/pin_layers"
    os.makedirs(temp_dir, exist_ok=True)

    print(f"Loading image: {input_path}")
    img = Image.open(input_path).convert("RGBA")
    width, height = img.size
    img_array = np.array(img)

    print("Snapping colors to Pantone palette...")
    snapped_array, color_names, palette = snap_to_palette(img_array)

    # Process layers in order (back to front)
    layer_order = [
        "Background_427C",
        "China_White",
        "Bull_Light_7499C",
        "Bull_Mid_7508C",
        "Bull_Shadow_7412C",
        "China_Blue_7683C",
        "Border_141C",
        "Bull_Outline_7414C",
    ]

    # Map layer names to hex colors for SVG fill
    color_hex_map = {
        "Bull_Light_7499C":   "#F5E6B8",
        "Bull_Mid_7508C":     "#C8922A",
        "Bull_Shadow_7412C":  "#A0622A",
        "Bull_Outline_7414C": "#4A2010",
        "China_Blue_7683C":   "#4060B8",
        "China_White":        "#FFFFFF",
        "Background_427C":    "#F0EDE8",
        "Border_141C":        "#C8A020",
    }

    pantone_label_map = {
        "Bull_Light_7499C":   "Bull Light (Pantone 7499C)",
        "Bull_Mid_7508C":     "Bull Mid (Pantone 7508C)",
        "Bull_Shadow_7412C":  "Bull Shadow (Pantone 7412C)",
        "Bull_Outline_7414C": "Bull Outline (Pantone 7414C)",
        "China_Blue_7683C":   "China Blue (Pantone 7683C)",
        "China_White":        "China White",
        "Background_427C":    "Background (Pantone 427C)",
        "Border_141C":        "Border (Pantone 141C)",
    }

    layers_svg = []

    for layer_name in layer_order:
        target_rgb = PANTONE_COLORS[layer_name]
        color_hex = color_hex_map[layer_name]
        label = pantone_label_map[layer_name]

        print(f"Processing layer: {label}")

        mask = create_color_mask(snapped_array, target_rgb)
        if not mask.any():
            print(f"  No pixels found for {label}, skipping.")
            continue

        # Save mask as temp PNG
        temp_png = os.path.join(temp_dir, f"{layer_name}.png")
        mask_to_png(mask, temp_png)

        # Vectorize
        try:
            svg_content = png_to_svg_path(temp_png)
            layer_svg = extract_paths_from_svg(svg_content, color_hex, label)
            if layer_svg:
                layers_svg.append(layer_svg)
                print(f"  Done: {label}")
            else:
                print(f"  No paths extracted for {label}")
        except Exception as e:
            print(f"  Error processing {label}: {e}")
        finally:
            if os.path.exists(temp_png):
                os.remove(temp_png)

    print("Assembling final SVG...")
    final_svg = build_layered_svg(layers_svg, width, height)

    with open(output_path, "w") as f:
        f.write(final_svg)

    print(f"\nDone! Output saved to: {output_path}")
    print(f"Open in Inkscape to review layers and clean up paths before sending to manufacturer.")


if __name__ == "__main__":
    main()
