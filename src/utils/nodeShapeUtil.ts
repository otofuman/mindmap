import type { NodeShape } from '../types/mindmap';

// 形状に応じたTailwindの角丸・スタイルクラス
export const getShapeClassName = (shape: NodeShape = 'rounded_rectangle') => {
  switch (shape) {
    case 'rectangle':
      return 'rounded-none';           // 四角
    case 'rounded_rectangle':
      return 'rounded-xl';             // 角丸（デフォルト）
    case 'circle':
      return 'rounded-full aspect-square'; // 円（正円）
    case 'pill':
      return 'rounded-full';           // カプセル型
    case 'diamond':
      return 'rotate-0';               // ひし形にする場合は専用のスタイルや変形が必要な場合あり
    default:
      return 'rounded-xl';
  }
};