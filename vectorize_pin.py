#!/usr/bin/env python3
"""
vectorize_pin.py — Convert raster images (PNG/JPG/WebP) to SVG vector graphics.

Built for The Final Stitch needlepoint finishing tracker. Converts canvas photos
into clean, scalable SVG files suitable for display at any resolution.

Usage:
    python3 vectorize_pin.py <image_path> [--output <output.svg>] [--colors <n>]
                                          [--threshold <0-255>] [--smooth]

Examples:
    python3 vectorize_pin.py your_image.png
    python3 vectorize_pin.py canvas.jpg --output canvas.svg --colors 8
    python3 vectorize_pin.py photo.webp --threshold 128 --smooth
"""

import argparse
import math
import os
import sys
from collections import defaultdict
from xml.etree.ElementTree import Element, SubElement, tostring

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
    h, w, _ = arr.shape
    pixels = arr.reshape(-1, 3)
    unique_colors = np.unique(pixels, axis=0)

    layers = {}
    for color in unique_colors:
        r, g, b = int(color[0]), int(color[1]), int(color[2])
        mask = np.all(arr == color, axis=2).astype(np.uint8)
        layers[(r, g, b)] = mask

    return layers


def trace_contours(mask: np.ndarray) -> list[list[tuple[int, int]]]:
    """
    Trace contours of a binary mask using a simple boundary-following algorithm.
    Returns a list of contour paths (each path is a list of (x, y) coordinates).
    """
    h, w = mask.shape
    visited = np.zeros_like(mask, dtype=bool)
    contours = []

    # Pad the mask to handle edges cleanly
    padded = np.pad(mask, 1, mode="constant", constant_values=0)

    for y in range(1, h + 1):
        for x in range(1, w + 1):
            if padded[y, x] == 1 and not visited[y - 1, x - 1]:
                # Check if this is a boundary pixel (has at least one 0-neighbor)
                is_boundary = False
                for dy, dx in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                    if padded[y + dy, x + dx] == 0:
                        is_boundary = True
                        break

                if not is_boundary:
                    visited[y - 1, x - 1] = True
                    continue

                # Trace the boundary using Moore neighborhood tracing
                contour = _trace_boundary(padded, visited, x, y, w, h)
                if len(contour) >= 3:
                    contours.append(contour)

    return contours


def _trace_boundary(
    padded: np.ndarray,
    visited: np.ndarray,
    start_x: int,
    start_y: int,
    w: int,
    h: int,
) -> list[tuple[int, int]]:
    """Trace a single boundary contour using Moore neighborhood tracing."""
    # 8-connected Moore neighborhood (clockwise from top-left)
    directions = [(-1, -1), (-1, 0), (-1, 1), (0, 1), (1, 1), (1, 0), (1, -1), (0, -1)]

    contour = [(start_x - 1, start_y - 1)]
    visited[start_y - 1, start_x - 1] = True

    cx, cy = start_x, start_y
    # Start searching from the left neighbor
    search_dir = 7  # (0, -1) direction

    max_steps = w * h * 2  # Safety limit
    steps = 0

    while steps < max_steps:
        steps += 1
        found = False

        for i in range(8):
            idx = (search_dir + i) % 8
            dy, dx = directions[idx]
            nx, ny = cx + dx, cy + dy

            if padded[ny, nx] == 1:
                if nx == start_x and ny == start_y and len(contour) > 2:
                    return contour

                if 0 <= nx - 1 < w and 0 <= ny - 1 < h:
                    if not visited[ny - 1, nx - 1]:
                        contour.append((nx - 1, ny - 1))
                        visited[ny - 1, nx - 1] = True

                cx, cy = nx, ny
                # Set search direction to look back from where we came
                search_dir = (idx + 5) % 8
                found = True
                break

        if not found:
            break

    return contour


def simplify_path(
    points: list[tuple[int, int]], tolerance: float = 1.5
) -> list[tuple[int, int]]:
    """Simplify a path using the Ramer-Douglas-Peucker algorithm."""
    if len(points) < 3:
        return points

    # Find the point farthest from the line between first and last
    start = np.array(points[0], dtype=float)
    end = np.array(points[-1], dtype=float)

    line_vec = end - start
    line_len = np.linalg.norm(line_vec)

    if line_len < 1e-10:
        # All points collapse to roughly the same spot
        max_dist = 0.0
        max_idx = 0
        for i in range(1, len(points) - 1):
            d = np.linalg.norm(np.array(points[i], dtype=float) - start)
            if d > max_dist:
                max_dist = d
                max_idx = i
    else:
        line_unit = line_vec / line_len
        max_dist = 0.0
        max_idx = 0
        for i in range(1, len(points) - 1):
            pt = np.array(points[i], dtype=float)
            proj = np.dot(pt - start, line_unit)
            proj = max(0, min(line_len, proj))
            closest = start + proj * line_unit
            d = np.linalg.norm(pt - closest)
            if d > max_dist:
                max_dist = d
                max_idx = i

    if max_dist > tolerance:
        left = simplify_path(points[: max_idx + 1], tolerance)
        right = simplify_path(points[max_idx:], tolerance)
        return left[:-1] + right
    else:
        return [points[0], points[-1]]


def smooth_path(points: list[tuple[int, int]]) -> list[tuple[float, float]]:
    """Apply simple averaging to smooth jagged pixel-aligned paths."""
    if len(points) < 3:
        return [(float(x), float(y)) for x, y in points]

    smoothed = [(float(points[0][0]), float(points[0][1]))]
    for i in range(1, len(points) - 1):
        x = (points[i - 1][0] + points[i][0] + points[i + 1][0]) / 3.0
        y = (points[i - 1][1] + points[i][1] + points[i + 1][1]) / 3.0
        smoothed.append((x, y))
    smoothed.append((float(points[-1][0]), float(points[-1][1])))
    return smoothed


def path_to_svg_d(points: list[tuple[float, float]], closed: bool = True) -> str:
    """Convert a list of points to an SVG path 'd' attribute string."""
    if not points:
        return ""

    parts = [f"M{points[0][0]:.1f},{points[0][1]:.1f}"]
    for x, y in points[1:]:
        parts.append(f"L{x:.1f},{y:.1f}")
    if closed:
        parts.append("Z")
    return "".join(parts)


def contours_to_rect_paths(
    mask: np.ndarray,
) -> list[tuple[str, int]]:
    """
    Convert a binary mask to SVG rectangle paths for each horizontal run.
    This produces clean output for pixel-art style images. Returns list of
    (svg_d_string, pixel_count) tuples.
    """
    h, w = mask.shape
    paths = []

    for y in range(h):
        x = 0
        while x < w:
            if mask[y, x] == 1:
                run_start = x
                while x < w and mask[y, x] == 1:
                    x += 1
                run_end = x
                run_len = run_end - run_start
                d = f"M{run_start},{y}h{run_len}v1h-{run_len}Z"
                paths.append((d, run_len))
            else:
                x += 1

    return paths


def merge_horizontal_runs(mask: np.ndarray) -> list[str]:
    """
    Merge horizontal runs of pixels into larger rectangular regions
    for more compact SVG output.
    """
    h, w = mask.shape
    used = np.zeros_like(mask, dtype=bool)
    rects = []

    for y in range(h):
        x = 0
        while x < w:
            if mask[y, x] == 1 and not used[y, x]:
                # Find horizontal extent
                x_end = x
                while x_end < w and mask[y, x_end] == 1 and not used[y, x_end]:
                    x_end += 1

                # Try to extend downward
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

                # Mark as used
                used[y:y_end, x:x_end] = True
                rw = x_end - x
                rh = y_end - y
                rects.append(f"M{x},{y}h{rw}v{rh}h-{rw}Z")

                x = x_end
            else:
                x += 1

    return rects


def build_svg(
    width: int,
    height: int,
    layers: dict[tuple[int, int, int], np.ndarray],
    use_smooth: bool = False,
    use_contours: bool = True,
) -> str:
    """Build an SVG document from color layers."""
    svg = Element("svg")
    svg.set("xmlns", "http://www.w3.org/2000/svg")
    svg.set("viewBox", f"0 0 {width} {height}")
    svg.set("width", str(width))
    svg.set("height", str(height))
    svg.set("shape-rendering", "geometricPrecision")

    # Sort layers by pixel count (largest/background first)
    sorted_layers = sorted(layers.items(), key=lambda x: int(np.sum(x[1])), reverse=True)

    # Add background rect with the most common color
    if sorted_layers:
        bg_color, bg_mask = sorted_layers[0]
        bg_total = np.sum(bg_mask)
        if bg_total > (width * height * 0.3):
            rect = SubElement(svg, "rect")
            rect.set("width", str(width))
            rect.set("height", str(height))
            rect.set("fill", f"#{bg_color[0]:02x}{bg_color[1]:02x}{bg_color[2]:02x}")
            sorted_layers = sorted_layers[1:]

    total_layers = len(sorted_layers)
    for idx, (color, mask) in enumerate(sorted_layers, 1):
        pixel_count = np.sum(mask)
        if pixel_count < 4:
            continue

        hex_color = f"#{color[0]:02x}{color[1]:02x}{color[2]:02x}"
        print(f"  Layer {idx}/{total_layers}: {hex_color} ({int(pixel_count)} px)")


        if use_contours:
            contours = trace_contours(mask)
            if not contours:
                # Fallback to rectangles
                rect_paths = merge_horizontal_runs(mask)
                if rect_paths:
                    path_el = SubElement(svg, "path")
                    path_el.set("d", " ".join(rect_paths))
                    path_el.set("fill", hex_color)
                continue

            all_d = []
            for contour in contours:
                simplified = simplify_path(contour, tolerance=1.0)
                if len(simplified) < 3:
                    continue
                if use_smooth:
                    smoothed = smooth_path(simplified)
                    all_d.append(path_to_svg_d(smoothed, closed=True))
                else:
                    float_pts = [(float(x), float(y)) for x, y in simplified]
                    all_d.append(path_to_svg_d(float_pts, closed=True))

            if all_d:
                path_el = SubElement(svg, "path")
                path_el.set("d", " ".join(all_d))
                path_el.set("fill", hex_color)
                path_el.set("fill-rule", "evenodd")
        else:
            rect_paths = merge_horizontal_runs(mask)
            if rect_paths:
                path_el = SubElement(svg, "path")
                path_el.set("d", " ".join(rect_paths))
                path_el.set("fill", hex_color)

    xml_bytes = tostring(svg, encoding="unicode")
    return f'<?xml version="1.0" encoding="UTF-8"?>\n{xml_bytes}\n'


def vectorize(
    image_path: str,
    output_path: str | None = None,
    num_colors: int = 12,
    threshold: int | None = None,
    smooth: bool = False,
    max_dimension: int = 512,
    use_contours: bool = False,
) -> str:
    """
    Main vectorization pipeline.

    Args:
        image_path: Path to input raster image (PNG, JPG, WebP, etc.)
        output_path: Path for output SVG file (default: same name with .svg)
        num_colors: Number of colors in the quantized palette
        threshold: If set, convert to black & white at this threshold (0-255)
        smooth: Apply path smoothing for softer curves
        max_dimension: Scale image down if larger than this (for performance)
        use_contours: Use contour tracing (slower) instead of rectangle merging (fast)

    Returns:
        Path to the generated SVG file.
    """
    if not os.path.isfile(image_path):
        print(f"Error: File not found: {image_path}", file=sys.stderr)
        sys.exit(1)

    if output_path is None:
        base, _ = os.path.splitext(image_path)
        output_path = base + ".svg"

    # Load and optionally resize
    img = Image.open(image_path).convert("RGB")
    orig_w, orig_h = img.size

    if max(orig_w, orig_h) > max_dimension:
        scale = max_dimension / max(orig_w, orig_h)
        new_w = int(orig_w * scale)
        new_h = int(orig_h * scale)
        img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
        print(f"Resized {orig_w}x{orig_h} -> {new_w}x{new_h} for vectorization")

    w, h = img.size

    if threshold is not None:
        # Black & white mode
        gray = img.convert("L")
        arr = np.array(gray)
        bw = (arr > threshold).astype(np.uint8)
        layers = {
            (255, 255, 255): bw,
            (0, 0, 0): 1 - bw,
        }
    else:
        # Color quantization mode
        quantized = quantize_colors(img, num_colors)
        layers = image_to_color_layers(quantized)

    mode = "contour tracing" if use_contours else "rectangle merging"
    print(f"Vectorizing {len(layers)} color layers ({mode})...")
    svg_content = build_svg(w, h, layers, use_smooth=smooth, use_contours=use_contours)

    with open(output_path, "w", encoding="utf-8") as f:
        f.write(svg_content)

    file_size = os.path.getsize(output_path)
    print(f"SVG written to: {output_path} ({file_size:,} bytes)")
    return output_path


def main():
    parser = argparse.ArgumentParser(
        description="Convert raster images to SVG vector graphics for The Final Stitch.",
        epilog="Examples:\n"
        "  python3 vectorize_pin.py photo.png\n"
        "  python3 vectorize_pin.py canvas.jpg --output canvas.svg --colors 8\n"
        "  python3 vectorize_pin.py photo.webp --threshold 128 --smooth\n",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("image", help="Path to input image (PNG, JPG, WebP, etc.)")
    parser.add_argument("-o", "--output", help="Output SVG file path (default: <input>.svg)")
    parser.add_argument(
        "-c",
        "--colors",
        type=int,
        default=12,
        help="Number of colors for quantization (default: 12)",
    )
    parser.add_argument(
        "-t",
        "--threshold",
        type=int,
        default=None,
        help="Black/white threshold 0-255 (disables color mode)",
    )
    parser.add_argument(
        "-s",
        "--smooth",
        action="store_true",
        help="Apply path smoothing for softer curves",
    )
    parser.add_argument(
        "--max-size",
        type=int,
        default=512,
        help="Max image dimension before downscaling (default: 512)",
    )
    parser.add_argument(
        "--contours",
        action="store_true",
        help="Use contour tracing instead of rectangle merging (slower but smoother edges)",
    )

    args = parser.parse_args()

    if args.threshold is not None and not (0 <= args.threshold <= 255):
        parser.error("Threshold must be between 0 and 255")

    if args.colors < 2:
        parser.error("Colors must be at least 2")

    vectorize(
        image_path=args.image,
        output_path=args.output,
        num_colors=args.colors,
        threshold=args.threshold,
        smooth=args.smooth,
        max_dimension=args.max_size,
        use_contours=args.contours,
    )


if __name__ == "__main__":
    main()
