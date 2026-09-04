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
import { TopBar } from './TopBar';
import { Toolbar } from './Toolbar';
import { NodeMenu } from './NodeMenu'; // 分離したメニューをインポート
import { EdgeMenu } from './EdgeMenu';
import { useMindMapStore } from '../../store/useMindMapStore';
import type { MindMapDocument } from '../../types/mindmap';
import type { ConnectionType } from '../../types/mindmap';

import { EditNodeModal } from '../modals/EditNodeModal';
import { StyleNodeModal } from '../modals/StyleNodeModal';

import { calculateNodeDimensions } from '../../utils/nodeSizeUtils';

const nodeTypes = {
  mindMapNode: MindMapNode,
};

const edgeTypes = {
  customEdge: CustomEdge,
};

const MindMapCanvasContent: React.FC = () => {
  const mapDocument = useMindMapStore((state) => state.document);
  const selectedNodeIds = useMindMapStore((state) => state.selectedNodeIds);
  const clearSelection = useMindMapStore((state) => state.clearSelection);
  const connectingSourceId = useMindMapStore((state) => state.connectingSourceId);
  const setConnectingSourceId = useMindMapStore((state) => state.setConnectingSourceId);
  const handleNodeTapForConnect = useMindMapStore((state) => state.handleNodeTapForConnect);
  // const updateTopic = useMindMapStore((state) => state.updateTopic);

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

  const updateConnectionType = useMindMapStore((state) => state.updateConnectionType);
  const deleteConnection = useMindMapStore((state) => state.deleteConnection);

  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [nodeMenuTarget, setNodeMenuTarget] = useState<{ id: string; x: number; y: number } | null>(null);

  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  // const [stylingNodeId, setStylingNodeId] = useState<string | null>(null);

  // スタイル変更モーダル用の選択中ノードIDリスト
  const [stylingNodeIds, setStylingNodeIds] = useState<string[]>([]);

  // stateにエッジメニュー用のターゲットを追加
  const [edgeMenuTarget, setEdgeMenuTarget] = useState<{
    id: string;
    type: ConnectionType;
    x: number;
    y: number;
  } | null>(null);

  const primarySelectedId = selectedNodeIds.length > 0 ? selectedNodeIds[0] : null;

const onNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      // 接続モード中の場合は接続先確定を優先
      if (connectingSourceId) {
        event.stopPropagation();
        handleNodeTapForConnect(node.id);
        setNodeMenuTarget(null);
        return;
      }

      const isShiftPressed = event.shiftKey || event.metaKey || event.ctrlKey;

      if (isSelectionMode || isShiftPressed) {
        // Shiftキーが押されている場合は、すでに選択されていれば外し、未選択なら追加する
        const isAlreadySelected = selectedNodeIds.includes(node.id);
        if (isAlreadySelected) {
          useMindMapStore.getState().setSelectedNodeIds(
            selectedNodeIds.filter((id) => id !== node.id)
          );
        } else {
          useMindMapStore.getState().setSelectedNodeIds([...selectedNodeIds, node.id]);
        }
        setNodeMenuTarget(null);
        return;
      }

      // Shiftキーが押されていない通常のクリック
      const isAlreadySelected = selectedNodeIds.includes(node.id) && selectedNodeIds.length === 1;
      
      if (isAlreadySelected) {
        // すでに単体選択されている状態でクリックされたらタイトル編集など
        const topic = mapDocument.topics.find((t) => t.id === node.id);
        if (topic) {
          const newTitle = window.prompt('ノードの新しい名前を入力:', topic.title);
          if (newTitle !== null && newTitle.trim() !== '') {
            useMindMapStore.getState().updateTopic(topic.id, { title: newTitle.trim() });
          }
        }
        setNodeMenuTarget(null);
      } else {
        // 新しく単体選択にする
        useMindMapStore.getState().setSelectedNodeIds([node.id]);

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
      }
    },
    [connectingSourceId, handleNodeTapForConnect, selectedNodeIds, mapDocument]
  );

  const nodes: Node[] = useMemo(() => {
    return mapDocument.topics.map((topic) => {
      const display = mapDocument.topicDisplays.find((d) => d.topicId === topic.id);
      const isConnectingSource = topic.id === connectingSourceId;
      const isSelected = selectedNodeIds.includes(topic.id) || isConnectingSource;

      return {
        id: topic.id,
        type: 'mindMapNode',
        position: display ? display.position : { x: 0, y: 0 },
        selected: isSelected,
        data: { label: topic.title, topic },
        draggable: true,
      };
    });
  }, [mapDocument.topics, mapDocument.topicDisplays, selectedNodeIds, connectingSourceId]);

  // edgesの生成部分でクリックハンドラーを渡す
  const edges: Edge[] = useMemo(() => {
    return mapDocument.connections.map((conn) => {
      const type = conn.type || 'arrow';
      return {
        id: conn.id,
        source: conn.sourceTopicId,
        target: conn.targetTopicId,
        type: 'customEdge',
        data: {
          type,
          onEdgeClick: (edgeId: string, currentType: ConnectionType, x: number, y: number) => {
            setNodeMenuTarget(null); // ノードメニューが開いていれば閉じる
            setEdgeMenuTarget({ id: edgeId, type: currentType, x, y });
          },
        },
        style: { stroke: '#94a3b8', strokeWidth: 1.5 },
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

  // 背景クリック等でエッジメニューも閉じるようにする
  const onPaneClick = useCallback(() => {
    clearSelection();
    setNodeMenuTarget(null);
    setEdgeMenuTarget(null);
  }, [clearSelection]);

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
    if (primarySelectedId) {
      const parentNode = nodes.find((n) => n.id === primarySelectedId);
      if (parentNode) {
        const childPosition = {
          x: parentNode.position.x + 220,
          y: parentNode.position.y + (Math.random() * 80 - 40),
        };
        addTopic('サブトピック', childPosition, primarySelectedId);
        return;
      }
    }
    addTopic('新しいトピック', { x: 100, y: 100 });
  }, [primarySelectedId, nodes, addTopic]);

  // 画面中央（Viewport Center）にノードを追加する関数
  const handleAddNodeAtCenter = useCallback(() => {
    if (reactFlowWrapper.current) {
      const bounds = reactFlowWrapper.current.getBoundingClientRect();
      const centerX = bounds.width / 2;
      const centerY = bounds.height / 2;

      const flowPosition = screenToFlowPosition({
        x: bounds.left + centerX,
        y: bounds.top + centerY,
      });

      // デフォルトサイズから幅・高さを算出
      const { width, height } = calculateNodeDimensions(1.0, 'rounded_rectangle');

      const position = {
        x: flowPosition.x - width / 2,
        y: flowPosition.y - height / 2,
      };

      addTopic('新しいトピック', position);
    }
  }, [screenToFlowPosition, addTopic]);

  const handleAddChildNode = useCallback(
    (parentId: string) => {
      const parentNode = nodes.find((n) => n.id === parentId);
      if (parentNode) {
        // 親ノードのすぐ下に配置
        const childPosition = {
          x: parentNode.position.x,
          y: parentNode.position.y + 100, // 親のすぐ下に配置
        };
        // addTopic の第3引数等に親IDを渡すか、追加後に自動で connectTopics を呼ぶ
        addTopic('サブトピック', childPosition, parentId);
      }
    },
    [nodes, addTopic]
  );

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
      } else if (e.key === 'Escape') {
        clearSelection();
        setNodeMenuTarget(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, clearSelection]);

  return (
    <div ref={reactFlowWrapper} className="w-full h-full relative focus:outline-none bg-gray-50 cursor-default">
      {connectingSourceId && (
        <div className="absolute top-28 left-1/2 -translate-x-1/2 z-[100] bg-gray-900 text-white text-xs px-4 py-2 rounded-lg shadow-md font-medium flex items-center gap-2 pointer-events-auto">
          <span>接続先のノードを選択してください</span>
          <button
            onClick={() => setConnectingSourceId(null)}
            className="text-gray-400 hover:text-white text-xs font-bold px-1"
          >
            ✕
          </button>
        </div>
      )}

      <TopBar onExportJSON={handleExportJSON} onImportJSON={handleImportJSON} />

      <Toolbar
        selectedNodeIds={selectedNodeIds}
        isSelectionMode={isSelectionMode}
        setIsSelectionMode={setIsSelectionMode}
        onAddAction={handleAddAction}
        onAutoLayout={handleAutoLayout}
        onOpenEditModal={() => primarySelectedId && setEditingNodeId(primarySelectedId)}
        onOpenStyleModal={() => {
          if (selectedNodeIds.length > 0) {
            setStylingNodeIds(selectedNodeIds); // 単一から複数IDの管理に変更
          }
        }}
        onConnectStart={(nodeId) => {
          handleNodeTapForConnect(nodeId);
          setNodeMenuTarget(null);
        }}
      />

      {/* ノードメニュー */}
      {nodeMenuTarget && (
        <NodeMenu
          target={nodeMenuTarget}
          onClose={() => setNodeMenuTarget(null)}
          onEdit={(id) => setEditingNodeId(id)}
          onConnect={(id) => {
            handleNodeTapForConnect(id);
            setNodeMenuTarget(null);
          }}
          onAddChild={(id) => {
            handleAddChildNode(id);
            setNodeMenuTarget(null);
          }}
          onStyle={(id) => {
            setStylingNodeIds(selectedNodeIds.includes(id) ? selectedNodeIds : [id]);
          }}
          onDelete={(id) => deleteTopic(id)}
        />
      )}

      {/* スタイル変更モーダル */}
      {stylingNodeIds.length > 0 && (
        <StyleNodeModal
          nodeIds={stylingNodeIds}
          onClose={() => setStylingNodeIds([])}
        />
      )}

      {edgeMenuTarget && (
        <EdgeMenu
          target={edgeMenuTarget}
          connectionType={edgeMenuTarget.type}
          onClose={() => setEdgeMenuTarget(null)}
          onUpdateType={(type) => {
            // as ConnectionType を追加して型を明示する
            updateConnectionType(edgeMenuTarget.id, type as ConnectionType);
            setEdgeMenuTarget(null);
          }}
          onDelete={() => {
            deleteConnection(edgeMenuTarget.id);
            setEdgeMenuTarget(null);
          }}
        />
      )}

      {editingNodeId && (
        <EditNodeModal nodeId={editingNodeId} onClose={() => setEditingNodeId(null)} />
      )}

      {/* 画面右下に常駐する新規ノード追加の「＋」ボタン */}
      <div className="absolute bottom-6 right-6 z-50">
        <button
          onClick={handleAddNodeAtCenter}
          className="w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-2xl flex items-center justify-center text-2xl font-bold transition hover:scale-105 active:scale-95"
          title="新しいトピックを追加"
        >
          ＋
        </button>
      </div>

      <ReactFlow
        className="cursor-default"
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={(_, node) => {
          setEditingNodeId(node.id);
        }}
        onPaneClick={onPaneClick}
        onPaneContextMenu={onPaneContextMenu}
        panOnDrag={[1, 2]}
        selectionOnDrag={isSelectionMode}
        selectionKeyCode="Shift"
        multiSelectionKeyCode={['Meta', 'Control', 'Shift']}
        nodesDraggable={true}
        fitView
      >
        <Controls className="!bg-white !border-gray-200 !shadow-sm !rounded-xl" />
        <MiniMap className="hidden md:block !bg-white !border-gray-200 !rounded-xl overflow-hidden" />
        <Background gap={20} size={1} color="#e2e8f0" />
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