import { todayStr } from './plan'

export type XCell = string | number | null | undefined
export interface XSheet {
  name: string
  header: string[]
  rows: XCell[][]
  /** 열 너비(글자 수). 없으면 내용 길이에 맞춘다 */
  widths?: number[]
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
  ).toFile(`${base}_${todayStr()}.xlsx`)
}
