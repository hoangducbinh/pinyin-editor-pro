"use client"

import type React from "react"

import { forwardRef, useState } from "react"
import { convertTone } from "@/lib/pinyin"

interface EditorProps {
  onInput: (e: React.FormEvent<HTMLDivElement>) => void
  content: string
}

const Editor = forwardRef<HTMLDivElement, EditorProps>(({ onInput, content }, ref) => {
  const [selectionStart, setSelectionStart] = useState(0)

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (["1", "2", "3", "4"].includes(e.key)) {
      const toneNum = Number.parseInt(e.key)
      const selection = window.getSelection()

      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0)

        // Case 1: Text is selected -> convert selected text
        if (!range.collapsed) {
          const text = range.toString().trim()
          if (text && /[a-züv]+\d?/i.test(text)) {
            e.preventDefault()
            const newText = convertTone(text, toneNum)
            const span = document.createElement("span") // Insert as text node or span? Using text node for cleaner editor content usually, but original used span. 
            // Let's stick to text node replacement to avoid nesting spans unnecessarily if possible, 
            // but original code used span, so let's check if span had class. It didn't.
            // Text node is safer for subsequent editing.
            range.deleteContents()
            range.insertNode(document.createTextNode(newText))
            selection.collapseToEnd()
            onInput({
              currentTarget: e.currentTarget,
            } as React.FormEvent<HTMLDivElement>)
          }
          return;
        }

        // Case 2: No selection (cursor is at end of word) -> find word before cursor
        // We need to look backward from cursor
        if (range.collapsed) {
          // Create a range to look back
          // We'll traverse backwards to find the start of the word
          // A word in this context is a sequence of vowels/consonants that make up a pinyin syllable
          // Simple approach: look at textContent of the focusNode
          const node = range.startContainer
          if (node.nodeType === Node.TEXT_NODE && node.textContent) {
            const cursorPos = range.startOffset
            const textBefore = node.textContent.substring(0, cursorPos)

            // Regex to find the last pinyin-like syllable
            // Matches one or more letters at the end of string
            const match = textBefore.match(/([a-zA-ZüÜvV]+)$/)

            if (match) {
              e.preventDefault()
              const word = match[0]
              const newWord = convertTone(word, toneNum)

              // Replace the text
              const newTextBefore = textBefore.substring(0, textBefore.length - word.length) + newWord
              const fullText = newTextBefore + node.textContent.substring(cursorPos)

              node.textContent = fullText

              // Restore cursor position
              const newCursorPos = newTextBefore.length
              const newRange = document.createRange()
              newRange.setStart(node, newCursorPos)
              newRange.setEnd(node, newCursorPos)
              selection.removeAllRanges()
              selection.addRange(newRange)

              onInput({
                currentTarget: e.currentTarget,
              } as React.FormEvent<HTMLDivElement>)
            }
          }
        }
      }
    }
  }

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={onInput}
        onKeyDown={handleKeyDown}
        className="flex-1 overflow-auto p-8 text-lg leading-relaxed outline-none bg-card text-foreground selection:bg-primary/20 focus:ring-2 focus:ring-primary/50 rounded-lg m-4"
        role="textbox"
        aria-label="Text editor"
        style={{ whiteSpace: "pre-wrap", wordWrap: "break-word" }}
      />
      <div className="px-8 py-3 text-sm text-muted-foreground">{content.length} ký tự</div>
    </div>
  )
})

Editor.displayName = "Editor"

export default Editor
