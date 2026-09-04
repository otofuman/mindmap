import { memo, useState, useRef } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useMindMapStore } from '../../store/useMindMapStore';
import { calculateNodeDimensions } from '../../utils/nodeSizeUtils';
import { getShapeClassName } from '../../utils/nodeShapeUtil';
import { getNewTopicName } from '../../utils/nameUtils';
import { EditNodeModal } from '../modals/EditNodeModal';
import { StyleNodeModal } from '../modals/StyleNodeModal';

export const MindMapNode = memo(({ id, data, selected }: NodeProps) => {
  //const updateTopic = useMindMapStore((state) => state.updateTopic);
  const deleteTopic = useMindMapStore((state) => state.deleteTopic);
  const addChildTopic = useMindMapStore((state) => state.addTopic);

  const topic = data.topic as any;
  const title = String(topic?.title || data.label || 'トピック');

  // ストアからこのトピックの表示情報（TopicDisplay）を取得
  const mapDocument = useMindMapStore((state) => state.document);
  const display = mapDocument.topicDisplays.find((d) => d.topicId === id);

  const backgroundColor = display?.backgroundColor || '#ffffff';
  const textColor = display?.textColor || '#1f2937';
  const shape = display?.shape;
  const { width, height } = calculateNodeDimensions(display?.size, shape);

  // ホバー状態とディレイ用タイマーの管理
  const [isHovered, setIsHovered] = useState(false);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // モーダルの表示状態管理
  const [showEditModal, setShowEditModal] = useState(false);
  const [showStyleModal, setShowStyleModal] = useState(false);

  const handleMouseEnter = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    hideTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 200); // メニューに移動するまでの猶予時間
  };

  /*const handleEdit = () => {
    const newTitle = window.prompt('トピック名を編集:', title);
    if (newTitle !== null && newTitle.trim() !== '') {
      updateTopic(id, { title: newTitle.trim() });
    }
  };*/

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onDoubleClick={(e) => {
        e.stopPropagation();
        setShowEditModal(true);
      }}
      style={{
        backgroundColor: backgroundColor,
        color: textColor,
        width: width,
        height: height,
      }}
      className={`flex flex-col justify-center items-center text-center px-3 border text-sm shadow-sm transition-all cursor-pointer select-none relative ${
        getShapeClassName(shape)
      } ${
        selected ? 'border-blue-600 ring-2 ring-blue-200' : 'border-gray-400'
      }`}
    >
      {/* 接続用のハンドル */}
      <Handle
        type="target"
        position={Position.Top}
        className="!absolute !top-1/2 !left-1/2 !w-3 !h-3 opacity-0 !border-0 !bg-transparent"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!absolute !top-1/2 !left-1/2 !w-3 !h-3 opacity-0 !border-0 !bg-transparent"
      />

      <div className="font-medium pointer-events-none truncate w-full">
        {title}
      </div>

      {/* PCホバー時に表示する丸ボタンの横並びメニュー */}
      {isHovered && (
        <div
          className="absolute -top-12 left-1/2 -translate-x-1/2 z-[999] pointer-events-auto flex items-center gap-1.5 bg-white border border-gray-200 shadow-xl rounded-full px-2.5 py-1.5 whitespace-nowrap"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {/* 詳細編集 */}
          {/* <button
            onClick={(e) => {
              e.stopPropagation();
              setShowEditModal(true);
            }}
            title="詳細編集"
            className="w-7 h-7 rounded-full bg-gray-50 hover:bg-blue-50 text-gray-600 hover:text-blue-600 border border-gray-200 flex items-center justify-center text-xs font-bold transition shadow-sm"
          >
            ✏️
          </button> */}

          {/* スタイル編集 */}
          {/* <button
            onClick={(e) => {
              e.stopPropagation();
              setShowStyleModal(true);
            }}
            title="スタイル編集"
            className="w-7 h-7 rounded-full bg-gray-50 hover:bg-blue-50 text-gray-600 hover:text-blue-600 border border-gray-200 flex items-center justify-center text-xs font-bold transition shadow-sm"
          >
            🎨
          </button> */}

          {/* 子の追加 */}
          <button
            onClick={(e) => {
              if (display) {
                e.stopPropagation();
                const x = display?.position.x;
                const y = display?.position.y;

                addChildTopic(getNewTopicName(id), { x: x, y: y + height * 1.2 }, id, display);
              }
            }}
            title="子の追加"
            className="w-7 h-7 rounded-full bg-gray-50 hover:bg-blue-50 text-gray-600 hover:text-blue-600 border border-gray-200 flex items-center justify-center text-xs font-bold transition shadow-sm"
          >
            ＋
          </button>

          {/* 接続を追加 */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              // TODO: 接続追加モードの開始などの処理
            }}
            title="接続を追加"
            className="w-7 h-7 rounded-full bg-gray-50 hover:bg-blue-50 text-gray-600 hover:text-blue-600 border border-gray-200 flex items-center justify-center text-xs font-bold transition shadow-sm"
          >
            🔗
          </button>

          {/* 少しあけて削除 */}
          <div className="w-[1px] h-4 bg-gray-200 mx-0.5" />

          <button
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm('このトピックを削除しますか？')) {
                deleteTopic(id);
              }
            }}
            title="削除"
            className="w-7 h-7 rounded-full bg-red-100 hover:bg-red-200 text-red-600 border border-gray-200 flex items-center justify-center text-xs font-bold transition shadow-sm"
          >
            X
          </button>
        </div>
      )}

      {/* 詳細編集モーダル */}
      {showEditModal && (
        <EditNodeModal
          nodeId={id}
          onClose={() => setShowEditModal(false)}
        />
      )}

      {/* スタイル変更モーダル */}
      {showStyleModal && (
        <StyleNodeModal
          nodeIds={[id]}
          onClose={() => setShowStyleModal(false)}
        />
      )}
    </div>
  );
});

MindMapNode.displayName = 'MindMapNode';