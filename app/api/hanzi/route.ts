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

interface EnhancedResult extends DictionaryResult {
    isShorthand?: boolean
    matchType?: 'exact' | 'partial' | 'shorthand'
    syllableCount?: number
}

let HSK_CACHE: Record<string, DictionaryResult> | null = null

async function getHSKData(): Promise<Record<string, DictionaryResult>> {
    if (HSK_CACHE) return HSK_CACHE

    const dictionary: Record<string, DictionaryResult> = {}
    const dataDir = path.join(process.cwd(), "app", "api", "data")

    // Load all 6 HSK levels
    for (let level = 1; level <= 6; level++) {
        const filePath = path.join(dataDir, `hsk${level}.json`)
        const content = await fs.readFile(filePath, "utf8")
        const hskEntries = JSON.parse(content) as HSKEntry[]

        // Transform and merge into dictionary
        for (const entry of hskEntries) {
            const key = entry.word.hanzi

            // Create example string from example object
            const exampleStr = entry.example
                ? `${entry.example.hanzi} (${entry.example.pinyin}) - ${entry.example.meaning}`
                : undefined

            dictionary[key] = {
                word: entry.word.hanzi,
                pinyin: entry.word.pinyin,
                meaning: [entry.meaning], // Convert string to array
                example: exampleStr,
            }
        }
    }

    HSK_CACHE = dictionary
    return HSK_CACHE
}

function normalizePinyin(text: string): string {
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
        .replace(/ü/g, "v")
        .replace(/ǖ/g, "v")
        .replace(/ǘ/g, "v")
        .replace(/ǚ/g, "v")
        .replace(/ǜ/g, "v")
        .trim()
}

function isShorthandQuery(query: string): boolean {
    // Shorthand is 2+ letters where each letter could be the start of a syllable
    // e.g., "nh", "xh", "zg", "wm"
    return query.length >= 2 && /^[a-z]+$/.test(query)
}

function matchesShorthand(pinyin: string, shorthand: string): boolean {
    const normalized = normalizePinyin(pinyin)
    const syllables = normalized.split(/\s+/).filter(s => s.length > 0)

    // Extract first letter of each syllable
    const firstLetters = syllables.map(s => s[0]).join('')

    // Check if shorthand matches the beginning of first letters
    return firstLetters.startsWith(shorthand)
}

async function searchHanziByPinyin(query: string): Promise<EnhancedResult[]> {
    const data = await getHSKData()
    const normalizedQuery = normalizePinyin(query)

    if (!normalizedQuery) return []

    const isShorthand = isShorthandQuery(normalizedQuery)
    const exactMatches: EnhancedResult[] = []
    const partialMatches: EnhancedResult[] = []
    const shorthandMatches: EnhancedResult[] = []

    for (const [key, value] of Object.entries(data)) {
        const pinyin = value.pinyin ?? ""
        const normalizedPinyin = normalizePinyin(pinyin)
        const syllables = normalizedPinyin.split(/\s+/).filter(s => s.length > 0)

        // Exact match (full pinyin or single syllable)
        if (normalizedPinyin === normalizedQuery || syllables.includes(normalizedQuery)) {
            exactMatches.push({
                ...value,
                matchType: 'exact',
                syllableCount: syllables.length,
            })
            continue
        }

        // Partial match (pinyin starts with query)
        if (normalizedPinyin.startsWith(normalizedQuery) ||
            syllables.some(s => s.startsWith(normalizedQuery))) {
            partialMatches.push({
                ...value,
                matchType: 'partial',
                syllableCount: syllables.length,
            })
            continue
        }

        // Shorthand match (if query is shorthand)
        if (isShorthand && matchesShorthand(pinyin, normalizedQuery)) {
            shorthandMatches.push({
                ...value,
                matchType: 'shorthand',
                isShorthand: true,
                syllableCount: syllables.length,
            })
        }
    }

    // Combine results: exact first, then partial, then shorthand
    const allResults = [...exactMatches, ...partialMatches, ...shorthandMatches]

    // Sort each category by syllable count (prefer shorter/simpler words)
    const sortBySyllables = (a: EnhancedResult, b: EnhancedResult) => {
        return (a.syllableCount ?? 0) - (b.syllableCount ?? 0)
    }

    exactMatches.sort(sortBySyllables)
    partialMatches.sort(sortBySyllables)
    shorthandMatches.sort(sortBySyllables)

    // Return top 10 results
    return allResults.slice(0, 10)
}

export async function POST(request: NextRequest) {
    try {
        const { query } = await request.json()

        if (!query || typeof query !== "string" || query.trim().length === 0) {
            return NextResponse.json({ results: [] })
        }

        const trimmedQuery = query.trim()

        // Only search if query is at least 1 character
        if (trimmedQuery.length < 1) {
            return NextResponse.json({ results: [] })
        }

        const results = await searchHanziByPinyin(trimmedQuery)
        return NextResponse.json({
            results,
            count: results.length,
            isShorthand: isShorthandQuery(normalizePinyin(trimmedQuery)),
        })
    } catch (error) {
        console.error("[Hanzi API] Error:", error)
        return NextResponse.json({ error: "Lỗi máy chủ" }, { status: 500 })
    }
}
