import { memo, useState, useRef, useEffect } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useMindMapStore } from '../../store/useMindMapStore';
import { calculateNodeDimensions } from '../../utils/nodeSizeUtils';
import { getShapeClassName } from '../../utils/nodeShapeUtil';
import { getNewTopicName } from '../../utils/nameUtils';

export const MindMapNode = memo(({ id, data, selected }: NodeProps) => {
  const deleteTopic = useMindMapStore((state) => state.deleteTopic);
  const addChildTopic = useMindMapStore((state) => state.addTopic);
  const handleNodeTapForConnect = useMindMapStore((state) => state.handleNodeTapForConnect);

  const topic = data.topic as any;
  const title = String(topic?.title || data.label || 'トピック');

  const mapDocument = useMindMapStore((state) => state.document);
  const display = mapDocument.topicDisplays.find((d) => d.topicId === id);

  const backgroundColor = display?.backgroundColor || '#ffffff';
  const textColor = display?.textColor || '#1f2937';
  const shape = display?.shape;
  const { width, height } = calculateNodeDimensions(display?.size, shape);

  // ホバー対応環境（PC等）かどうかの判定
  const [isHoverSupported, setIsHoverSupported] = useState(true);

  // PC用ホバー状態 & モバイル用タップ状態
  const [isHovered, setIsHovered] = useState(false);
  const [isTapOpen, setIsTapOpen] = useState(false);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  isTapOpen;

  useEffect(() => {
    const mediaQuery = window.matchMedia('(hover: hover)');
    setIsHoverSupported(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setIsHoverSupported(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // PCならホバー中、モバイルならタップ開閉状態をメニュー表示の条件にする
  const showMenu = isHoverSupported ? isHovered : false;

  const handleMouseEnter = () => {
    if (isHoverSupported) {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }
      setIsHovered(true);
    }
  };

  const handleMouseLeave = () => {
    if (isHoverSupported) {
      hideTimeoutRef.current = setTimeout(() => {
        setIsHovered(false);
      }, 200); // メニューに移動するまでの猶予時間
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (!isHoverSupported) {
      e;
      //e.stopPropagation();
      setIsTapOpen((prev) => !prev);
    }
  };

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
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

      {/* メニュー：PCはホバー、モバイルはタップで表示 */}
      {showMenu && (
        <div
          className="absolute -top-12 left-1/2 -translate-x-1/2 z-[999] pointer-events-auto flex items-center gap-1.5 bg-white border border-gray-200 shadow-xl rounded-full px-2.5 py-1.5 whitespace-nowrap"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 子の追加 */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (display) {
                const x = display?.position.x;
                const y = display?.position.y;
                addChildTopic(getNewTopicName(id), { x: x, y: y + height * 1.2 }, id, display);
                setIsTapOpen(false);
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
              handleNodeTapForConnect(id);
              setIsTapOpen(false);
            }}
            title="接続を追加"
            className="w-7 h-7 rounded-full bg-gray-50 hover:bg-blue-50 text-gray-600 hover:text-blue-600 border border-gray-200 flex items-center justify-center text-xs font-bold transition shadow-sm"
          >
            🔗
          </button>

          <div className="w-[1px] h-4 bg-gray-200 mx-0.5" />

          {/* 削除 */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm('このトピックを削除しますか？')) {
                deleteTopic(id);
              }
              setIsTapOpen(false);
            }}
            title="削除"
            className="w-7 h-7 rounded-full bg-red-100 hover:bg-red-200 text-red-600 border border-gray-200 flex items-center justify-center text-xs font-bold transition shadow-sm"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
});

MindMapNode.displayName = 'MindMapNode';