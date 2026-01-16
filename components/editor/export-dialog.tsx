"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface ExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  exportType: "docx" | "pdf"
  content: string
  onExport: () => void
}

export default function ExportDialog({ open, onOpenChange, exportType, content, onExport }: ExportDialogProps) {
  const [fileName, setFileName] = useState(`document`)

  const handleExport = async () => {
    const fullFileName = `${fileName}.${exportType === "docx" ? "docx" : "pdf"}`

    try {
      if (exportType === "docx") {
        const { Document, Packer, Paragraph } = await import("docx")

        const lines = content.split("\n")
        const paragraphs = lines.map((line) => new Paragraph(line))

        const doc = new Document({
          sections: [
            {
              children: paragraphs,
            },
          ],
        })

        const blob = await Packer.toBlob(doc)
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = fullFileName
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else if (exportType === "pdf") {
        const { jsPDF } = await import("jspdf")

        const pdf = new jsPDF()
        const pageHeight = pdf.internal.pageSize.getHeight()
        const pageWidth = pdf.internal.pageSize.getWidth()
        const margin = 10
        const lineHeight = 10
        let yPosition = margin

        const lines = content.split("\n")

        lines.forEach((line) => {
          if (yPosition > pageHeight - margin) {
            pdf.addPage()
            yPosition = margin
          }

          const wrappedLines = pdf.splitTextToSize(line || " ", pageWidth - 2 * margin)

          wrappedLines.forEach((wrappedLine: string) => {
            if (yPosition > pageHeight - margin) {
              pdf.addPage()
              yPosition = margin
            }
            pdf.text(wrappedLine, margin, yPosition)
            yPosition += lineHeight
          })
        })

        pdf.save(fullFileName)
      }

      onExport()
      onOpenChange(false)
    } catch (err) {
      console.error("Export error:", err)
      alert("Lỗi: không thể xuất file. Vui lòng thử lại.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Xuất {exportType === "docx" ? "Word" : "PDF"}</DialogTitle>
          <DialogDescription>Nhập tên file để xuất tài liệu</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="filename">Tên file</Label>
            <div className="flex gap-2">
              <Input
                id="filename"
                placeholder="Nhập tên file"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                autoFocus
              />
              <span className="text-sm text-muted-foreground py-2">{`.${exportType === "docx" ? "docx" : "pdf"}`}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button onClick={handleExport}>Xuất</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
