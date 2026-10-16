import { todayStr } from './plan'

export type XCell = string | number | null | undefined
export interface XSheet {
  name: string
  header: string[]
  rows: XCell[][]
  /** 열 너비(글자 수). 없으면 내용 길이에 맞춘다 */
  widths?: number[]
  /** 머리글 줄에 자동 필터(▼)를 단다. 기본은 켬 */
  filter?: boolean
}

/** 한글은 영문보다 두 배쯤 넓다 */
const visual = (v: XCell) => [...String(v ?? '')].reduce((n, ch) => n + (ch.charCodeAt(0) > 0x2e80 ? 2 : 1), 0)

function autoWidths(s: XSheet): number[] {
  return s.header.map((h, i) => {
    const longest = Math.max(visual(h), ...s.rows.slice(0, 200).map((r) => visual(r[i])))
    return Math.min(60, Math.max(8, longest + 2))
  })
}

// 시트 이름은 31자까지, 일부 기호는 쓸 수 없다
const sheetName = (n: string) => n.replace(/[\\/?*[\]:]/g, ' ').slice(0, 31)

const colName = (i: number) => {
  let n = i + 1
  let s = ''
  while (n > 0) {
    s = String.fromCharCode(65 + ((n - 1) % 26)) + s
    n = Math.floor((n - 1) / 26)
  }
  return s
}

/** 시트마다 머리글 줄에 자동 필터를 다는 확장 — 라이브러리에 기능이 없어 시트 XML에 autoFilter를 직접 끼워 넣는다 */
const autoFilter = (ranges: (string | null)[]) => ({
  files: {
    transform: {
      'xl/worksheets/sheet{id}.xml': {
        transform: (content: string, _options: unknown, props: { sheetIndex: number }) => {
          const ref = ranges[props.sheetIndex]
          // 필터는 표 데이터 바로 뒤, 그리기(drawing) 등 다른 요소보다 앞에 와야 한다
          return ref && content.includes('</sheetData>') ? content.replace('</sheetData>', `</sheetData><autoFilter ref="${ref}"/>`) : content
        },
      },
    },
  },
})

/** 여러 시트를 .xlsx 파일 하나로 만들어 내려받는다 (라이브러리는 눌렀을 때만 불러온다) */
export async function saveExcel(base: string, sheets: XSheet[]) {
  const { default: writeExcelFile } = await import('write-excel-file/browser')
  const head = { fontWeight: 'bold' as const, backgroundColor: '#e8ebf2', alignVertical: 'center' as const }
  await writeExcelFile(
    sheets.map((s) => ({
      sheet: sheetName(s.name),
      data: [
        s.header.map((h) => ({ value: h, ...head })),
        ...s.rows.map((r) => s.header.map((_, i) => (r[i] == null || r[i] === '' ? null : typeof r[i] === 'number' ? r[i] : { value: String(r[i]), wrap: true, alignVertical: 'top' as const }))),
      ],
      columns: (s.widths ?? autoWidths(s)).map((width) => ({ width })),
      stickyRowsCount: 1,
    })),
    {
      features: [autoFilter(sheets.map((s) => (s.filter === false || !s.rows.length ? null : `A1:${colName(s.header.length - 1)}${s.rows.length + 1}`)))],
    },
  ).toFile(`${base}_${todayStr()}.xlsx`)
}
