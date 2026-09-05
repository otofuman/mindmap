import type { MindMapDocument } from "../types/mindmap";
import { toPng } from 'html-to-image';

export const exportJSON = (
    mapDocument: MindMapDocument, 
    markAllAsSaved?: () => void // ストア側のisSavedをtrueにするコールバック関数
) => {
    const currentMapTitle = mapDocument.meta.title || 'mindmap';
    const inputFileName = window.prompt('保存するファイル名を入力してください:', currentMapTitle);
    if (inputFileName === null) return;

    const sanitizedTitle = inputFileName.trim() || currentMapTitle;
    const fileName = sanitizedTitle.endsWith('.json') ? sanitizedTitle : `${sanitizedTitle}.json`;

    // 1. ストア側で保持しているUndo/Redo履歴などの isSaved を true に更新
    if (markAllAsSaved) {
        markAllAsSaved();
    }

    const jsonString = JSON.stringify(mapDocument, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);

    mapDocument.meta.savedAs = url;
    saveMetaToCookie(mapDocument);
};

export const importJSON = (
    e: React.ChangeEvent<HTMLInputElement>,
    loadDocument: (doc: MindMapDocument) => void,
    fitView: (options?: { duration: number }) => void
) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
    try {
        const parsed = JSON.parse(event.target?.result as string) as MindMapDocument;
        if (parsed.topics && parsed.connections && parsed.topicDisplays) {
        loadDocument(parsed);
        setTimeout(() => fitView({ duration: 300 }), 50);
            saveLastlyOpenedDocumentPathToCookie(file.name);
            console.log(file.name);
        } else {
            alert('無効なフォーマットです。');
        }
    } catch (err) {
        alert('ファイルの読み込みに失敗しました。');
    }
    };
    reader.readAsText(file);
    e.target.value = '';
}

export const saveMetaToCookie = (mapDocument: MindMapDocument) => {
    if (mapDocument.meta.savedAs){
        setCookie('lastlyOpenedDocument', mapDocument.meta.savedAs)
    }
};

export const saveLastlyOpenedDocumentPathToCookie = (name: string) => {
    if (name){
        setCookie('lastlyOpenedDocument', name)
    }
};

/**
 * Cookieに値を保存する
 */
export const setCookie = (name: string, value: string, days: number = 7) => {
  const date = new Date();
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
  const expires = `expires=${date.toUTCString()}`;
  document.cookie = `${name}=${encodeURIComponent(value)}; ${expires}; path=/; SameSite=Lax`;
};

/**
 * Cookieから値を取得する
 */
export const getCookie = (name: string): string | null => {
  const nameEQ = `${name}=`;
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return decodeURIComponent(c.substring(nameEQ.length, c.length));
  }
  return null;
};


/**
 * MindMapDocument を Mermaid 形式に変換し、ファイルとしてダウンロードする
 */
export function exportToMermaidFile(doc: MindMapDocument) {
  const { topics, connections, meta } = doc;
  
  let lines: string[] = [];
  lines.push('graph TD');

  // 1. ノードの定義
  topics.forEach((topic) => {
    const safeTitle = topic.title.replace(/"/g, '\\"');
    lines.push(`  ${topic.id}["${safeTitle}"]`);
  });

  // 2. 接続の定義
  connections.forEach((conn) => {
    let arrow = '-->';
    if (conn.type === 'bi_arrow') {
      arrow = '<-->';
    } else if (conn.type === 'line') {
      arrow = '---';
    }

    const label = conn.memo ? `|"${conn.memo}"|` : '';
    lines.push(`  ${conn.sourceTopicId} ${arrow}${label} ${conn.targetTopicId}`);
  });

  const mermaidCode = lines.join('\n');

  // ファイルとしてダウンロードさせる処理
  const blob = new Blob([mermaidCode], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  // ファイル名はマップのタイトルを基にする（不正な文字を置換）
  const safeTitle = (meta.title || 'mindmap').replace(/[\/\\?%*:|"<>]/g, '_');
  link.href = url;
  link.download = `${safeTitle}.mmd`;
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}


export function exportToImage(mapDocument: MindMapDocument, size: any) {
  const currentMapTitle = mapDocument.meta.title || 'mindmap';
  const inputFileName = window.prompt('保存するファイル名を入力してください:', currentMapTitle);
  if (inputFileName === null) return;
  
  const sanitizedTitle = inputFileName.trim() || currentMapTitle;
  const fileName = sanitizedTitle.endsWith('.png') ? sanitizedTitle : `${sanitizedTitle}.png`;

  // React Flowのビューポート要素を取得
  const viewportElement = document.querySelector('.react-flow__viewport') as HTMLElement;
  if (!viewportElement) return;

  // 1. 現在の表示領域（要素の実際の幅・高さ）を取得
  const width = viewportElement.clientWidth;
  const height = viewportElement.clientHeight;

  console.log(width);

  // 2. ディスプレイの解像度（Retina対応など）を取得。最低でも2倍の綺麗さを担保する
  const pixelRatio = Math.max(Math.max(size.height, size.width)/500, 2);

  toPng(viewportElement, {
    backgroundColor: '#ffffff',
    width: width,
    height: height,
    pixelRatio: pixelRatio, // 表示サイズに対して高解像度化
  })
    .then((dataUrl) => {
      const link = document.createElement('a');
      link.download = fileName;
      link.href = dataUrl;
      link.click();
    })
    .catch((err) => {
      console.error('画像のエクスポートに失敗しました', err);
    });
}