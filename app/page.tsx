"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import Editor from "@/components/editor/editor"
import Toolbar from "@/components/editor/toolbar"
import Dictionary from "@/components/editor/dictionary"

export default function Home() {
  const editorRef = useRef<HTMLDivElement>(null)
  const [content, setContent] = useState("")

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const text = e.currentTarget.textContent || ""
    setContent(text)
  }

  useEffect(() => {
    editorRef.current?.focus()
  }, [])

  return (
    <div className="flex h-screen bg-background">
      {/* Main Editor */}
      <div className="flex-1 flex flex-col">
        <Toolbar editorRef={editorRef} content={content} />
        <Editor ref={editorRef} onInput={handleInput} content={content} />
      </div>

      {/* Dictionary Sidebar */}
      <Dictionary />
    </div>
  )
}
