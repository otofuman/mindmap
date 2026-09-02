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

const nodeTypes = {
  mindMapNode: MindMapNode,
};

const edgeTypes = {
  customEdge: CustomEdge,
};

const MindMapCanvasContent: React.FC = () => {
  const document = useMindMapStore((state) => state.document);
  const selectedNodeId = useMindMapStore((state) => state.selectedNodeId);
  const connectingSourceId = useMindMapStore((state) => state.connectingSourceId);
  const setConnectingSourceId = useMindMapStore((state) => state.setConnectingSourceId);
  const handleNodeTapForConnect = useMindMapStore((state) => state.handleNodeTapForConnect);

  const onNodesChange = useMindMapStore((state) => state.onNodesChange);
  const onEdgesChange = useMindMapStore((state) => state.onEdgesChange);
  const addTopic = useMindMapStore((state) => state.addTopic);
  const connectTopics = useMindMapStore((state) => state.connectTopics);
  const applyAutoLayout = useMindMapStore((state) => state.applyAutoLayout);
  const loadDocument = useMindMapStore((state) => state.loadDocument);

  const undo = useMindMapStore((state) => state.undo);
  const redo = useMindMapStore((state) => state.redo);
  const canUndo = useMindMapStore((state) => state.canUndo);
  const canRedo = useMindMapStore((state) => state.canRedo);

  // deleteTopic がストアにあると仮定
  const deleteTopic = useMindMapStore((state) => (state as any).deleteTopic);

  const { screenToFlowPosition, fitView } = useReactFlow();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // モバイル用ハンバーガーメニューの開閉状態
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // ゴミ箱のDOM参照
  const trashRef = useRef<HTMLDivElement>(null);
  // ドラッグ中かどうか（ゴミ箱をハイライトさせるためなど）
  const [isDraggingOverTrash, setIsDraggingOverTrash] = useState(false);

  // ノードのドラッグが終了した時の処理
  const onNodeDragStop = useCallback(
    (event: any, node: Node) => {
      if (!trashRef.current) return;

      // イベントからカーソル/指の最終位置を取得
      let clientX = 0;
      let clientY = 0;
      if ('clientX' in event) {
        clientX = event.clientX;
        clientY = event.clientY;
      } else if ('touches' in event && event.touches.length > 0) {
        clientX = event.touches[0].clientX;
        clientY = event.touches[0].clientY;
      }

      // ゴミ箱の画面上の位置・サイズを取得
      const trashRect = trashRef.current.getBoundingClientRect();

      // ドロップ位置がゴミ箱の矩形内に入っているか判定
      const isOverTrash =
        clientX >= trashRect.left &&
        clientX <= trashRect.right &&
        clientY >= trashRect.top &&
        clientY <= trashRect.bottom;

      if (isOverTrash) {
        if (deleteTopic) {
          deleteTopic(node.id);
        } else {
          console.warn('deleteTopic がストアに定義されていません');
        }
      }

      setIsDraggingOverTrash(false);
    },
    [deleteTopic]
  );

  // ノードクリック時の処理（接続モード or 選択ノードの再クリックで名前変更）
  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (connectingSourceId) {
        handleNodeTapForConnect(node.id);
        return;
      }

      if (node.id === selectedNodeId) {
        const currentTitle = node.data.label as string;
        const newTitle = window.prompt('トピック名を編集:', currentTitle);
        if (newTitle !== null && newTitle.trim() !== '') {
          useMindMapStore.getState().updateTopic(node.id, { title: newTitle.trim() });
        }
      }
    },
    [connectingSourceId, handleNodeTapForConnect, selectedNodeId]
  );

  const nodes: Node[] = useMemo(() => {
    return document.topics.map((topic) => {
      const display = document.topicDisplays.find((d) => d.topicId === topic.id);
      const isConnectingSource = topic.id === connectingSourceId;

      return {
        id: topic.id,
        type: 'mindMapNode',
        position: display ? display.position : { x: 0, y: 0 },
        selected: topic.id === selectedNodeId || isConnectingSource,
        data: { label: topic.title, topic },
      };
    });
  }, [document.topics, document.topicDisplays, selectedNodeId, connectingSourceId]);

  const edges: Edge[] = useMemo(() => {
    return document.connections.map((conn) => {
      const type = conn.type || 'arrow';

      return {
        id: conn.id,
        source: conn.sourceTopicId,
        target: conn.targetTopicId,
        type: 'customEdge',
        data: { type },
        style: { stroke: '#64748b', strokeWidth: 2 },
        markerStart: undefined,
        markerEnd: undefined,
      };
    });
  }, [document.connections]);

  const onConnect: OnConnect = useCallback(
    (params: Connection) => {
      if (params.source && params.target) {
        connectTopics(params.source, params.target);
      }
    },
    [connectTopics]
  );

  // 背景クリック時（選択解除）
  const onPaneClick = useCallback(
    (event: React.MouseEvent) => {
      const target = event.target as HTMLElement;
      if (
        target.classList.contains('react-flow__pane') ||
        target.classList.contains('react-flow')
      ) {
        useMindMapStore.setState({ selectedNodeId: null, connectingSourceId: null });
        setMobileMenuOpen(false);
      }
    },
    []
  );

  // 背景長押し / 右クリック（新しいトピック追加）
  const onPaneContextMenu = useCallback(
    (event: React.MouseEvent | MouseEvent | TouchEvent) => {
      event.preventDefault();
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
    [screenToFlowPosition, addTopic]
  );

  const addChildNode = useCallback(
    (parentNodeId: string) => {
      const parentNode = nodes.find((n) => n.id === parentNodeId);
      if (!parentNode) return;

      const childPosition = {
        x: parentNode.position.x + 220,
        y: parentNode.position.y + (Math.random() * 80 - 40),
      };

      addTopic('サブトピック', childPosition, parentNodeId);
    },
    [nodes, addTopic]
  );

  const handleAutoLayout = useCallback(() => {
    applyAutoLayout('LR');
    setTimeout(() => fitView({ duration: 300 }), 50);
  }, [applyAutoLayout, fitView]);

  const handleExportJSON = useCallback(() => {
    const jsonString = JSON.stringify(document, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = `${document.meta.title || 'mindmap'}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMobileMenuOpen(false);
  }, [document]);

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

  const selectedNode = nodes.find((n) => n.selected);

  return (
    <div ref={reactFlowWrapper} className="w-full h-full relative focus:outline-none">
      {/* 接続ガイド通知メッセージ */}
      {connectingSourceId && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 bg-blue-600 text-white text-xs px-4 py-2 rounded-full shadow-lg font-bold flex items-center gap-2 animate-bounce">
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
      <div className="absolute top-2 left-2 right-2 md:right-auto z-10 bg-white/95 backdrop-blur shadow-md border border-gray-200 rounded-lg p-2 flex gap-2 items-center overflow-x-auto max-w-full">
        {/* Undo / Redo */}
        <div className="flex gap-1 shrink-0">
          <button
            onClick={undo}
            disabled={!canUndo}
            className={`px-2 py-1 text-xs font-semibold rounded border whitespace-nowrap transition ${
              canUndo
                ? 'bg-white hover:bg-gray-100 text-gray-700 border-gray-300'
                : 'bg-gray-100 text-gray-300 border-gray-200 cursor-not-allowed'
            }`}
          >
            ↩ 戻す
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            className={`px-2 py-1 text-xs font-semibold rounded border whitespace-nowrap transition ${
              canRedo
                ? 'bg-white hover:bg-gray-100 text-gray-700 border-gray-300'
                : 'bg-gray-100 text-gray-300 border-gray-200 cursor-not-allowed'
            }`}
          >
            ↪ 進む
          </button>
        </div>

        <div className="w-[1px] h-4 bg-gray-300 shrink-0" />

        {/* 整列 */}
        <button
          onClick={handleAutoLayout}
          className="bg-slate-700 hover:bg-slate-800 text-white text-xs font-semibold px-2.5 py-1 rounded whitespace-nowrap transition shrink-0"
        >
          🪄 整列
        </button>

        {/* 選択中のノードに対するアクション */}
        {selectedNode && (
          <>
            <div className="w-[1px] h-4 bg-gray-300 shrink-0" />
            <button
              onClick={() => addChildNode(selectedNode.id)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-2.5 py-1 rounded whitespace-nowrap transition shrink-0"
            >
              + 子ノード
            </button>
            <button
              onClick={() => handleNodeTapForConnect(selectedNode.id)}
              className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold px-2.5 py-1 rounded whitespace-nowrap transition shrink-0"
            >
              🔗 接続線をつなぐ
            </button>
          </>
        )}

        <div className="w-[1px] h-4 bg-gray-300 shrink-0 hidden md:block" />

        {/* PC用: 保存 / 開く */}
        <div className="hidden md:flex gap-1 shrink-0">
          <button
            onClick={handleExportJSON}
            className="px-2 py-1 text-xs font-semibold rounded bg-emerald-600 hover:bg-emerald-700 text-white whitespace-nowrap transition"
          >
            💾 保存
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-2 py-1 text-xs font-semibold rounded bg-amber-600 hover:bg-amber-700 text-white whitespace-nowrap transition"
          >
            📂 開く
          </button>
        </div>

        {/* モバイル用: ハンバーガーメニューボタン（アイコンのみツールバー内） */}
        <div className="md:hidden shrink-0 ml-auto">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded font-bold text-sm"
          >
            ☰
          </button>
        </div>

        {/* 共通の隠しファイルインプット */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImportJSON}
          className="hidden"
        />
      </div>

      {/* モバイル用ポップアップメニュー（ツールバーの外側に配置して確実に表示させる） */}
      {mobileMenuOpen && (
        <div className="absolute right-4 top-16 bg-white border border-gray-200 shadow-2xl rounded-lg p-2 flex flex-col gap-2 min-w-[140px] z-50 md:hidden">
          <button
            onClick={handleExportJSON}
            className="w-full text-left px-3 py-1.5 text-xs font-semibold rounded bg-emerald-600 hover:bg-emerald-700 text-white transition"
          >
            💾 保存
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full text-left px-3 py-1.5 text-xs font-semibold rounded bg-amber-600 hover:bg-amber-700 text-white transition"
          >
            📂 開く
          </button>
        </div>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onPaneContextMenu={onPaneContextMenu}
        onNodeDragStop={onNodeDragStop}
        
        panOnDrag={[1, 2]}
        selectionOnDrag={false}
        nodesDraggable={true}
        
        fitView
      >
        <Controls />
        <MiniMap className="hidden md:block" />
        <Background gap={16} size={1} />
      </ReactFlow>

      {/* 画面下部のゴミ箱エリア */}
      <div
        ref={trashRef}
        className={`absolute bottom-6 left-1/2 -translate-x-1/2 z-20 px-6 py-3 rounded-2xl shadow-xl border flex items-center gap-2 transition-all pointer-events-auto ${
          isDraggingOverTrash
            ? 'bg-red-600 text-white border-red-700 scale-110'
            : 'bg-white/90 backdrop-blur text-red-600 border-red-200 hover:bg-red-50'
        }`}
      >
        <span className="text-xl">🗑️</span>
        <span className="text-xs font-bold whitespace-nowrap">ここにドロップして削除</span>
      </div>
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