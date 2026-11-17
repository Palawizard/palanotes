export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

// Worst aspect ratio of a row of areas laid along a side (Bruls, Huizing, van Wijk).
function worst(row: number[], side: number): number {
  const sum = row.reduce((total, area) => total + area, 0);
  const max = Math.max(...row);
  const min = Math.min(...row);
  return Math.max((side * side * max) / (sum * sum), (sum * sum) / (side * side * min));
}

// Squarified treemap: one rectangle per value, its area proportional to the value, kept as
// close to a square as the order allows. Values must be positive and sorted largest first.
export function squarify(values: readonly number[], width: number, height: number): Rect[] {
  const total = values.reduce((sum, value) => sum + value, 0);
  if (total <= 0 || width <= 0 || height <= 0)
    return values.map(() => ({ x: 0, y: 0, w: 0, h: 0 }));
  const areas = values.map((value) => (value * width * height) / total);
  const rects: Rect[] = [];
  let x = 0;
  let y = 0;
  let w = width;
  let h = height;
  let index = 0;
  while (index < areas.length) {
    const side = Math.min(w, h);
    const row = [areas[index] as number];
    let next = index + 1;
    while (
      next < areas.length &&
      worst([...row, areas[next] as number], side) <= worst(row, side)
    ) {
      row.push(areas[next] as number);
      next += 1;
    }
    const sum = row.reduce((total, area) => total + area, 0);
    if (w >= h) {
      const columnWidth = sum / h;
      let top = y;
      for (const area of row) {
        rects.push({ x, y: top, w: columnWidth, h: area / columnWidth });
        top += area / columnWidth;
      }
      x += columnWidth;
      w -= columnWidth;
    } else {
      const rowHeight = sum / w;
      let left = x;
      for (const area of row) {
        rects.push({ x: left, y, w: area / rowHeight, h: rowHeight });
        left += area / rowHeight;
      }
      y += rowHeight;
      h -= rowHeight;
    }
    index = next;
  }
  return rects;
}
