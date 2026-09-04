import React, { useCallback, useRef, useMemo, useEffect, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useReactFlow,
  ReactFlowProvider,
  type Connection,
  type OnConnect,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { MindMapNode } from './MindMapNode';
import { CustomEdge } from './CustomEdge';
import { useMindMapStore } from '../../store/useMindMapStore';
import type { MindMapDocument } from '../../types/mindmap';

// 別管理したモーダルをインポート
import { EditNodeModal } from '../modals/EditNodeModal';
import { StyleNodeModal } from '../modals/StyleNodeModal';

const nodeTypes = {
  mindMapNode: MindMapNode,
};

const edgeTypes = {
  customEdge: CustomEdge,
};

const MindMapCanvasContent: React.FC = () => {
  const mapDocument = useMindMapStore((state) => state.document);
  const selectedNodeId = useMindMapStore((state) => state.selectedNodeId);
  const connectingSourceId = useMindMapStore((state) => state.connectingSourceId);
  const setConnectingSourceId = useMindMapStore((state) => state.setConnectingSourceId);
  const handleNodeTapForConnect = useMindMapStore((state) => state.handleNodeTapForConnect);
  const updateTopic = useMindMapStore((state) => state.updateTopic);

  const onNodesChange = useMindMapStore((state) => state.onNodesChange);
  const onEdgesChange = useMindMapStore((state) => state.onEdgesChange);
  const addTopic = useMindMapStore((state) => state.addTopic);
  const connectTopics = useMindMapStore((state) => state.connectTopics);
  const applyAutoLayout = useMindMapStore((state) => state.applyAutoLayout);
  const loadDocument = useMindMapStore((state) => state.loadDocument);

  const undo = useMindMapStore((state) => state.undo);
  const redo = useMindMapStore((state) => state.redo);
  const deleteTopic = useMindMapStore((state) => (state as any).deleteTopic);

  const { screenToFlowPosition, fitView } = useReactFlow();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [nodeMenuTarget, setNodeMenuTarget] = useState<{ id: string; x: number; y: number } | null>(null);

  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [stylingNodeId, setStylingNodeId] = useState<string | null>(null);

  const handleTitleClick = useCallback(() => {
    const currentTitle = mapDocument.meta.title || 'マインドマップ';
    const newTitle = window.prompt('マインドマップ名を入力:', currentTitle);
    if (newTitle !== null) {
      useMindMapStore.setState((state) => ({
        document: {
          ...state.document,
          meta: { ...state.document.meta, title: newTitle.trim() || 'マインドマップ' }
        }
      }));
    }
  }, [mapDocument.meta.title]);

  const onNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      if (connectingSourceId) {
        handleNodeTapForConnect(node.id);
        setNodeMenuTarget(null);
        return;
      }

      if (isSelectionMode) {
        useMindMapStore.setState({ selectedNodeId: node.id });
        return;
      }

      const isAlreadySelected = selectedNodeId === node.id;
      useMindMapStore.setState({ selectedNodeId: node.id });

      const wrapperBounds = reactFlowWrapper.current?.getBoundingClientRect();
      if (wrapperBounds) {
        const x = event.clientX - wrapperBounds.left + 15;
        const y = event.clientY - wrapperBounds.top - 20;

        setNodeMenuTarget({
          id: node.id,
          x,
          y,
        });
      }

      if (isAlreadySelected) {
        const topic = mapDocument.topics.find((t) => t.id === node.id);
        if (topic) {
          const newTitle = window.prompt('ノードの新しい名前を入力:', topic.title);
          if (newTitle !== null && newTitle.trim() !== '') {
            updateTopic(topic.id, { title: newTitle.trim() });
          }
        }
      }
    },
    [connectingSourceId, handleNodeTapForConnect, isSelectionMode, selectedNodeId, mapDocument, updateTopic]
  );

  const nodes: Node[] = useMemo(() => {
    return mapDocument.topics.map((topic) => {
      const display = mapDocument.topicDisplays.find((d) => d.topicId === topic.id);
      const isConnectingSource = topic.id === connectingSourceId;

      return {
        id: topic.id,
        type: 'mindMapNode',
        position: display ? display.position : { x: 0, y: 0 },
        selected: topic.id === selectedNodeId || isConnectingSource,
        data: { label: topic.title, topic },
        draggable: !isSelectionMode,
      };
    });
  }, [mapDocument.topics, mapDocument.topicDisplays, selectedNodeId, connectingSourceId, isSelectionMode]);

  const edges: Edge[] = useMemo(() => {
    return mapDocument.connections.map((conn) => {
      const type = conn.type || 'arrow';
      return {
        id: conn.id,
        source: conn.sourceTopicId,
        target: conn.targetTopicId,
        type: 'customEdge',
        data: { type },
        style: { stroke: '#64748b', strokeWidth: 2 },
      };
    });
  }, [mapDocument.connections]);

  const onConnect: OnConnect = useCallback(
    (params: Connection) => {
      if (params.source && params.target) {
        connectTopics(params.source, params.target);
      }
    },
    [connectTopics]
  );

  const onPaneClick = useCallback(
    (event: React.MouseEvent) => {
      const target = event.target as HTMLElement;
      if (
        target.classList.contains('react-flow__pane') ||
        target.classList.contains('react-flow')
      ) {
        useMindMapStore.setState({ selectedNodeId: null, connectingSourceId: null });
        setMobileMenuOpen(false);
        setNodeMenuTarget(null);
      }
    },
    []
  );

  const onPaneContextMenu = useCallback(
    (event: React.MouseEvent | MouseEvent | TouchEvent) => {
      event.preventDefault();
      if (isSelectionMode) return;
      let clientX = 0;
      let clientY = 0;

      if ('clientX' in event) {
        clientX = event.clientX;
        clientY = event.clientY;
      }

      const position = screenToFlowPosition({
        x: clientX,
        y: clientY,
      });
      addTopic('新しいトピック', position);
    },
    [screenToFlowPosition, addTopic, isSelectionMode]
  );

  const handleAddAction = useCallback(() => {
    if (selectedNodeId) {
      const parentNode = nodes.find((n) => n.id === selectedNodeId);
      if (parentNode) {
        const childPosition = {
          x: parentNode.position.x + 220,
          y: parentNode.position.y + (Math.random() * 80 - 40),
        };
        addTopic('サブトピック', childPosition, selectedNodeId);
        return;
      }
    }
    addTopic('新しいトピック', { x: 100, y: 100 });
  }, [selectedNodeId, nodes, addTopic]);

  const handleAutoLayout = useCallback(() => {
    applyAutoLayout('LR');
    setTimeout(() => fitView({ duration: 300 }), 50);
  }, [applyAutoLayout, fitView]);

  const handleExportJSON = useCallback(() => {
    const currentMapTitle = mapDocument.meta.title || 'mindmap';
    const inputFileName = window.prompt('保存するファイル名を入力してください:', currentMapTitle);
    if (inputFileName === null) return;

    const sanitizedTitle = inputFileName.trim() || currentMapTitle;
    const fileName = sanitizedTitle.endsWith('.json') ? sanitizedTitle : `${sanitizedTitle}.json`;

    const jsonString = JSON.stringify(mapDocument, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    setMobileMenuOpen(false);
  }, [mapDocument]);

  const handleImportJSON = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string) as MindMapDocument;
          if (parsed.topics && parsed.connections && parsed.topicDisplays) {
            loadDocument(parsed);
            setTimeout(() => fitView({ duration: 300 }), 50);
          } else {
            alert('無効なフォーマットです。');
          }
        } catch (err) {
          alert('ファイルの読み込みに失敗しました。');
        }
      };
      reader.readAsText(file);
      e.target.value = '';
      setMobileMenuOpen(false);
    },
    [loadDocument, fitView]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      if (isCmdOrCtrl && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          redo();
        } else {
          e.preventDefault();
          undo();
        }
      } else if (isCmdOrCtrl && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  return (
    <div ref={reactFlowWrapper} className="w-full h-full relative focus:outline-none">
      {connectingSourceId && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-[100] bg-blue-600 text-white text-xs px-4 py-2 rounded-full shadow-lg font-bold flex items-center gap-2 animate-bounce pointer-events-auto">
          <span>🔗 接続先のノードをタップしてください</span>
          <button
            onClick={() => setConnectingSourceId(null)}
            className="bg-blue-800 hover:bg-blue-900 rounded-full w-5 h-5 flex items-center justify-center text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* 上部ツールバー */}
      <div className="absolute top-3 left-3 right-3 z-50 flex flex-col gap-2 pointer-events-none max-w-xl mx-auto">
        <div className="flex items-center justify-between bg-white/95 backdrop-blur px-3 py-2 rounded-xl shadow-md border border-gray-200 pointer-events-auto">
          <div className="flex items-center gap-2 overflow-hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-700 transition shrink-0"
              title="メニュー"
            >
              <span className="text-base font-bold">☰</span>
            </button>
            <span
              onClick={handleTitleClick}
              className="font-bold text-gray-800 text-xs md:text-sm truncate cursor-pointer hover:text-blue-600 transition"
              title="クリックして名前を変更"
            >
              {mapDocument.meta.title || 'マインドマップ'} ✏️
            </span>
          </div>

          <div className="hidden md:flex gap-1">
            <button
              onClick={handleExportJSON}
              className="px-2 py-1 text-xs rounded bg-emerald-600 hover:bg-emerald-700 text-white transition font-medium"
            >
              💾 保存
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-2 py-1 text-xs rounded bg-amber-600 hover:bg-amber-700 text-white transition font-medium"
            >
              📂 開く
            </button>
          </div>
        </div>

        {/* 2段目ツールバー */}
        <div className="flex items-center justify-between bg-white/95 backdrop-blur px-3 py-2 rounded-xl shadow-md border border-gray-200 pointer-events-auto">
          <div className="flex items-center gap-1.5 md:gap-2 overflow-x-auto">
            <button
              onClick={handleAddAction}
              disabled={isSelectionMode}
              className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg whitespace-nowrap transition shadow-sm flex items-center gap-1 ${
                isSelectionMode ? 'bg-gray-100 text-gray-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              <span>＋ ノード追加</span>
            </button>

            {selectedNodeId && !isSelectionMode && (
              <button
                onClick={() => {
                  handleNodeTapForConnect(selectedNodeId);
                  setNodeMenuTarget(null);
                }}
                className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg whitespace-nowrap transition shadow-sm flex items-center gap-1 animate-fadeIn"
              >
                <span>🔗 接続追加</span>
              </button>
            )}

            <button
              onClick={() => {
                setIsSelectionMode(!isSelectionMode);
                setNodeMenuTarget(null);
              }}
              className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg whitespace-nowrap transition shadow-sm flex items-center gap-1 ${
                isSelectionMode
                  ? 'bg-amber-500 text-white ring-2 ring-amber-300'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              <span>{isSelectionMode ? '🔍 選択モード中 (解除)' : '🔍 選択モード'}</span>
            </button>

            <button
              onClick={handleAutoLayout}
              className="bg-slate-700 hover:bg-slate-800 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg whitespace-nowrap transition shadow-sm flex items-center gap-1"
            >
              <span>⚡ 整列</span>
            </button>
          </div>
        </div>
      </div>

      {/* ノードの右隣に表示されるコンテキストメニュー (z-[100]) */}
      {nodeMenuTarget && (
        <div
          style={{ top: nodeMenuTarget.y, left: nodeMenuTarget.x }}
          className="absolute z-[100] bg-white border border-gray-200 shadow-2xl rounded-xl p-1.5 flex flex-col gap-1 min-w-[150px] pointer-events-auto animate-fadeIn"
        >
          <div className="text-[10px] text-gray-400 px-2 py-0.5 border-b font-medium">アクション選択</div>
          
          <button
            onClick={() => {
              setEditingNodeId(nodeMenuTarget.id);
              setNodeMenuTarget(null);
            }}
            className="w-full text-left px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded transition"
          >
            📝 詳細編集
          </button>

          <button
            onClick={() => {
              handleNodeTapForConnect(nodeMenuTarget.id);
              setNodeMenuTarget(null);
            }}
            className="w-full text-left px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-purple-50 hover:text-purple-600 rounded transition"
          >
            🔗 接続を追加
          </button>

          <button
            onClick={() => {
              setStylingNodeId(nodeMenuTarget.id);
              setNodeMenuTarget(null);
            }}
            className="w-full text-left px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-emerald-50 hover:text-emerald-600 rounded transition"
          >
            🎨 スタイルの変更
          </button>

          <button
            onClick={() => {
              if (window.confirm('選択したノードを削除してもよろしいですか？')) {
                deleteTopic(nodeMenuTarget.id);
                setNodeMenuTarget(null);
              }
            }}
            className="w-full text-left px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 rounded transition border-t border-gray-100 mt-0.5 pt-1.5"
          >
            🗑️ 削除
          </button>

          <button
            onClick={() => setNodeMenuTarget(null)}
            className="w-full text-center px-2 py-1 text-[11px] text-gray-400 hover:text-gray-600 border-t mt-1"
          >
            閉じる
          </button>
        </div>
      )}

      {/* 別ファイル管理されたモーダルの呼び出し */}
      {editingNodeId && (
        <EditNodeModal nodeId={editingNodeId} onClose={() => setEditingNodeId(null)} />
      )}

      {stylingNodeId && (
        <StyleNodeModal nodeId={stylingNodeId} onClose={() => setStylingNodeId(null)} />
      )}

      {mobileMenuOpen && (
        <div className="absolute left-3 top-16 bg-white border border-gray-200 shadow-2xl rounded-xl p-2 flex flex-col gap-2 min-w-[140px] z-[100] md:hidden pointer-events-auto">
          <button
            onClick={handleExportJSON}
            className="w-full text-left px-3 py-2 text-xs font-semibold rounded bg-emerald-600 hover:bg-emerald-700 text-white transition"
          >
            💾 JSON保存
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full text-left px-3 py-2 text-xs font-semibold rounded bg-amber-600 hover:bg-amber-700 text-white transition"
          >
            📂 JSONを開く
          </button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleImportJSON}
        className="hidden"
      />

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={(e, node) => {
          // ダブルクリック時は直接詳細編集を開くようにしても便利です
          setEditingNodeId(node.id);
        }}
        onPaneClick={onPaneClick}
        onPaneContextMenu={onPaneContextMenu}
        panOnDrag={[1, 2]}
        selectionOnDrag={false}
        nodesDraggable={!isSelectionMode}
        fitView
      >
        <Controls />
        <MiniMap className="hidden md:block" />
        <Background gap={16} size={1} />
      </ReactFlow>
    </div>
  );
};

export const MindMapCanvas: React.FC = () => {
  return (
    <ReactFlowProvider>
      <MindMapCanvasContent />
    </ReactFlowProvider>
  );
};