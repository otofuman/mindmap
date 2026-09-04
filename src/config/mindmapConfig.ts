import type { NodeShape } from '../types/mindmap';

// 形状（NodeShape）に応じた縦横比 (width / height の比率など)
export const SHAPE_ASPECT_RATIOS: Record<NodeShape, number> = {
  rectangle: 2.5,
  rounded_rectangle: 2.5,
  circle: 1.0,    // 正円の場合は 1:1
  pill: 3.0,
  diamond: 1.2,
};

// サイズスカラーの基準値（例: スケール1.0のときの基準の高さ、または面積係数など）
export const BASE_NODE_HEIGHT = 200;