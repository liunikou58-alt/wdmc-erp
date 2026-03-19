import { useRef, useState, useEffect } from 'react';

/**
 * 手寫電子簽名元件
 * 用法: <SignaturePad onSave={(dataUrl) => {...}} width={400} height={200} />
 */
export default function SignaturePad({ onSave, onCancel, width = 400, height = 180, initialData = null }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasContent, setHasContent] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (initialData) {
      const img = new Image();
      img.onload = () => { ctx.drawImage(img, 0, 0); setHasContent(true); };
      img.src = initialData;
    }
  }, [width, height, initialData]);

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches ? e.touches[0] : e;
    return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
  };

  const start = (e) => {
    e.preventDefault();
    setIsDrawing(true);
    const ctx = canvasRef.current.getContext('2d');
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext('2d');
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasContent(true);
  };

  const end = () => setIsDrawing(false);

  const clear = () => {
    const ctx = canvasRef.current.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, width, height);
    setHasContent(false);
  };

  const save = () => {
    if (!hasContent) return;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    onSave?.(dataUrl);
  };

  return (
    <div style={{ display: 'inline-block' }}>
      <div style={{ border: '2px solid var(--c-border)', borderRadius: 8, overflow: 'hidden', background: '#fff', position: 'relative' }}>
        <canvas
          ref={canvasRef} width={width} height={height}
          style={{ display: 'block', cursor: 'crosshair', touchAction: 'none' }}
          onMouseDown={start} onMouseMove={draw} onMouseUp={end} onMouseLeave={end}
          onTouchStart={start} onTouchMove={draw} onTouchEnd={end}
        />
        {!hasContent && (
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', color: '#ccc', fontSize: 14, pointerEvents: 'none' }}>
            ✍️ 請在此處簽名
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 8, justifyContent: 'flex-end' }}>
        <button className="btn btn-sm" onClick={clear}>🗑️ 清除</button>
        {onCancel && <button className="btn btn-sm" onClick={onCancel}>取消</button>}
        <button className="btn btn-sm btn-primary" onClick={save} disabled={!hasContent}>✅ 確認簽名</button>
      </div>
    </div>
  );
}
