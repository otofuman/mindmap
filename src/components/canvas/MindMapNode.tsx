import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';

export const MindMapNode = memo(({ data, selected }: NodeProps) => {
  return (
    <div
      className={`px-4 py-2 rounded-lg bg-white border text-sm text-gray-800 shadow-sm min-w-[100px] text-center transition-all ${
        selected ? 'border-blue-600 ring-2 ring-blue-200' : 'border-gray-400'
      }`}
    >
      {/* 上下左右全方向に透明なHandleを配置してどこからでも繋げるように設定 */}
      <Handle type="target" position={Position.Top} className="!bg-transparent !border-0 !w-full !h-full !top-0 !left-0 !transform-none !rounded-none opacity-0" />
      <Handle type="source" position={Position.Top} className="!bg-transparent !border-0 !w-full !h-full !top-0 !left-0 !transform-none !rounded-none opacity-0" />

      <div className="font-medium pointer-events-none">
        {String(data.label || 'トピック')}
      </div>
    </div>
  );
});

MindMapNode.displayName = 'MindMapNode';