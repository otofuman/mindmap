import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useMindMapStore } from '../../store/useMindMapStore';

export const MindMapNode = memo(({ id, data, selected }: NodeProps) => {
  const updateTopic = useMindMapStore((state) => state.updateTopic);

  const topic = data.topic as any;
  const title = String(topic?.title || data.label || 'トピック');

  const handleEdit = () => {
    const newTitle = window.prompt('トピック名を編集:', title);
    if (newTitle !== null && newTitle.trim() !== '') {
      updateTopic(id, { title: newTitle.trim() });
    }
  };

  return (
    <div
      onDoubleClick={(e) => {
        e.stopPropagation();
        handleEdit();
      }}
      className={`px-4 py-2 rounded-lg bg-white border text-sm text-gray-800 shadow-sm min-w-[100px] text-center transition-all cursor-pointer select-none relative ${
        selected ? 'border-blue-600 ring-2 ring-blue-200' : 'border-gray-400'
      }`}
    >
      {/* 接続用のハンドル（判定を広げてタッチしやすく調整） */}
      <Handle
        type="target"
        position={Position.Top}
        className="!absolute !top-1/2 !left-1/2 !w-1 !h-1 !-translate-x-1/2 !-translate-y-1/2 opacity-0 !border-0 !bg-transparent"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!absolute !top-1/2 !left-1/2 !w-1 !h-1 !-translate-x-1/2 !-translate-y-1/2 opacity-0 !border-0 !bg-transparent"
      />

      <div className="font-medium pointer-events-none">
        {title}
      </div>
    </div>
  );
});

MindMapNode.displayName = 'MindMapNode';