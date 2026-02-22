"use client";

import React, { useState, useEffect, useRef } from "react";
import "./NotesWidget.css";

/**
 * NotesWidget - A draggable, resizable notes widget with rich text editing
 * Features:
 * - Rich text editing (bold, italic, bullet lists)
 * - Color selection (standard, red, yellow, green, blue)
 * - localStorage persistence
 * - Pin/unpin functionality
 * - Fullscreen editor
 * - Delete capability
 * - Resizable widget
 * - Compatible with drag & drop systems
 */

interface Note {
  id: string;
  title: string;
  content: string;
  color: "default" | "red" | "yellow" | "green" | "blue";
  width: number;
  height: number;
  pinned: boolean;
  position: "left" | "normal"; // left = pinned at top-left
  tags: string[]; // For future tag support
  createdAt: string;
  updatedAt: string;
}

interface NotesWidgetProps {
  noteId: string;
  onDelete?: (noteId: string) => void;
  isDragging?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
}

const STORAGE_KEY = "legex_notes";
const DEFAULT_WIDTH = 320;
const DEFAULT_HEIGHT = 280;

const COLOR_MAP: Record<string, { bg: string; text: string; label: string }> = {
  default: { bg: "#f5f5f5", text: "#333333", label: "Standard" },
  red: { bg: "#ffe5e5", text: "#c41e1e", label: "Rød" },
  yellow: { bg: "#fffacd", text: "#b8860b", label: "Gul" },
  green: { bg: "#e5f5e5", text: "#1e6b1e", label: "Grønn" },
  blue: { bg: "#e5f0ff", text: "#1e5a9f", label: "Blå" },
};

// Rich text editor toolbar component
const RichTextToolbar: React.FC<{
  onBold: () => void;
  onItalic: () => void;
  onBulletList: () => void;
  onClear: () => void;
}> = ({ onBold, onItalic, onBulletList, onClear }) => (
  <div className="notes-toolbar">
    <button className="notes-toolbar-btn" onClick={onBold} title="Bold (Ctrl+B)">
      <strong>B</strong>
    </button>
    <button className="notes-toolbar-btn" onClick={onItalic} title="Italic (Ctrl+I)">
      <em>I</em>
    </button>
    <button
      className="notes-toolbar-btn"
      onClick={onBulletList}
      title="Bullet list"
    >
      •
    </button>
    <button
      className="notes-toolbar-btn notes-toolbar-clear"
      onClick={onClear}
      title="Clear formatting"
    >
      ✕
    </button>
  </div>
);

// Main NotesWidget component
export default function NotesWidget({
  noteId,
  onDelete,
  isDragging,
  onDragStart,
  onDragEnd,
}: NotesWidgetProps) {
  const [note, setNote] = useState<Note | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showFullEditor, setShowFullEditor] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const contentEditableRef = useRef<HTMLDivElement>(null);
  const resizerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<HTMLDivElement>(null);

  // Load note from localStorage
  useEffect(() => {
    const loadNote = () => {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return;

      try {
        const notes = JSON.parse(stored) as Record<string, Note>;
        const foundNote = notes[noteId];
        if (foundNote) {
          setNote(foundNote);
          setEditTitle(foundNote.title);
          setEditContent(foundNote.content);
        }
      } catch (error) {
        console.error("Failed to load notes from localStorage:", error);
      }
    };

    loadNote();
  }, [noteId]);

  // Create initial note if doesn't exist
  useEffect(() => {
    if (note === null) {
      const newNote: Note = {
        id: noteId,
        title: "Nytt notat",
        content: "Skriv her...",
        color: "default",
        width: DEFAULT_WIDTH,
        height: DEFAULT_HEIGHT,
        pinned: false,
        position: "normal",
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setNote(newNote);
      setEditTitle(newNote.title);
      setEditContent(newNote.content);
      saveNote(newNote);
    }
  }, [note, noteId]);

  // Save note to localStorage
  const saveNote = (updatedNote: Note) => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const notes = stored ? JSON.parse(stored) : {};
      notes[updatedNote.id] = {
        ...updatedNote,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
      setNote(updatedNote);
    } catch (error) {
      console.error("Failed to save note to localStorage:", error);
    }
  };

  // Handle title update
  const handleTitleChange = (newTitle: string) => {
    setEditTitle(newTitle);
    if (note) {
      saveNote({ ...note, title: newTitle });
    }
  };

  // Handle content update
  const handleContentChange = (newContent: string) => {
    setEditContent(newContent);
    if (note) {
      saveNote({ ...note, content: newContent });
    }
  };

  // Rich text formatting functions
  const applyFormatting = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    contentEditableRef.current?.focus();
  };

  const handleBold = () => applyFormatting("bold");
  const handleItalic = () => applyFormatting("italic");
  const handleBulletList = () => applyFormatting("insertUnorderedList");
  const handleClearFormatting = () => applyFormatting("removeFormat");

  // Handle color change
  const handleColorChange = (color: Note["color"]) => {
    if (note) {
      saveNote({ ...note, color });
      setShowColorPicker(false);
    }
  };

  // Handle resize
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!widgetRef.current || !note) return;

      const rect = widgetRef.current.getBoundingClientRect();
      const newWidth = e.clientX - rect.left;
      const newHeight = e.clientY - rect.top;

      if (newWidth > 200 && newHeight > 200) {
        if (note) {
          saveNote({
            ...note,
            width: Math.max(200, newWidth),
            height: Math.max(200, newHeight),
          });
        }
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, note]);

  // Handle delete
  const handleDelete = () => {
    if (!confirm("Slett dette notatet?")) return;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const notes = JSON.parse(stored);
        delete notes[noteId];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
      }
    } catch (error) {
      console.error("Failed to delete note:", error);
    }

    onDelete?.(noteId);
  };

  // Handle pin/unpin
  const handlePin = () => {
    if (note) {
      saveNote({
        ...note,
        pinned: !note.pinned,
        position: !note.pinned ? "left" : "normal",
      });
    }
  };

  if (!note) {
    return <div className="notes-widget notes-widget-loading">Laster...</div>;
  }

  const colorStyle = COLOR_MAP[note.color];

  return (
    <>
      {/* Main Widget */}
      <div
        ref={widgetRef}
        className={`notes-widget ${isDragging ? "is-dragging" : ""} ${
          note.pinned ? "is-pinned" : ""
        }`}
        style={{
          width: `${note.width}px`,
          height: `${note.height}px`,
          backgroundColor: colorStyle.bg,
          color: colorStyle.text,
        }}
        draggable={!showFullEditor}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        {/* Header with controls */}
        <div className="notes-widget-header">
          <div className="notes-widget-title-container">
            <input
              type="text"
              className="notes-widget-title"
              value={editTitle}
              onChange={(e) => handleTitleChange(e.target.value)}
              style={{ color: colorStyle.text }}
            />
          </div>
          <div className="notes-widget-actions">
            <button
              className={`notes-action-btn notes-pin-btn ${
                note.pinned ? "is-active" : ""
              }`}
              onClick={handlePin}
              title={note.pinned ? "Løs fra toppen" : "Fest til toppen"}
            >
              📌
            </button>
            <button
              className="notes-action-btn notes-expand-btn"
              onClick={() => setShowFullEditor(true)}
              title="Fullskjermeditor"
            >
              ⛶
            </button>
            <button
              className="notes-action-btn notes-color-btn"
              onClick={() => setShowColorPicker(!showColorPicker)}
              title="Fargevalg"
            >
              🎨
            </button>
            <button
              className="notes-action-btn notes-delete-btn"
              onClick={handleDelete}
              title="Slett notat"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Color picker */}
        {showColorPicker && (
          <div className="notes-color-picker">
            {Object.entries(COLOR_MAP).map(([colorKey, colorStyle]) => (
              <button
                key={colorKey}
                className={`notes-color-option ${
                  note.color === colorKey ? "is-selected" : ""
                }`}
                style={{ backgroundColor: colorStyle.bg }}
                onClick={() =>
                  handleColorChange(colorKey as Note["color"])
                }
                title={colorStyle.label}
              >
                {note.color === colorKey && "✓"}
              </button>
            ))}
          </div>
        )}

        {/* Content area */}
        <div className="notes-widget-content">
          <div
            className="notes-content-editable"
            contentEditable
            ref={contentEditableRef}
            onInput={(e) =>
              handleContentChange((e.currentTarget.textContent || "").trim())
            }
            style={{ color: colorStyle.text }}
          >
            {editContent}
          </div>
        </div>

        {/* Resize handle */}
        <div
          ref={resizerRef}
          className="notes-resizer"
          onMouseDown={handleResizeStart}
        />
      </div>

      {/* Fullscreen Editor Modal */}
      {showFullEditor && (
        <div className="notes-fullscreen-overlay">
          <div className="notes-fullscreen-modal">
            <div className="notes-fullscreen-header">
              <h2>Editer notat</h2>
              <button
                className="notes-close-fullscreen"
                onClick={() => setShowFullEditor(false)}
              >
                ✕
              </button>
            </div>

            <div className="notes-fullscreen-editor">
              <div className="notes-fullscreen-section">
                <label>Tittel</label>
                <input
                  type="text"
                  className="notes-fullscreen-title-input"
                  value={editTitle}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Notat tittel"
                />
              </div>

              <div className="notes-fullscreen-section">
                <label>Innhold</label>
                <RichTextToolbar
                  onBold={handleBold}
                  onItalic={handleItalic}
                  onBulletList={handleBulletList}
                  onClear={handleClearFormatting}
                />
                <div
                  className="notes-fullscreen-content-editable"
                  contentEditable
                  onInput={(e) =>
                    handleContentChange(
                      (e.currentTarget.innerText || "").trim()
                    )
                  }
                  suppressContentEditableWarning
                >
                  {editContent}
                </div>
              </div>

              <div className="notes-fullscreen-color-section">
                <label>Farge</label>
                <div className="notes-color-picker notes-color-picker-full">
                  {Object.entries(COLOR_MAP).map(([colorKey, colorStyle]) => (
                    <button
                      key={colorKey}
                      className={`notes-color-option ${
                        note.color === colorKey ? "is-selected" : ""
                      }`}
                      style={{ backgroundColor: colorStyle.bg }}
                      onClick={() =>
                        handleColorChange(colorKey as Note["color"])
                      }
                    >
                      {colorStyle.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="notes-fullscreen-footer">
              <button
                className="notes-btn-secondary"
                onClick={() => setShowFullEditor(false)}
              >
                Lukk
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
