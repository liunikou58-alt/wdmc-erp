import { useMemo } from 'react';

/**
 * 輕量化純原生 Gantt Chart 視覺化元件
 * 避免載入過重第三方依賴套件，利用 CSS Grid/Flex 繪製。
 */
export default function GanttChart({ tasks, startDate, endDate }) {
  if (!tasks || tasks.length === 0) return <div style={{ padding: 20, textAlign: 'center', color: 'var(--c-text-muted)' }}>無任務資料可繪製時程表</div>;

  // 1. 找出整個專案的最早與最晚日期，若無給定則自動計算
  const times = useMemo(() => {
    let start = startDate ? new Date(startDate) : new Date();
    let end = endDate ? new Date(endDate) : new Date();

    if (!startDate && !endDate) {
      start = new Date(Math.min(...tasks.map(t => new Date(t.start_date || t.created_at).getTime()).filter(n => !isNaN(n))));
      end = new Date(Math.max(...tasks.map(t => new Date(t.due_date || t.created_at).getTime()).filter(n => !isNaN(n))));
    }
    
    // 如果日期沒意義，給定一個默認跨度
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      start = new Date();
      end = new Date();
      end.setDate(end.getDate() + 30);
    }
    
    // 首尾多加 3 天 padding
    start.setDate(start.getDate() - 3);
    end.setDate(end.getDate() + 3);

    return {
      startT: start.getTime(),
      endT: end.getTime(),
      totalSpan: end.getTime() - start.getTime() || 1 // 避免分母 0
    };
  }, [tasks, startDate, endDate]);

  const { startT, endT, totalSpan } = times;

  return (
    <div style={{ background: 'var(--c-bg)', border: '1px solid var(--c-border)', borderRadius: 12, padding: 16, overflowX: 'auto' }}>
      <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>📊 專案時程與進度 (Gantt Chart)</h4>
      
      {/* 繪製每一條橫軸任務 */}
      <div style={{ minWidth: 600 }}>
        {/* 表頭 (可選擇顯示起訖月份) */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--c-border)', paddingBottom: 8, marginBottom: 12, color: 'var(--c-text-muted)', fontSize: 11 }}>
          <div style={{ width: 150, flexShrink: 0 }}>任務名稱</div>
          <div style={{ flex: 1, position: 'relative', display: 'flex', justifyContent: 'space-between' }}>
            <span>{new Date(startT).toISOString().slice(0,10)}</span>
            <span>{new Date(endT).toISOString().slice(0,10)}</span>
          </div>
        </div>

        {tasks.map(t => {
          const tStart = new Date(t.start_date || t.created_at).getTime();
          const tEnd = new Date(t.due_date || t.start_date || t.created_at).getTime();
          
          let leftPercent = Math.max(0, ((tStart - startT) / totalSpan) * 100);
          let widthPercent = Math.max(2, ((tEnd - tStart) / totalSpan) * 100); // 至少 2% 寬度

          if (leftPercent + widthPercent > 100) widthPercent = 100 - leftPercent;

          // 狀態顏色
          let barColor = 'var(--c-bg-elevated)'; // 預設底色
          if (t.status === 'completed' || t.status === 'done') barColor = 'var(--c-success)';
          else if (t.status === 'in_progress') barColor = 'var(--c-primary)';
          else if (t.status === 'delayed') barColor = 'var(--c-danger)';

          return (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ width: 150, flexShrink: 0, fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 8 }}>
                {t.title}
              </div>
              <div style={{ flex: 1, position: 'relative', height: 24, background: 'rgba(255,255,255,0.05)', borderRadius: 12 }}>
                <div style={{ 
                  position: 'absolute', 
                  left: `${leftPercent}%`, 
                  width: `${widthPercent}%`, 
                  height: '100%', 
                  background: barColor, 
                  borderRadius: 12,
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 8px',
                  color: 'white',
                  fontSize: 10,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden'
                }}>
                  {widthPercent > 10 && t.status}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
