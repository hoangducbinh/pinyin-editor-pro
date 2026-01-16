"use client"

import type React from "react"
import { useEffect, useRef } from "react"
import type { HanziSuggestion } from "@/lib/hanzi"

interface HanziSuggestionsProps {
    suggestions: HanziSuggestion[]
    selectedIndex: number
    onSelect: (suggestion: HanziSuggestion) => void
    onClose: () => void
    position: { top: number; left: number }
    loading?: boolean
}

export default function HanziSuggestions({
    suggestions,
    selectedIndex,
    onSelect,
    onClose,
    position,
    loading = false,
}: HanziSuggestionsProps) {
    const containerRef = useRef<HTMLDivElement>(null)

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                onClose()
            }
        }

        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [onClose])

    // Scroll selected item into view
    useEffect(() => {
        if (containerRef.current && selectedIndex >= 0) {
            const selectedElement = containerRef.current.children[selectedIndex] as HTMLElement
            if (selectedElement) {
                selectedElement.scrollIntoView({ block: "nearest", behavior: "smooth" })
            }
        }
    }, [selectedIndex])

    if (loading) {
        return (
            <div
                ref={containerRef}
                className="fixed z-50 bg-card border border-border rounded-xl shadow-2xl p-4 min-w-[400px] animate-in fade-in-0 zoom-in-95 duration-200"
                style={{ top: position.top, left: position.left }}
            >
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <span>Đang tìm kiếm...</span>
                </div>
            </div>
        )
    }

    if (suggestions.length === 0) {
        return null
    }

    // Helper to split pinyin into syllables for color coding
    const renderPinyin = (pinyin: string) => {
        const syllables = pinyin.split(/\s+/)
        const colors = [
            "text-blue-600 dark:text-blue-400",
            "text-purple-600 dark:text-purple-400",
            "text-pink-600 dark:text-pink-400",
            "text-orange-600 dark:text-orange-400",
        ]

        return (
            <div className="flex gap-1 flex-wrap">
                {syllables.map((syllable, idx) => (
                    <span key={idx} className={`font-medium ${colors[idx % colors.length]}`}>
                        {syllable}
                    </span>
                ))}
            </div>
        )
    }

    // Helper to get word type badge
    const getWordTypeBadge = (suggestion: HanziSuggestion) => {
        const charCount = suggestion.word.length
        const syllableCount = suggestion.syllableCount ?? 1

        if (charCount === 1) {
            return <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">单字</span>
        } else if (charCount >= 2) {
            return <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">词组</span>
        }
        return null
    }

    return (
        <div
            ref={containerRef}
            className="fixed z-50 bg-card border border-border rounded-xl shadow-2xl max-h-[450px] overflow-y-auto min-w-[420px] animate-in fade-in-0 zoom-in-95 duration-200"
            style={{ top: position.top, left: position.left }}
        >
            {/* Header */}
            <div className="sticky top-0 bg-card/95 backdrop-blur-sm border-b border-border px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <span className="text-sm font-medium text-muted-foreground">
                        {suggestions.length} gợi ý
                    </span>
                </div>
                <span className="text-xs text-muted-foreground">
                    Nhấn 1-9 hoặc ↑↓ Enter
                </span>
            </div>

            {/* Suggestions List */}
            <div className="p-2">
                {suggestions.map((suggestion, index) => {
                    const isSelected = index === selectedIndex
                    const numberKey = index < 9 ? (index + 1).toString() : null

                    return (
                        <div
                            key={`${suggestion.word}-${index}`}
                            className={`
                group relative px-4 py-3 cursor-pointer rounded-lg transition-all duration-150
                ${isSelected
                                    ? "bg-primary text-primary-foreground shadow-md scale-[1.02]"
                                    : "hover:bg-accent hover:text-accent-foreground hover:shadow-sm"
                                }
              `}
                            onClick={() => onSelect(suggestion)}
                        >
                            <div className="flex items-start gap-3">
                                {/* Number Indicator */}
                                {numberKey && (
                                    <div className={`
                    shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold
                    ${isSelected
                                            ? "bg-primary-foreground/20 text-primary-foreground"
                                            : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                                        }
                  `}>
                                        {numberKey}
                                    </div>
                                )}

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    {/* Hanzi and Badge */}
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <span className={`text-2xl font-bold ${isSelected ? "" : "text-foreground"}`}>
                                            {suggestion.word}
                                        </span>
                                        {getWordTypeBadge(suggestion)}
                                        {suggestion.isShorthand && (
                                            <span className="px-2 py-0.5 text-xs rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                                                gõ tắt
                                            </span>
                                        )}
                                    </div>

                                    {/* Pinyin */}
                                    <div className={`mb-2 ${isSelected ? "opacity-90" : ""}`}>
                                        {renderPinyin(suggestion.pinyin)}
                                    </div>

                                    {/* Meanings */}
                                    {suggestion.meaning && suggestion.meaning.length > 0 && (
                                        <div className={`text-sm ${isSelected ? "opacity-80" : "text-muted-foreground"}`}>
                                            {suggestion.meaning.slice(0, 2).join(" • ")}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Selection Indicator */}
                            {isSelected && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>

            {/* Footer Hint */}
            <div className="sticky bottom-0 bg-card/95 backdrop-blur-sm border-t border-border px-4 py-2 text-xs text-muted-foreground text-center">
                Esc để đóng
            </div>
        </div>
    )
}
