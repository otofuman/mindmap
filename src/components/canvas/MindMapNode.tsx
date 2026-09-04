import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useMindMapStore } from '../../store/useMindMapStore';
import { calculateNodeDimensions } from '../../utils/nodeSizeUtils';
import { getShapeClassName } from '../../utils/nodeShapeUtil';

export const MindMapNode = memo(({ id, data, selected }: NodeProps) => {
  const updateTopic = useMindMapStore((state) => state.updateTopic);

  const topic = data.topic as any;
  const title = String(topic?.title || data.label || 'トピック');

  // ストアからこのトピックの表示情報（TopicDisplay）を取得
  const mapDocument = useMindMapStore((state) => state.document);
  const display = mapDocument.topicDisplays.find((d) => d.topicId === id);

  const backgroundColor = display?.backgroundColor || '#ffffff';
  const textColor = display?.textColor || '#1f2937';
  const shape = display?.shape;
  const { width, height } = calculateNodeDimensions(display?.size, shape);

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
      style={{
        backgroundColor: backgroundColor,
        color: textColor,
        width: width,
        height: height
      }}
      className={`flex flex-col justify-center items-center text-center px-3 border text-sm shadow-sm transition-all cursor-pointer select-none relative overflow-hidden ${
        // 形状に応じたクラス（rounded-lg は競合するため削除しこちらに委譲）
        getShapeClassName(shape)
      } ${
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

      <div className="font-medium pointer-events-none truncate w-full">
        {title}
      </div>
    </div>
  );
});

MindMapNode.displayName = 'MindMapNode';