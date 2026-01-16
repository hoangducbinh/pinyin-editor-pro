import { type NextRequest, NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"

interface HSKEntry {
  id: string
  index: number
  word: {
    hanzi: string
    pinyin: string
  }
  meaning: string
  example: {
    hanzi: string
    pinyin: string
    meaning: string
  }
}

interface DictionaryResult {
  word: string
  pinyin: string
  meaning: string[]
  example?: string
  traditional?: string
}

let HSK_CACHE: Record<string, DictionaryResult> | null = null

async function getHSKData(): Promise<Record<string, DictionaryResult>> {
  if (HSK_CACHE) return HSK_CACHE

  const dictionary: Record<string, DictionaryResult> = {}
  const dataDir = path.join(process.cwd(), "app", "api", "data")

  for (let level = 1; level <= 6; level++) {
    const filePath = path.join(dataDir, `hsk${level}.json`)
    const content = await fs.readFile(filePath, "utf8")
    const hskEntries = JSON.parse(content) as HSKEntry[]

    for (const entry of hskEntries) {
      const key = entry.word.hanzi

      const exampleStr = entry.example
        ? `${entry.example.hanzi} (${entry.example.pinyin}) - ${entry.example.meaning}`
        : undefined

      dictionary[key] = {
        word: entry.word.hanzi,
        pinyin: entry.word.pinyin,
        meaning: [entry.meaning],
        example: exampleStr,
      }
    }
  }

  HSK_CACHE = dictionary
  return HSK_CACHE
}

function normalizeText(s?: string): string {
  if (!s) return ""
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase()
    .trim()
}

async function searchCEDICT(query: string): Promise<DictionaryResult[]> {
  const data = await getHSKData()

  if (data[query]) return [data[query]]

  const q = query.toLowerCase().trim()
  const nq = normalizeText(q)
  const results: (DictionaryResult & { score: number })[] = []

  for (const [key, value] of Object.entries(data)) {
    const pinyin = (value.pinyin ?? "").toLowerCase()
    const meaningsCombined = (value.meaning || []).join(" ").toLowerCase()
    const example = (value.example ?? "").toLowerCase()
    const trad = (value.traditional ?? "").toLowerCase()

    let score = -1

    if (key === query) score = 1000
    else if (key.includes(query) || trad.includes(query)) score = 950

    const normMeanings = normalizeText(meaningsCombined)
    if (meaningsCombined === q || normMeanings === nq) score = 900
    else if (meaningsCombined.includes(q) || normMeanings.includes(nq)) {
      const words = meaningsCombined.split(/[\s,.;:()!]+/)
      const normWords = normMeanings.split(/[\s,.;:()!]+/)
      if (words.includes(q) || normWords.includes(nq)) score = 850
      else score = 800
    }

    if (score < 0) {
      if (pinyin === q || normalizeText(pinyin) === nq) score = 750
      else if (pinyin.includes(q) || normalizeText(pinyin).includes(nq)) score = 700
    }

    if (score < 0) {
      if (example.includes(q) || normalizeText(example).includes(nq)) score = 600
    }

    if (score > 0) {
      results.push({ ...value, score })
    }
  }

  return results
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return a.word.length - b.word.length
    })
    .map(({ score, ...rest }) => rest)
}

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json()

    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return NextResponse.json({ results: [] })
    }

    const trimmedQuery = query.trim()
    const results = await searchCEDICT(trimmedQuery)
    return NextResponse.json({
      results,
      count: results.length,
    })
  } catch (error) {
    console.error("[v0] Dictionary API error:", error)
    return NextResponse.json({ error: "Lỗi máy chủ" }, { status: 500 })
  }
}
