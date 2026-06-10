import type { WikiNode, WikiLink } from '../../types/wiki';

export function formatLabel(label: string | undefined | null): string {
  if (!label) return '';
  return label.length > 15 ? `${label.slice(0, 14)}...` : label;
}

export function getDeterministicRandom(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs((Math.sin(hash) * 10000) % 1);
}

export function getNodeRadiusY(node: WikiNode | undefined | null): number {
  if (!node) return 34;
  const rand = getDeterministicRandom(node.id);
  return Math.round(26 + rand * 16);
}

export function getEllipseRadiusX(label: string | undefined | null): number {
  if (!label) return 48;
  const formatted = formatLabel(label);
  let length = 0;
  for (let i = 0; i < formatted.length; i++) {
    const code = formatted.charCodeAt(i);
    if (code > 127) {
      length += 1.8;
    } else {
      length += 1.0;
    }
  }
  return Math.max(48, length * 5.5 + 18);
}

export function getNodeRadiusX(node: WikiNode | undefined | null): number {
  if (!node) return 48;
  const baseRx = getEllipseRadiusX(node.label);
  const rand = getDeterministicRandom(node.id);
  const randomScale = 0.85 + rand * 0.40;
  return Math.round(baseRx * randomScale);
}

export function getLinkPath(
  link: WikiLink,
  nodes: WikiNode[],
  layoutMode: 'hierarchical' | 'radial'
): string {
  const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
  const targetId = typeof link.target === 'string' ? link.target : link.target.id;

  const source = nodes.find((n) => n.id === sourceId);
  const target = nodes.find((n) => n.id === targetId);

  if (!source || !target) {
    return '';
  }

  const px = source.x ?? 0;
  const py = source.y ?? 0;
  const cx = target.x ?? 0;
  const cy = target.y ?? 0;

  const sourceRx = getNodeRadiusX(source);
  const sourceRy = getNodeRadiusY(source);
  const targetRx = getNodeRadiusX(target);
  const targetRy = getNodeRadiusY(target);

  if (layoutMode === 'hierarchical') {
    const midY = (py + cy) / 2;
    const arrowCompensation = 7;
    const targetYOffset = cy > midY ? -(targetRy + arrowCompensation) : targetRy + arrowCompensation;
    return `M ${px} ${py} L ${px} ${midY} L ${cx} ${midY} L ${cx} ${cy + targetYOffset}`;
  } else {
    const dx = cx - px;
    const dy = cy - py;
    const dist = Math.hypot(dx, dy);
    if (dist === 0) {
      return `M ${px} ${py} L ${cx} ${cy}`;
    }

    const tSource = 1 / Math.sqrt((dx * dx) / (sourceRx * sourceRx) + (dy * dy) / (sourceRy * sourceRy));
    const sourceRadius = tSource * dist;

    const tTarget = 1 / Math.sqrt((dx * dx) / (targetRx * targetRx) + (dy * dy) / (targetRy * targetRy));
    const targetRadius = tTarget * dist;

    if (dist < sourceRadius || dist < targetRadius) {
      return `M ${px} ${py} L ${cx} ${cy}`;
    }

    const arrowCompensation = 7;
    const startCompensation = 2;

    const startDist = sourceRadius + startCompensation;
    const endDist = dist - (targetRadius + arrowCompensation);

    if (startDist < endDist) {
      const startX = px + (startDist / dist) * dx;
      const startY = py + (startDist / dist) * dy;
      const endX = px + (endDist / dist) * dx;
      const endY = py + (endDist / dist) * dy;
      return `M ${startX} ${startY} L ${endX} ${endY}`;
    } else {
      const startX = px + tSource * dx;
      const startY = py + tSource * dy;
      const endX = cx - tTarget * dx;
      const endY = cy - tTarget * dy;
      return `M ${startX} ${startY} L ${endX} ${endY}`;
    }
  }
}

export function getNodeClasses(node: WikiNode, selectedNode: WikiNode | null): string {
  const isSelected = selectedNode?.id === node.id;
  let base = 'node-interactive cursor-pointer select-none ';

  if (node.loading) {
    base += 'fill-indigo-50 stroke-indigo-400 stroke-[3px] animate-node-pulse';
  } else if (node.isRoot) {
    base += isSelected
      ? 'fill-indigo-100 stroke-amber-500 stroke-[4px] shadow-lg'
      : 'fill-indigo-50 stroke-indigo-600 stroke-[3.5px]';
  } else if (node.isDeadEnd) {
    base += isSelected
      ? 'fill-slate-100 stroke-slate-500 stroke-[3px] stroke-dasharray-[4,4]'
      : 'fill-slate-50 stroke-slate-400 stroke-[2px] stroke-dasharray-[4,4]';
  } else if (node.loaded) {
    base += isSelected
      ? 'fill-emerald-50 stroke-emerald-600 stroke-[3.5px]'
      : 'fill-emerald-50 stroke-emerald-500 stroke-[2.5px]';
  } else {
    base += isSelected
      ? 'fill-sky-50 stroke-indigo-600 stroke-[3.5px]'
      : 'fill-white stroke-indigo-400 stroke-[2px] hover:stroke-indigo-600';
  }

  return base;
}
