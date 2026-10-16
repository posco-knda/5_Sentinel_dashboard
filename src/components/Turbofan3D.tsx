import type { ReactNode } from 'react'

// 원본 파일을 손대지 않은 그대로 쓴다 (public/turbofan_original.html)
const SRC = '/turbofan_original.html'

/** 3D 엔진 애니메이션을 iframe으로 보여주고, 그 위에 안내 문구 등을 겹쳐 놓을 수 있다 */
export function Turbofan3D({ className, children }: { className?: string; children?: ReactNode }) {
  return (
    <div className={`relative overflow-hidden ${className ?? ''}`} style={{ background: 'radial-gradient(120% 90% at 60% 30%, #3a4a63 0%, #1b2433 55%, #0e131c 100%)' }}>
      <iframe src={SRC} title="항공기 엔진 3D" loading="lazy" className="absolute inset-0 h-full w-full border-0" />
      {children && <div className="pointer-events-none absolute inset-0">{children}</div>}
    </div>
  )
}
