import React from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getStraightPath,
  type EdgeProps,
} from '@xyflow/react';
import type { ConnectionType } from '../../types/mindmap';

export const CustomEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
  style,
  // 拡張データとしてMindMapCanvasからハンドラーを受け取る
  data: edgeData,
}) => {
  const connectionType = (data?.type as ConnectionType) || 'arrow';
  const onEdgeClick = (data as any)?.onEdgeClick;

  const [edgePath, labelX, labelY] = getStraightPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  });

  const gradientId = `edge-grad-${id}`;

  let startColor = '#2563eb';
  let endColor = '#93c5fd';

  if (connectionType === 'arrow') {
    startColor = '#93c5fd';
    endColor = '#2563eb';
  } else if (connectionType === 'reverse_arrow') {
    startColor = '#2563eb';
    endColor = '#93c5fd'; // 必要に応じて調整
  } else if (connectionType === 'bi_arrow') {
    startColor = '#2563eb';
    endColor = '#2563eb';
  } else if (connectionType === 'line') {
    startColor = '#94a3b8';
    endColor = '#94a3b8';
  }

  return (
    <>
      <svg className="absolute w-full h-full overflow-visible pointer-events-none">
        <defs>
          <linearGradient
            id={gradientId}
            x1={sourceX}
            y1={sourceY}
            x2={targetX}
            y2={targetY}
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor={startColor} />
            <stop offset="100%" stopColor={endColor} />
          </linearGradient>
        </defs>
      </svg>

      <BaseEdge
        id={id}
        path={edgePath}
        style={{ ...style, strokeWidth: 3, stroke: `url(#${gradientId})` }}
      />

      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan flex items-center justify-center cursor-pointer p-2"
          onClick={(e) => {
            e.stopPropagation();
            if (onEdgeClick) {
              const rect = e.currentTarget.getBoundingClientRect();
              const wrapperRect = e.currentTarget.closest('.react-flow')?.getBoundingClientRect();
              
              if (wrapperRect) {
                // キャンバス内での相対座標を計算
                const x = rect.left - wrapperRect.left + rect.width / 2;
                const y = rect.top - wrapperRect.top + rect.height / 2 + 10;
                onEdgeClick(id, connectionType, x, y);
              }
            }
          }}
        >
          <span className="w-3 h-3 bg-white border-2 border-blue-600 rounded-full shadow-md hover:scale-125 transition" />
        </div>
      </EdgeLabelRenderer>
    </>
  );
};