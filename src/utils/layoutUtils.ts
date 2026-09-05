import type {
  Topic,
  Connection,
  TopicDisplay,
  CustomListMaster,
  MilestoneItem,
} from '../types/mindmap';
import { isRoot } from './mindmapUtils';
import { calculateNodeDimensions } from './nodeSizeUtils';

export type LayoutDirection = 'TB' | 'LR';

export interface LayoutOptions {
  spacingX?: number;
  spacingY?: number;
  baseNodeWidth?: number;
  baseNodeHeight?: number;
}

export const getRootTopic = (topics: Topic[], connections: Connection[]) => {
  const rootTopics = topics.filter((t) => isRoot(t.id, connections));
  const rootTopic = rootTopics.length > 0 ? rootTopics[0] : topics[0];

  const childrenMap = new Map<string, string[]>();

  connections.forEach((conn) => {
    if (conn.sourceTopicId === conn.targetTopicId) return;

    const list = childrenMap.get(conn.sourceTopicId) || [];
    if (!list.includes(conn.targetTopicId)) {
      list.push(conn.targetTopicId);
      childrenMap.set(conn.sourceTopicId, list);
    }
  });

  return { rootTopic, childrenMap };
};

type Point = { x: number; y: number };
type NodeSize = { width: number; height: number };
type SubtreeMetrics = { width: number; height: number };

const DEFAULT_OPTIONS: Required<LayoutOptions> = {
  spacingX: 40,
  spacingY: 20,
  baseNodeWidth: 180,
  baseNodeHeight: 60,
};

/**
 * TopicDisplay に width / height がないため、layout 用の概算サイズを作る。
 * size とタイトル長を考慮することで、長いタイトルのノードも多少避ける。
 */
/*const estimateNodeSize = (
  topic: Topic,
  display: TopicDisplay | undefined,
  options: Required<LayoutOptions>
): NodeSize => {
  const scale = Math.max(0.6, display?.size ?? 1);
  const title = topic.title || '';

  const visualLength = Array.from(title).reduce(
    (sum, ch) => sum + (/[ -~]/.test(ch) ? 0.55 : 1),
    0
  );

  const rawWidth = Math.max(
    options.baseNodeWidth,
    Math.min(options.baseNodeWidth * 2.2, 80 + visualLength * 12)
  );

  const lines = Math.max(1, Math.ceil(rawWidth / options.baseNodeWidth));
  const height =
    Math.max(options.baseNodeHeight, options.baseNodeHeight + (lines - 1) * 24) *
    scale;

  return {
    width: rawWidth * scale,
    height,
  };
};*/

const estimateNodeSize = (
  display: TopicDisplay | undefined
): NodeSize => {
  return calculateNodeDimensions(display?.size, display?.shape)
};

const cloneDisplays = (topicDisplays: TopicDisplay[]): TopicDisplay[] =>
  topicDisplays.map((display) => ({
    ...display,
    position: { ...display.position },
  }));

const setPosition = (
  topicDisplays: TopicDisplay[],
  topicId: string,
  position: Point
) => {
  const display = topicDisplays.find((d) => d.topicId === topicId);

  if (display) {
    display.position = position;
    return;
  }

  topicDisplays.push({
    topicId,
    shape: 'rounded_rectangle',
    position,
    size: 1,
    backgroundColor: '#ffffff',
    textColor: '#0f172a',
  });
};

/**
 * 実際の Connection は DAG / 循環を作れるため、
 * layout 時だけ「各ノードを一度だけ使う tree」に変換する。
 *
 * 同じ子に複数の親がある場合は、先に到達した親の枝に所属させる。
 */
const buildLayoutForest = (
  topics: Topic[],
  childrenMap: Map<string, string[]>,
  preferredRootId?: string
): { roots: string[]; treeChildren: Map<string, string[]> } => {
  const treeChildren = new Map<string, string[]>();
  const visited = new Set<string>();

  const visit = (topicId: string) => {
    if (visited.has(topicId)) return;

    visited.add(topicId);

    const children: string[] = [];

    for (const childId of childrenMap.get(topicId) || []) {
      if (!visited.has(childId)) {
        children.push(childId);
        visit(childId);
      }
    }

    treeChildren.set(topicId, children);
  };

  const roots: string[] = [];

  if (preferredRootId && topics.some((t) => t.id === preferredRootId)) {
    roots.push(preferredRootId);
    visit(preferredRootId);
  }

  // root から到達できない component / 孤立 topic もレイアウト対象にする。
  for (const topic of topics) {
    if (!visited.has(topic.id)) {
      roots.push(topic.id);
      visit(topic.id);
    }
  }

  return { roots, treeChildren };
};

const makeSizes = (
  topics: Topic[],
  topicDisplays: TopicDisplay[],
  options: Required<LayoutOptions>
) => {
  const sizes = new Map<string, NodeSize>();
  options

  for (const topic of topics) {
    sizes.set(
      topic.id,
      estimateNodeSize(
        topicDisplays.find((d) => d.topicId === topic.id),
      )
    );
  }

  return sizes;
};

const makeLevelOffsets = (
  roots: string[],
  treeChildren: Map<string, string[]>,
  sizes: Map<string, NodeSize>,
  direction: LayoutDirection,
  spacing: number
): number[] => {
  const maxByDepth: number[] = [];

  const walk = (topicId: string, depth: number) => {
    const size = sizes.get(topicId)!;
    const value = direction === 'LR' ? size.width : size.height;

    maxByDepth[depth] = Math.max(maxByDepth[depth] || 0, value);

    for (const childId of treeChildren.get(topicId) || []) {
      walk(childId, depth + 1);
    }
  };

  roots.forEach((root) => walk(root, 0));

  const offsets: number[] = [0];

  for (let i = 1; i < maxByDepth.length; i++) {
    offsets[i] = offsets[i - 1] + maxByDepth[i - 1] + spacing;
  }

  return offsets;
};

/**
 * Tree / mind-map layout。
 *
 * LR:
 *   親 -> 子を左から右へ配置し、親を子 subtree の中央へ置く。
 *
 * TB:
 *   親 -> 子を上から下へ配置し、親を子 subtree の中央へ置く。
 *
 * 「ノードを置いてから offset を足す」のではなく、
 * subtree が必要とする領域を先に確保してから配置するのがポイント。
 */
export const layoutTree = (
  topics: Topic[],
  connections: Connection[],
  topicDisplays: TopicDisplay[],
  direction: LayoutDirection = 'LR',
  options: LayoutOptions = {}
): TopicDisplay[] => {
  if (topics.length === 0) return cloneDisplays(topicDisplays);

  const config = { ...DEFAULT_OPTIONS, ...options };
  const { rootTopic, childrenMap } = getRootTopic(topics, connections);
  const { roots, treeChildren } = buildLayoutForest(
    topics,
    childrenMap,
    rootTopic?.id
  );

  const sizes = makeSizes(topics, topicDisplays, config);
  const metrics = new Map<string, SubtreeMetrics>();

  const calculateLR = (topicId: string): SubtreeMetrics => {
    const cached = metrics.get(topicId);
    if (cached) return cached;

    const size = sizes.get(topicId)!;
    const children = treeChildren.get(topicId) || [];

    if (children.length === 0) {
      const result = { width: size.width, height: size.height };
      metrics.set(topicId, result);
      return result;
    }

    const childMetrics = children.map(calculateLR);
    const childrenHeight =
      childMetrics.reduce((sum, m) => sum + m.height, 0) +
      (children.length - 1) * config.spacingY;

    const result = {
      width:
        size.width +
        config.spacingX +
        Math.max(...childMetrics.map((m) => m.width)),
      height: Math.max(size.height, childrenHeight),
    };

    metrics.set(topicId, result);
    return result;
  };

  const calculateTB = (topicId: string): SubtreeMetrics => {
    const cached = metrics.get(topicId);
    if (cached) return cached;

    const size = sizes.get(topicId)!;
    const children = treeChildren.get(topicId) || [];

    if (children.length === 0) {
      const result = { width: size.width, height: size.height };
      metrics.set(topicId, result);
      return result;
    }

    const childMetrics = children.map(calculateTB);
    const childrenWidth =
      childMetrics.reduce((sum, m) => sum + m.width, 0) +
      (children.length - 1) * config.spacingX;

    const result = {
      width: Math.max(size.width, childrenWidth),
      height:
        size.height +
        config.spacingY +
        Math.max(...childMetrics.map((m) => m.height)),
    };

    metrics.set(topicId, result);
    return result;
  };

  if (direction === 'LR') {
    roots.forEach(calculateLR);
  } else {
    roots.forEach(calculateTB);
  }

  const levelOffsets = makeLevelOffsets(
    roots,
    treeChildren,
    sizes,
    direction,
    direction === 'LR' ? config.spacingX : config.spacingY
  );

  const result = cloneDisplays(topicDisplays);

  const layoutLR = (topicId: string, topY: number, depth: number) => {
    const size = sizes.get(topicId)!;
    const subtree = metrics.get(topicId)!;
    const children = treeChildren.get(topicId) || [];
    const x = levelOffsets[depth];

    const childMetrics = children.map((c) => metrics.get(c)!);
    const childrenHeight =
      children.length === 0
        ? 0
        : childMetrics.reduce((sum, m) => sum + m.height, 0) +
          (children.length - 1) * config.spacingY;

    const contentTop =
      topY + Math.max(0, (subtree.height - childrenHeight) / 2);

    if (children.length === 0) {
      setPosition(result, topicId, {
        x,
        y: topY + Math.max(0, (subtree.height - size.height) / 2),
      });
      return;
    }

    let childTop = contentTop;

    for (const childId of children) {
      layoutLR(childId, childTop, depth + 1);
      childTop += metrics.get(childId)!.height + config.spacingY;
    }

    setPosition(result, topicId, {
      x,
      y: contentTop + childrenHeight / 2 - size.height / 2,
    });
  };

  const layoutTB = (topicId: string, leftX: number, depth: number) => {
    const size = sizes.get(topicId)!;
    const subtree = metrics.get(topicId)!;
    const children = treeChildren.get(topicId) || [];
    const y = levelOffsets[depth];

    const childMetrics = children.map((c) => metrics.get(c)!);
    const childrenWidth =
      children.length === 0
        ? 0
        : childMetrics.reduce((sum, m) => sum + m.width, 0) +
          (children.length - 1) * config.spacingX;

    const contentLeft =
      leftX + Math.max(0, (subtree.width - childrenWidth) / 2);

    if (children.length === 0) {
      setPosition(result, topicId, {
        x: leftX + Math.max(0, (subtree.width - size.width) / 2),
        y,
      });
      return;
    }

    let childLeft = contentLeft;

    for (const childId of children) {
      layoutTB(childId, childLeft, depth + 1);
      childLeft += metrics.get(childId)!.width + config.spacingX;
    }

    setPosition(result, topicId, {
      x: contentLeft + childrenWidth / 2 - size.width / 2,
      y,
    });
  };

  if (direction === 'LR') {
    let cursorY = 0;

    for (const root of roots) {
      const subtree = metrics.get(root)!;
      layoutLR(root, cursorY, 0);
      cursorY += subtree.height + config.spacingY * 2;
    }
  } else {
    let cursorX = 0;

    for (const root of roots) {
      const subtree = metrics.get(root)!;
      layoutTB(root, cursorX, 0);
      cursorX += subtree.width + config.spacingX * 2;
    }
  }

  return result;
};

export const layoutFlowTop = (
  topics: Topic[],
  connections: Connection[],
  topicDisplays: TopicDisplay[],
  options: LayoutOptions = {}
): TopicDisplay[] =>
  layoutTree(topics, connections, topicDisplays, 'TB', options);

export const layoutFlowLeft = (
  topics: Topic[],
  connections: Connection[],
  topicDisplays: TopicDisplay[],
  options: LayoutOptions = {}
): TopicDisplay[] =>
  layoutTree(topics, connections, topicDisplays, 'LR', options);

const getDateValue = (topic: Topic): number | null => {
  const value = Object.values(topic.customValues || {}).find(
    (v) => typeof v === 'string' && !Number.isNaN(Date.parse(v))
  );

  if (typeof value !== 'string') return null;

  const time = Date.parse(value);
  return Number.isNaN(time) ? null : time;
};

export const layoutCluster = (
  topics: Topic[],
  connections: Connection[],
  topicDisplays: TopicDisplay[],
  options: LayoutOptions = {}
): TopicDisplay[] => {
  if (topics.length === 0) {
    return cloneDisplays(topicDisplays);
  }

  const config = {
    ...DEFAULT_OPTIONS,
    ...options,
    spacingX: options.spacingX ?? 30,
    spacingY: options.spacingY ?? 20,
  };

  const result = cloneDisplays(topicDisplays);

  /*
   * ------------------------------------------------------------
   * Node size
   * ------------------------------------------------------------
   */

  const sizes = new Map<string, NodeSize>();

  for (const topic of topics) {
    const display = topicDisplays.find(
      (d) => d.topicId === topic.id
    );

    sizes.set(
      topic.id,
      estimateNodeSize(display)
    );
  }

  /*
   * ------------------------------------------------------------
   * Graph
   * ------------------------------------------------------------
   */

  const neighbors = new Map<string, Set<string>>();

  for (const topic of topics) {
    neighbors.set(topic.id, new Set());
  }

  for (const connection of connections) {
    const source = connection.sourceTopicId;
    const target = connection.targetTopicId;

    if (source === target) continue;

    if (!neighbors.has(source)) {
      neighbors.set(source, new Set());
    }

    if (!neighbors.has(target)) {
      neighbors.set(target, new Set());
    }

    neighbors.get(source)!.add(target);
    neighbors.get(target)!.add(source);
  }

  /*
   * ------------------------------------------------------------
   * Centrality
   *
   * 接続数の多いTopicを中心に寄せる。
   * ------------------------------------------------------------
   */

  const centrality = new Map<string, number>();

  for (const topic of topics) {
    const firstNeighbors =
      neighbors.get(topic.id) || new Set();

    let score = firstNeighbors.size;

    for (const neighborId of firstNeighbors) {
      const neighborDegree =
        neighbors.get(neighborId)?.size || 0;

      score += neighborDegree * 0.35;
    }

    centrality.set(topic.id, score);
  }

  /*
   * ------------------------------------------------------------
   * Center
   * ------------------------------------------------------------
   */

  const centerTopic = [...topics].sort(
    (a, b) =>
      (centrality.get(b.id) || 0) -
      (centrality.get(a.id) || 0)
  )[0];

  if (!centerTopic) {
    return result;
  }

  const centerSize = sizes.get(centerTopic.id)!;

  const layoutedIds = new Set<string>();

  setPosition(result, centerTopic.id, {
    x: -centerSize.width / 2,
    y: -centerSize.height / 2,
  });

  layoutedIds.add(centerTopic.id);

  /*
   * ------------------------------------------------------------
   * Graph distance
   * ------------------------------------------------------------
   */

  const distance = new Map<string, number>();
  const queue: string[] = [centerTopic.id];

  distance.set(centerTopic.id, 0);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentDistance = distance.get(current)!;

    for (const neighborId of neighbors.get(current) || []) {
      if (distance.has(neighborId)) continue;

      distance.set(
        neighborId,
        currentDistance + 1
      );

      queue.push(neighborId);
    }
  }

  /*
   * ------------------------------------------------------------
   * Layers
   * ------------------------------------------------------------
   */

  const layers = new Map<number, string[]>();

  for (const topic of topics) {
    if (topic.id === centerTopic.id) continue;

    const d = distance.get(topic.id);

    if (d === undefined) continue;

    const layer = layers.get(d) || [];

    layer.push(topic.id);
    layers.set(d, layer);
  }

  /*
   * ------------------------------------------------------------
   * Spacing
   * ------------------------------------------------------------
   */

  const minGap = Math.max(
    Math.min(config.spacingX, config.spacingY),
    70
  );

  /*
   * 中心から第1レイヤーまでの距離。
   *
   * global maxNodeSize を使わず、
   * 実際に隣接するノードのサイズだけを見る。
   */

  const rootChildren =
    layers.get(1) || [];

  const firstLayerMaxSize =
    rootChildren.length > 0
      ? Math.max(
          ...rootChildren.map((id) => {
            const size = sizes.get(id)!;
            return Math.max(
              size.width,
              size.height
            );
          })
        )
      : 0;

  let previousRadius =
    Math.max(
      centerSize.width,
      centerSize.height
    ) / 2 +
    firstLayerMaxSize / 2 +
    minGap;

  let previousLayerMaxSize = firstLayerMaxSize;

  /*
   * ------------------------------------------------------------
   * Layer layout
   * ------------------------------------------------------------
   */

  const layerEntries = [...layers.entries()].sort(
    ([a], [b]) => a - b
  );

  for (const [layerIndex, layer] of layerEntries) {
    if (layer.length === 0) continue;

    /*
     * 接続数の多いものを中央寄りに。
     */

    layer.sort(
      (a, b) =>
        (centrality.get(b) || 0) -
        (centrality.get(a) || 0)
    );

    /*
     * ----------------------------------------------------------
     * Node arc
     *
     * 実際のノードサイズから、
     * 円周方向に必要な長さを求める。
     * ----------------------------------------------------------
     */

    const nodeArcs = layer.map((topicId) => {
      const size = sizes.get(topicId)!;

      return (
        Math.max(size.width, size.height) +
        minGap
      );
    });

    const totalNodeArc = nodeArcs.reduce(
      (sum, value) => sum + value,
      0
    );

    /*
     * ----------------------------------------------------------
     * Angle
     *
     * クラスターを広げすぎない。
     * ----------------------------------------------------------
     */

    let totalAngle: number;

    if (layer.length === 1) {
      totalAngle = 0;
    } else if (layer.length === 2) {
      totalAngle = Math.PI * 0.55;
    } else if (layer.length <= 4) {
      totalAngle = Math.PI * 0.80;
    } else {
      totalAngle = Math.min(
        Math.PI * 1.35,
        Math.max(
          Math.PI * 0.90,
          layer.length * 0.30
        )
      );
    }

    /*
     * ----------------------------------------------------------
     * Radius
     *
     * ここが重要。
     *
     * 以前:
     *
     *   requiredCircumference / (2π)
     *
     * としていたため、360°分のスペースを確保して
     * 実際には一部の角度しか使わないという無駄があった。
     *
     * 今回は
     *
     *   必要な弧長 / 使用する角度
     *
     * から半径を求める。
     * ----------------------------------------------------------
     */

    let radius: number;

    if (layer.length === 1) {
      radius =
        previousRadius +
        previousLayerMaxSize / 2 +
        Math.max(
          sizes.get(layer[0])!.width,
          sizes.get(layer[0])!.height
        ) / 2 +
        minGap;
    } else {
      const arcRadius =
        totalNodeArc / totalAngle;

      /*
       * 前レイヤーとの衝突を防ぐ最低半径。
       */

      const currentLayerMaxSize =
        Math.max(
          ...layer.map((id) => {
            const size = sizes.get(id)!;
            return Math.max(
              size.width,
              size.height
            );
          })
        );

      const minimumRadius =
        previousRadius +
        previousLayerMaxSize / 2 +
        currentLayerMaxSize / 2 +
        minGap;

      /*
       * 円弧として必要な半径と、
       * 前レイヤーとの衝突回避の大きい方。
       *
       * さらに少し圧縮して、
       * クラスター感を維持する。
       */

      radius = Math.max(
        arcRadius * 0.90,
        minimumRadius
      );
    }

    /*
     * レイヤーごとに少し角度をずらす。
     */

    const angleOffset =
      layerIndex % 2 === 0
        ? -Math.PI / 2
        : Math.PI / 2;

    /*
     * ----------------------------------------------------------
     * Place nodes
     * ----------------------------------------------------------
     */

    let currentArc = 0;

    for (let i = 0; i < layer.length; i++) {
      const topicId = layer[i];
      const size = sizes.get(topicId)!;
      const nodeArc = nodeArcs[i];

      const angle =
        layer.length === 1
          ? angleOffset
          : angleOffset -
            totalAngle / 2 +
            (
              currentArc +
              nodeArc / 2
            ) /
              totalNodeArc *
              totalAngle;

      const x =
        Math.cos(angle) * radius -
        size.width / 2;

      const y =
        Math.sin(angle) * radius -
        size.height / 2;

      setPosition(result, topicId, {
        x,
        y,
      });

      layoutedIds.add(topicId);

      currentArc += nodeArc;
    }

    /*
     * 次のレイヤーの基準。
     */

    previousRadius = radius;

    previousLayerMaxSize = Math.max(
      ...layer.map((id) => {
        const size = sizes.get(id)!;
        return Math.max(
          size.width,
          size.height
        );
      })
    );
  }

  /*
   * ------------------------------------------------------------
   * Disconnected components
   * ------------------------------------------------------------
   */

  /*
 * ------------------------------------------------------------
 * Edge length optimization
 *
 * cluster layout を初期解として、
 * 接続線の総長が短くなる方向へ少しずつ調整する。
 *
 * 「完全なグラフ最適化」ではなく、
 * cluster の形を壊さない範囲で局所改善する。
 * ------------------------------------------------------------
 */

const edgeIterations = 15;

/*
 * これ以上中心から離れない。
 *
 * cluster の元の位置を基準にすることで、
 * 線を短くするためだけにノードが
 * 遠くへ引っ張られるのを防ぐ。
 */
const originalPositions = new Map<
  string,
  { x: number; y: number }
>();

for (const topic of topics) {
  const display = result.find(
    (d) => d.topicId === topic.id
  );

  if (!display) continue;

  originalPositions.set(topic.id, {
    x: display.position.x,
    y: display.position.y,
  });
}

/*
 * 接続グラフ
 */
const edgeNeighbors = new Map<
  string,
  string[]
>();

for (const topic of topics) {
  edgeNeighbors.set(topic.id, []);
}

for (const connection of connections) {
  if (
    !edgeNeighbors.has(
      connection.sourceTopicId
    ) ||
    !edgeNeighbors.has(
      connection.targetTopicId
    )
  ) {
    continue;
  }

  if (
    connection.sourceTopicId ===
    connection.targetTopicId
  ) {
    continue;
  }

  edgeNeighbors
    .get(connection.sourceTopicId)!
    .push(connection.targetTopicId);

  edgeNeighbors
    .get(connection.targetTopicId)!
    .push(connection.sourceTopicId);
}

/*
 * ------------------------------------------------------------
 * Iterative local optimization
 * ------------------------------------------------------------
 */

for (
  let iteration = 0;
  iteration < edgeIterations;
  iteration++
) {
  /*
   * 後半ほど動きを小さくする。
   */
  const attraction =
    0.18 *
    (1 - iteration / edgeIterations * 0.65);

  const clusterStiffness =
    0.10;

  for (const topic of topics) {
    const display = result.find(
      (d) => d.topicId === topic.id
    );

    if (!display) continue;

    const neighbors =
      edgeNeighbors.get(topic.id) || [];

    if (neighbors.length === 0) continue;

    const size = sizes.get(topic.id)!;

    const centerX =
      display.position.x +
      size.width / 2;

    const centerY =
      display.position.y +
      size.height / 2;

    /*
     * 接続先の中心。
     */
    let targetX = 0;
    let targetY = 0;
    let count = 0;

    for (const neighborId of neighbors) {
      const neighborDisplay =
        result.find(
          (d) => d.topicId === neighborId
        );

      if (!neighborDisplay) continue;

      const neighborSize =
        sizes.get(neighborId)!;

      targetX +=
        neighborDisplay.position.x +
        neighborSize.width / 2;

      targetY +=
        neighborDisplay.position.y +
        neighborSize.height / 2;

      count++;
    }

    if (count === 0) continue;

    targetX /= count;
    targetY /= count;

    /*
     * 接続先方向へ引っ張る。
     */
    let dx =
      (targetX - centerX) *
      attraction;

    let dy =
      (targetY - centerY) *
      attraction;

    /*
     * --------------------------------------------------------
     * Cluster stiffness
     *
     * 元のcluster位置から離れすぎないようにする。
     * --------------------------------------------------------
     */

    const original =
      originalPositions.get(topic.id);

    if (original) {
      const originalCenterX =
        original.x +
        size.width / 2;

      const originalCenterY =
        original.y +
        size.height / 2;

      dx +=
        (originalCenterX - centerX) *
        clusterStiffness;

      dy +=
        (originalCenterY - centerY) *
        clusterStiffness;
    }

    display.position.x += dx;
    display.position.y += dy;
  }

  /*
   * ----------------------------------------------------------
   * Overlap correction
   *
   * 最適化によってノードが重なった場合だけ押し戻す。
   * ----------------------------------------------------------
   */

  for (let i = 0; i < topics.length; i++) {
    const topicA = topics[i];

    const displayA = result.find(
      (d) => d.topicId === topicA.id
    );

    if (!displayA) continue;

    const sizeA = sizes.get(topicA.id)!;

    for (
      let j = i + 1;
      j < topics.length;
      j++
    ) {
      const topicB = topics[j];

      const displayB = result.find(
        (d) => d.topicId === topicB.id
      );

      if (!displayB) continue;

      const sizeB = sizes.get(topicB.id)!;

      const centerAX =
        displayA.position.x +
        sizeA.width / 2;

      const centerAY =
        displayA.position.y +
        sizeA.height / 2;

      const centerBX =
        displayB.position.x +
        sizeB.width / 2;

      const centerBY =
        displayB.position.y +
        sizeB.height / 2;

      const overlapX =
        (sizeA.width + sizeB.width) / 2 +
        minGap -
        Math.abs(centerAX - centerBX);

      const overlapY =
        (sizeA.height + sizeB.height) / 2 +
        minGap -
        Math.abs(centerAY - centerBY);

      if (
        overlapX <= 0 ||
        overlapY <= 0
      ) {
        continue;
      }

      /*
       * より浅い方向に押し出す。
       */
      if (overlapX < overlapY) {
        const direction =
          centerAX < centerBX ? -1 : 1;

        const shift =
          overlapX / 2;

        displayA.position.x +=
          direction * shift;

        displayB.position.x -=
          direction * shift;
      } else {
        const direction =
          centerAY < centerBY ? -1 : 1;

        const shift =
          overlapY / 2;

        displayA.position.y +=
          direction * shift;

        displayB.position.y -=
          direction * shift;
      }
    }
  }
}

  const orphanTopics = topics.filter(
    (topic) => !layoutedIds.has(topic.id)
  );

  if (orphanTopics.length > 0) {
    const orphanStartX =
      previousRadius +
      previousLayerMaxSize +
      minGap;

    let orphanY = 0;

    for (const topic of orphanTopics) {
      const size = sizes.get(topic.id)!;

      setPosition(result, topic.id, {
        x: orphanStartX,
        y: orphanY,
      });

      orphanY +=
        size.height +
        config.spacingY;

      layoutedIds.add(topic.id);
    }
  }

  return result;
};

export const layoutCustomList = (
  topics: Topic[],
  connections: Connection[],
  topicDisplays: TopicDisplay[],
  customLists: CustomListMaster[],
  mode: string,
  options: LayoutOptions = {}
): TopicDisplay[] => {
  if (topics.length === 0) {
    return cloneDisplays(topicDisplays);
  }

  const config = {
    ...DEFAULT_OPTIONS,
    ...options,
    spacingX: options.spacingX ?? 30,
    spacingY: options.spacingY ?? 20,
  };

  const result = cloneDisplays(topicDisplays);

  /*const { rootTopic, childrenMap } = getRootTopic(
    topics,
    connections
  );*/

  const targetList = customLists.find(
    (list) => list.id === mode || list.name === mode
  );

  if (!targetList) {
    return result;
  }

  /*
   * ============================================================
   * Calendar
   * ============================================================
   */

  if (targetList.type === 'calendar') {
    const sortedTopics = [...topics].sort((a, b) => {
      const dateA = getDateValue(a);
      const dateB = getDateValue(b);

      if (dateA === null && dateB === null) return 0;
      if (dateA === null) return 1;
      if (dateB === null) return -1;

      return dateA - dateB;
    });

    let y = 0;

    for (const topic of sortedTopics) {
      const size = estimateNodeSize(
        topicDisplays.find(
          (d) => d.topicId === topic.id
        )
      );

      setPosition(result, topic.id, {
        x: 0,
        y,
      });

      y += size.height + config.spacingY;
    }

    return result;
  }

  /*
   * ============================================================
   * Number
   * ============================================================
   */

  if (targetList.type === 'number') {
    const sortedTopics = [...topics].sort((a, b) => {
      const valueA = getCustomListNumberValue(
        a,
        targetList.id
      );

      const valueB = getCustomListNumberValue(
        b,
        targetList.id
      );

      if (valueA === null && valueB === null) return 0;
      if (valueA === null) return 1;
      if (valueB === null) return -1;

      return valueA - valueB;
    });

    let y = 0;

    for (const topic of sortedTopics) {
      const size = estimateNodeSize(
        topicDisplays.find(
          (d) => d.topicId === topic.id
        )
      );

      setPosition(result, topic.id, {
        x: 0,
        y,
      });

      y += size.height + config.spacingY;
    }

    return result;
  }

  /*
   * ============================================================
   * Milestone
   *
   * 通常のリストとは逆に、
   * milestone item の parent/child 構造をそのまま
   * ツリーとして配置する。
   * ============================================================
   */

  if (targetList.type === 'milestone') {
    const milestoneItems =
      targetList.items as MilestoneItem[];

    /*
     * itemId -> Topic[]
     *
     * 同じ milestone item に属するTopicをまとめる。
     */
    const topicGroups = new Map<string, Topic[]>();

    for (const topic of topics) {
      const itemId = getCustomListItemId(
        topic,
        targetList.id
      );

      if (!itemId) continue;

      const group = topicGroups.get(itemId) || [];
      group.push(topic);
      topicGroups.set(itemId, group);
    }

    /*
     * Milestone item の親子関係。
     */
    const itemChildren = new Map<
      string | null,
      MilestoneItem[]
    >();

    for (const item of milestoneItems) {
      const list =
        itemChildren.get(item.parentId) || [];

      list.push(item);
      itemChildren.set(item.parentId, list);
    }

    /*
     * item単位のサイズを計算。
     *
     * 中身のTopicを縦に積んだときの大きさを、
     * 「そのitemという1ノード」の大きさとして扱う。
     */

    const itemSizes = new Map<
      string,
      NodeSize
    >();

    for (const item of milestoneItems) {
      const group =
        topicGroups.get(item.id) || [];

      if (group.length === 0) {
        itemSizes.set(item.id, {
          width: config.baseNodeWidth,
          height: config.baseNodeHeight,
        });

        continue;
      }

      let width = 0;
      let height = 0;

      for (const topic of group) {
        const size = estimateNodeSize(
          topicDisplays.find(
            (d) => d.topicId === topic.id
          )
        );

        width = Math.max(width, size.width);
        height += size.height;
      }

      height +=
        Math.max(0, group.length - 1) *
        config.spacingY;

      itemSizes.set(item.id, {
        width,
        height,
      });
    }

    /*
     * milestone tree を再帰的に配置。
     *
     * item自体を1ノードとして扱い、
     * その内部にTopic群を展開する。
     */

    const layoutMilestoneItem = (
      item: MilestoneItem,
      x: number,
      y: number
    ): number => {
      const group =
        topicGroups.get(item.id) || [];

      const itemSize =
        itemSizes.get(item.id) || {
          width: config.baseNodeWidth,
          height: config.baseNodeHeight,
        };

      /*
       * Topic群をitemの内部に配置。
       *
       * 横方向は中央揃え。
       */
      let topicY = y;

      for (const topic of group) {
        const size = estimateNodeSize(
          topicDisplays.find(
            (d) => d.topicId === topic.id
          )
        );

        setPosition(result, topic.id, {
          x:
            x +
            (itemSize.width - size.width) / 2,
          y: topicY,
        });

        topicY +=
          size.height +
          config.spacingY;
      }

      /*
       * 子itemを右方向へ。
       */
      const children =
        itemChildren.get(item.id) || [];

      let childY = y;

      for (const child of children) {
        childY = layoutMilestoneItem(
          child,
          x +
            itemSize.width +
            config.spacingX,
          childY
        );
      }

      return Math.max(
        topicY,
        childY
      );
    };

    const roots =
      itemChildren.get(null) || [];

    let y = 0;

    for (const item of roots) {
      y = layoutMilestoneItem(
        item,
        0,
        y
      );
    }

    return result;
  }

  /*
   * ============================================================
   * List / Person / Text
   *
   * 「項目 = 1巨大ノード」としてクラスターを作る。
   * ============================================================
   */

  const items = targetList.items || [];

  /*
   * itemId -> Topic[]
   */
  const groups = new Map<
    string,
    Topic[]
  >();

  /*
   * Listに所属しないTopic
   */
  const ungrouped: Topic[] = [];

  for (const topic of topics) {
    const itemId = getCustomListItemId(
      topic,
      targetList.id
    );

    if (!itemId) {
      ungrouped.push(topic);
      continue;
    }

    const group = groups.get(itemId) || [];
    group.push(topic);
    groups.set(itemId, group);
  }

  /*
   * ------------------------------------------------------------
   * 各項目を「巨大な1ノード」として評価
   *
   * グループ内Topicの
   *   - 数
   *   - 接続数
   *   - ノードサイズ
   *
   * からクラスターの大きさを求める。
   * ------------------------------------------------------------
   */

  type GroupInfo = {
    itemId: string;
    topics: Topic[];
    width: number;
    height: number;
    centrality: number;
  };

  const groupInfos: GroupInfo[] = [];

  for (const item of items) {
    const group =
      groups.get(item.id) || [];

    if (group.length === 0) continue;

    let width = 0;
    let height = 0;
    let centrality = 0;

    for (const topic of group) {
      const size = estimateNodeSize(
        topicDisplays.find(
          (d) => d.topicId === topic.id
        )
      );

      width = Math.max(
        width,
        size.width
      );

      height += size.height;

      const degree =
        connections.filter(
          (connection) =>
            connection.sourceTopicId === topic.id ||
            connection.targetTopicId === topic.id
        ).length;

      centrality += degree;
    }

    height +=
      Math.max(0, group.length - 1) *
      config.spacingY;

    groupInfos.push({
      itemId: item.id,
      topics: group,
      width,
      height,
      centrality,
    });
  }

  /*
   * ------------------------------------------------------------
   * Group間の疑似グラフ
   *
   * 異なる項目に属するTopic同士のConnectionを
   * 「項目同士のConnection」として集約する。
   * ------------------------------------------------------------
   */

  const groupIdByTopicId = new Map<
    string,
    string
  >();

  for (const info of groupInfos) {
    for (const topic of info.topics) {
      groupIdByTopicId.set(
        topic.id,
        info.itemId
      );
    }
  }

  const groupNeighbors = new Map<
    string,
    Set<string>
  >();

  for (const info of groupInfos) {
    groupNeighbors.set(
      info.itemId,
      new Set()
    );
  }

  for (const connection of connections) {
    const sourceGroup =
      groupIdByTopicId.get(
        connection.sourceTopicId
      );

    const targetGroup =
      groupIdByTopicId.get(
        connection.targetTopicId
      );

    if (
      !sourceGroup ||
      !targetGroup ||
      sourceGroup === targetGroup
    ) {
      continue;
    }

    groupNeighbors
      .get(sourceGroup)!
      .add(targetGroup);

    groupNeighbors
      .get(targetGroup)!
      .add(sourceGroup);
  }

  /*
   * ------------------------------------------------------------
   * 項目クラスターの中心を決定
   *
   * 「Topicの接続数」＋「項目間の接続数」
   * で中心性を評価。
   * ------------------------------------------------------------
   */

  const groupCentrality =
    new Map<string, number>();

  for (const info of groupInfos) {
    const groupDegree =
      groupNeighbors
        .get(info.itemId)
        ?.size || 0;

    groupCentrality.set(
      info.itemId,
      info.centrality +
        groupDegree * 2
    );
  }

  const centerGroup =
    [...groupInfos].sort(
      (a, b) =>
        (groupCentrality.get(b.itemId) || 0) -
        (groupCentrality.get(a.itemId) || 0)
    )[0];

  if (!centerGroup) {
    return result;
  }

  /*
   * ------------------------------------------------------------
   * 項目間の距離をBFS
   * ------------------------------------------------------------
   */

  const groupDistance =
    new Map<string, number>();

  const groupQueue: string[] = [
    centerGroup.itemId,
  ];

  groupDistance.set(
    centerGroup.itemId,
    0
  );

  while (groupQueue.length > 0) {
    const current =
      groupQueue.shift()!;

    const currentDistance =
      groupDistance.get(current)!;

    for (
      const neighbor of
        groupNeighbors.get(current) || []
    ) {
      if (groupDistance.has(neighbor)) {
        continue;
      }

      groupDistance.set(
        neighbor,
        currentDistance + 1
      );

      groupQueue.push(neighbor);
    }
  }

  /*
   * ------------------------------------------------------------
   * 項目クラスターを配置
   *
   * 実際のTopicではなく、
   * 各項目を1ノードとみなして配置する。
   * ------------------------------------------------------------
   */

  const groupLayers =
    new Map<number, GroupInfo[]>();

  for (const info of groupInfos) {
    if (info.itemId === centerGroup.itemId) {
      continue;
    }

    const d =
      groupDistance.get(info.itemId);

    if (d === undefined) continue;

    const layer =
      groupLayers.get(d) || [];

    layer.push(info);
    groupLayers.set(d, layer);
  }

  /*
   * Center group は内部Topicだけ配置。
   */
  const layoutGroup = (
  info: GroupInfo,
  centerX: number,
  centerY: number
) => {
  const group = [...info.topics];

  if (group.length === 0) return;

  /*
   * ----------------------------------------------------------
   * Group internal cluster
   *
   * 「同じ項目」という集合性を強くする一方、
   * 集団内の接続構造によるクラスター感は残す。
   *
   * layoutCluster をそのまま使うと広がりすぎるため、
   * まずローカルclusterを作り、
   * その結果を集団中心へ圧縮する。
   * ----------------------------------------------------------
   */

  const localDisplays = cloneDisplays(result).filter(
    (display) =>
      group.some(
        (topic) =>
          topic.id === display.topicId
      )
  );

  const localConnections = connections.filter(
    (connection) =>
      group.some(
        (topic) =>
          topic.id === connection.sourceTopicId
      ) &&
      group.some(
        (topic) =>
          topic.id === connection.targetTopicId
      )
  );

  /*
   * 通常のcluster layout。
   *
   * ここで接続数の多いTopicが中心になる。
   */
  const localResult = layoutCluster(
    group,
    localConnections,
    localDisplays,
    {
      ...config,

      /*
       * 集団内部なので通常より狭くする。
       */
      spacingX: config.spacingX * 0.45,
      spacingY: config.spacingY * 0.45,
    }
  );

  /*
   * ----------------------------------------------------------
   * Local bounding box
   * ----------------------------------------------------------
   */

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const topic of group) {
    const display = localResult.find(
      (d) => d.topicId === topic.id
    );

    if (!display) continue;

    const size = estimateNodeSize(display);

    minX = Math.min(
      minX,
      display.position.x
    );

    minY = Math.min(
      minY,
      display.position.y
    );

    maxX = Math.max(
      maxX,
      display.position.x + size.width
    );

    maxY = Math.max(
      maxY,
      display.position.y + size.height
    );
  }

  if (
    !Number.isFinite(minX) ||
    !Number.isFinite(minY)
  ) {
    return;
  }

  const localCenterX =
    (minX + maxX) / 2;

  const localCenterY =
    (minY + maxY) / 2;

  /*
   * ----------------------------------------------------------
   * Compression
   *
   * clusterの形は維持しつつ、
   * 集団全体を一定割合まで圧縮する。
   *
   * 1.0 = layoutClusterそのまま
   * 0.7 = 30%圧縮
   * 0.5 = 半分
   *
   * 今回は 0.65 程度。
   * ----------------------------------------------------------
   */

  const compression = 0.65;

  /*
   * ノード同士が重ならない最低限のスケールを
   * 実際のノードサイズから確認する。
   *
   * 完全に圧縮しきらず、
   * 「クラスター感」を残す。
   */

  for (const topic of group) {
    const localDisplay = localResult.find(
      (d) => d.topicId === topic.id
    );

    if (!localDisplay) continue;

    const size = estimateNodeSize(
      topicDisplays.find(
        (d) => d.topicId === topic.id
      )
    );

    const dx =
      localDisplay.position.x +
      size.width / 2 -
      localCenterX;

    const dy =
      localDisplay.position.y +
      size.height / 2 -
      localCenterY;

    /*
     * 中心方向へ圧縮。
     */
    let x =
      centerX +
      dx * compression -
      size.width / 2;

    let y =
      centerY +
      dy * compression -
      size.height / 2;

    setPosition(
      result,
      topic.id,
      {
        x,
        y,
      }
    );
  }

  /*
   * ----------------------------------------------------------
   * Overlap correction
   *
   * 圧縮しすぎてTopic同士が重なった場合だけ、
   * 最小限の押し広げを行う。
   *
   * これによって
   *
   *   ○ ○
   *    ○
   *
   * のようなcluster形状は維持しながら、
   * 完全な重なりだけを防ぐ。
   * ----------------------------------------------------------
   */

  const maxIterations = 8;

  for (
    let iteration = 0;
    iteration < maxIterations;
    iteration++
  ) {
    let moved = false;

    for (let i = 0; i < group.length; i++) {
      const a = group[i];

      const displayA = result.find(
        (d) => d.topicId === a.id
      );

      if (!displayA) continue;

      const sizeA = estimateNodeSize(
        displayA
      );

      for (
        let j = i + 1;
        j < group.length;
        j++
      ) {
        const b = group[j];

        const displayB = result.find(
          (d) => d.topicId === b.id
        );

        if (!displayB) continue;

        const sizeB = estimateNodeSize(
          displayB
        );

        const centerAX =
          displayA.position.x +
          sizeA.width / 2;

        const centerAY =
          displayA.position.y +
          sizeA.height / 2;

        const centerBX =
          displayB.position.x +
          sizeB.width / 2;

        const centerBY =
          displayB.position.y +
          sizeB.height / 2;

        const overlapX =
          (sizeA.width + sizeB.width) / 2 +
          config.spacingX * 0.25 -
          Math.abs(centerAX - centerBX);

        const overlapY =
          (sizeA.height + sizeB.height) / 2 +
          config.spacingY * 0.25 -
          Math.abs(centerAY - centerBY);

        if (
          overlapX <= 0 ||
          overlapY <= 0
        ) {
          continue;
        }

        /*
         * 重なりが少ない方向へ押し出す。
         */
        if (overlapX < overlapY) {
          const direction =
            centerAX <= centerBX
              ? -1
              : 1;

          const shift =
            overlapX / 2;

          displayA.position.x +=
            direction * shift;

          displayB.position.x -=
            direction * shift;
        } else {
          const direction =
            centerAY <= centerBY
              ? -1
              : 1;

          const shift =
            overlapY / 2;

          displayA.position.y +=
            direction * shift;

          displayB.position.y -=
            direction * shift;
        }

        moved = true;
      }
    }

    if (!moved) break;
  }
};

  /*
   * 中心グループ。
   */
  layoutGroup(
    centerGroup,
    0,
    0
  );

  /*
   * 外側のグループ。
   */

  let previousRadius = Math.max(
    centerGroup.width,
    centerGroup.height
  ) / 2 + config.spacingX;

  for (const [distance, layer] of [...groupLayers.entries()].sort(
    ([a], [b]) => a - b
  )) {
    if (layer.length === 0) continue;
    distance;
    
    layer.sort(
      (a, b) =>
        (groupCentrality.get(b.itemId) || 0) -
        (groupCentrality.get(a.itemId) || 0)
    );

    const maxSize = Math.max(
      ...layer.map(
        (group) =>
          Math.max(
            group.width,
            group.height
          )
      )
    );

    const radius =
      previousRadius +
      maxSize / 2 +
      config.spacingX;

    const totalAngle =
      layer.length === 1
        ? 0
        : Math.min(
            Math.PI * 1.4,
            Math.max(
              Math.PI * 0.8,
              layer.length * 0.45
            )
          );

    const startAngle =
      -Math.PI / 2 -
      totalAngle / 2;

    let current = 0;

    const totalWeight =
      layer.reduce(
        (sum, group) =>
          sum +
          Math.sqrt(
            Math.max(
              1,
              group.centrality
            )
          ),
        0
      );

    for (const group of layer) {
      const weight =
        Math.sqrt(
          Math.max(
            1,
            group.centrality
          )
        );

      const angle =
        layer.length === 1
          ? -Math.PI / 2
          : startAngle +
            (
              current +
              weight / 2
            ) /
              totalWeight *
              totalAngle;

      const x =
        Math.cos(angle) * radius;

      const y =
        Math.sin(angle) * radius;

      layoutGroup(
        group,
        x,
        y
      );

      current += weight;
    }

    previousRadius =
      radius;
  }

  /*
   * ------------------------------------------------------------
   * グループに属していないTopic
   * ------------------------------------------------------------
   */

  if (ungrouped.length > 0) {
    let y = 0;

    const x =
      previousRadius +
      config.spacingX * 2;

    for (const topic of ungrouped) {
      const size =
        estimateNodeSize(
          topicDisplays.find(
            (d) => d.topicId === topic.id
          )
        );

      setPosition(result, topic.id, {
        x,
        y,
      });

      y +=
        size.height +
        config.spacingY;
    }
  }

  return result;
};

const getCustomListItemId = (
  topic: Topic,
  listId: string
): string | null => {
  const value = topic.customValues?.[listId];

  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'object' && 'id' in value) {
    return String(value.id);
  }

  return null;
};

const getCustomListNumberValue = (
  topic: Topic,
  listId: string
): number | null => {
  const value = topic.customValues?.[listId];

  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
};

/**
 * autoLayout の mode をここで解決する。
 * auto は mind-map として見やすい LR を採用する。
 */
export const autoLayoutTopics = (
  mode: 'auto' | 'flow-top' | 'flow-left' | string,
  topics: Topic[],
  connections: Connection[],
  topicDisplays: TopicDisplay[],
  customLists: CustomListMaster[]
): TopicDisplay[] => {
  switch (mode) {
    case 'auto':
    case 'flow-left':
      return layoutFlowLeft(topics, connections, topicDisplays);

    case 'flow-top':
      return layoutFlowTop(topics, connections, topicDisplays);

    case 'cluster':
      return layoutCluster(topics, connections, topicDisplays);

    default:
      return layoutCustomList(
        topics,
        connections,
        topicDisplays,
        customLists,
        mode
      );
  }
};
