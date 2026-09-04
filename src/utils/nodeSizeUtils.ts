import { BASE_NODE_HEIGHT, SHAPE_ASPECT_RATIOS } from '../config/mindmapConfig';
import type { NodeShape } from '../types/mindmap';

/**
 * ノードのスカラーサイズと形状から、実際の幅と高さを計算する
 */
export const calculateNodeDimensions = (
  size: number = 1.0,
  shape: NodeShape = 'rounded_rectangle'
) => {
  const aspectRatio = SHAPE_ASPECT_RATIOS[shape] ?? 2.5;
  const height = Math.round(BASE_NODE_HEIGHT * size / Math.sqrt(1 + aspectRatio**2));
  const width = Math.round(height * aspectRatio);

  return { width, height };
};