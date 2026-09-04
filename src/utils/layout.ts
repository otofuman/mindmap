import dagre from 'dagre';
import {
  type Topic,
  type Connection,
  type TopicDisplay } from '../types/mindmap';

import { calculateNodeDimensions } from './nodeSizeUtils';

export const getLayoutedElements = (
  topics: Topic[],
  connections: Connection[],
  topicDisplays: TopicDisplay[],
  direction: 'LR' | 'TB' = 'LR' // LR: 左から右（デフォルト）, TB: 上から下
): TopicDisplay[] => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  // グラフ全体の設定（方向、ノード間隔、階層間隔）
  dagreGraph.setGraph({
    rankdir: direction,
    nodesep: 50, // ノード同士の垂直間隔
    ranksep: 100, // 階層間の水平間隔
  });

  // ノードをグラフに追加
  topics.forEach((topic) => {
    const display = topicDisplays.find((d) => d.topicId === topic.id);
    // スカラー値と形状から幅・高さを動的に算出
    const { width, height } = calculateNodeDimensions(display?.size, display?.shape);

    dagreGraph.setNode(topic.id, { width, height });
  });

  // 接続をグラフに追加
  connections.forEach((conn) => {
    dagreGraph.setEdge(conn.sourceTopicId, conn.targetTopicId);
  });

  // レイアウト計算実行
  dagre.layout(dagreGraph);

  // 計算された新しい座標を TopicDisplay 配列に反映
  return topicDisplays.map((display) => {
    const nodeWithPosition = dagreGraph.node(display.topicId);
    if (nodeWithPosition) {

      let { width, height } = calculateNodeDimensions(display?.size, display?.shape);

      // Dagreの座標（中心点）を React Flow の左上原点座標に変換
      width = width || 150;
      height = height || 40;

      return {
        ...display,
        position: {
          x: nodeWithPosition.x - width / 2,
          y: nodeWithPosition.y - height / 2,
        },
      };
    }
    return display;
  });
};