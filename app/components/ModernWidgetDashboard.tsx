"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import "./ModernWidgetDashboard.css";
import {
  loadDashboardWidgets,
  MODERN_WIDGET_STORAGE_KEY,
  type DashboardWidget as Widget
} from "@/app/utils/widgetStorage";
import { createDefaultBookmarkWidgets } from "@/app/utils/toolHubLinks";

/**
 * ModernWidgetDashboard - Advanced dashboard with grid layout and context menus
 * Features:
 * - Grid-based layout with empty cells for adding new widgets
 * - Right-click context menu (rename, color, delete, pin)
 * - Three widget types: Bookmark, Note, Todo
 * - Drag & drop between grid cells
 * - localStorage persistence
 */

type TodoWidget = Extract<Widget, { type: "todo" }>;

interface ContextMenu {
  x: number;
  y: number;
  widgetId: string;
}

const GRID_COLUMNS = 4;

const COLOR_MAP: Record<string, { bg: string; border: string; hover: string; text: string }> = {
  default: { bg: "#ffffff", border: "#e5e7eb", hover: "#f9fafb", text: "#111827" },
  red: { bg: "#fef2f2", border: "#fecaca", hover: "#fee2e2", text: "#991b1b" },
  yellow: { bg: "#fefce8", border: "#fde047", hover: "#fef08a", text: "#854d0e" },
  green: { bg: "#f0fdf4", border: "#bbf7d0", hover: "#dcfce7", text: "#14532d" },
  blue: { bg: "#eff6ff", border: "#bfdbfe", hover: "#dbeafe", text: "#1e40af" },
};

export default function ModernWidgetDashboard() {
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [hasLoadedWidgets, setHasLoadedWidgets] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const [draggedWidgetId, setDraggedWidgetId] = useState<string | null>(null);
  const [renameWidgetId, setRenameWidgetId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [dropdownPos, setDropdownPos] = useState<{ x: number; y: number } | null>(null);
  const [dropdownCellIndex, setDropdownCellIndex] = useState<number | null>(null);
  const [minimizedWidgets, setMinimizedWidgets] = useState<Set<string>>(new Set());
  const [layoutMode, setLayoutMode] = useState<"grid" | "masonry">("masonry");
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const dragOverTargetRef = useRef<number | null>(null);

  // Load widgets from localStorage
  useEffect(() => {
    try {
      const { source, widgets: loadedWidgets } = loadDashboardWidgets(localStorage);

      if (source !== "none") {
        setWidgets(loadedWidgets);
        setHasLoadedWidgets(true);
        return;
      }

      const defaultWidgets = createDefaultBookmarkWidgets(Date.now());
      setWidgets(defaultWidgets);
      setHasLoadedWidgets(true);
    } catch (error) {
      console.error("Failed to load widgets:", error);
      setHasLoadedWidgets(true);
    }
  }, []);

  // Persist widgets with a small debounce to reduce write pressure while editing.
  useEffect(() => {
    if (!hasLoadedWidgets) return;

    const timeoutId = window.setTimeout(() => {
      try {
        localStorage.setItem(MODERN_WIDGET_STORAGE_KEY, JSON.stringify(widgets));
      } catch (error) {
        console.error("Failed to save widgets:", error);
      }
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [widgets, hasLoadedWidgets]);

  // Close context menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownPos(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Add new widget
  const handleAddWidget = (type: "bookmark" | "note" | "todo", position: number) => {
    const newWidget: Widget = 
      type === "bookmark"
        ? {
            id: `widget_${Date.now()}`,
            type: "bookmark",
            title: "Ny bokmerke-widget",
            color: "default",
            pinned: false,
            position,
            createdAt: new Date().toISOString(),
            links: [],
          }
        : type === "note"
        ? {
            id: `widget_${Date.now()}`,
            type: "note",
            title: "Nytt notat",
            color: "default",
            pinned: false,
            position,
            createdAt: new Date().toISOString(),
            content: "Skriv her...",
            width: 320,
            height: 280,
          }
        : {
            id: `widget_${Date.now()}`,
            type: "todo",
            title: "Ny huskeliste",
            color: "default",
            pinned: false,
            position,
            createdAt: new Date().toISOString(),
            items: [],
          };
    setWidgets((previousWidgets) => [...previousWidgets, newWidget]);
    setDropdownPos(null);
  };

  const handleAddButtonClick = (e: React.MouseEvent<HTMLButtonElement>, cellIndex: number) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setDropdownPos({
      x: rect.left + rect.width / 2 - 100,
      y: rect.top + rect.height + 8,
    });
    setDropdownCellIndex(cellIndex);
  };

  // Context menu handlers
  const handleContextMenu = (e: React.MouseEvent, widgetId: string) => {
    e.preventDefault();
    
    // Calculate menu dimensions (approximate)
    const menuWidth = 220;
    const menuHeight = 380;
    
    // Get viewport dimensions
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Calculate initial position
    let x = e.clientX;
    let y = e.clientY;
    
    // Adjust if menu goes off screen horizontally
    if (x + menuWidth > viewportWidth) {
      x = viewportWidth - menuWidth - 10;
    }
    
    // Adjust if menu goes off screen vertically
    if (y + menuHeight > viewportHeight) {
      y = viewportHeight - menuHeight - 10;
    }
    
    // Make sure menu doesn't go off the top or left
    if (x < 10) x = 10;
    if (y < 10) y = 10;
    
    setContextMenu({ x, y, widgetId });
  };

  const handleRename = (widgetId: string) => {
    const widget = widgets.find((w) => w.id === widgetId);
    if (widget) {
      setRenameValue(widget.title);
      setRenameWidgetId(widgetId);
    }
    setContextMenu(null);
  };

  const handleSaveRename = () => {
    if (!renameWidgetId || !renameValue.trim()) return;
    setWidgets((previousWidgets) =>
      previousWidgets.map((w) =>
        w.id === renameWidgetId ? { ...w, title: renameValue.trim() } : w
      )
    );
    setRenameWidgetId(null);
    setRenameValue("");
  };

  const handleChangeColor = (widgetId: string, color: Widget["color"]) => {
    setWidgets((previousWidgets) =>
      previousWidgets.map((w) => (w.id === widgetId ? { ...w, color } : w))
    );
    setContextMenu(null);
  };

  const handlePin = (widgetId: string) => {
    setWidgets((previousWidgets) =>
      previousWidgets.map((w) => (w.id === widgetId ? { ...w, pinned: !w.pinned } : w))
    );
    setContextMenu(null);
  };

  const handleDelete = (widgetId: string) => {
    if (!confirm("Slett denne widgeten?")) return;
    setWidgets((previousWidgets) => previousWidgets.filter((w) => w.id !== widgetId));
    setContextMenu(null);
  };

  const handleMinimize = (widgetId: string) => {
    const newMinimized = new Set(minimizedWidgets);
    if (newMinimized.has(widgetId)) {
      newMinimized.delete(widgetId);
    } else {
      newMinimized.add(widgetId);
    }
    setMinimizedWidgets(newMinimized);
    setContextMenu(null);
  };

  // Widget content update handlers
  const handleUpdateNote = (widgetId: string, content: string) => {
    setWidgets((previousWidgets) => previousWidgets.map((w) =>
      w.id === widgetId && w.type === "note" ? { ...w, content } : w
    ));
  };

  const handleUpdateTodo = (widgetId: string, items: TodoWidget["items"]) => {
    setWidgets((previousWidgets) => previousWidgets.map((w) =>
      w.id === widgetId && w.type === "todo" ? { ...w, items } : w
    ));
  };

  // Drag & drop handlers
  const handleDragStart = (widgetId: string) => {
    setDraggedWidgetId(widgetId);
  };

  const getFallbackIcon = (url: string): string => {
    const urlLower = url.toLowerCase();
    if (urlLower.includes('avtalespesialist')) return '👨‍⚕️';
    if (urlLower.includes('knuse-dele-listen') || urlLower.includes('.pdf')) return '📄';
    return '📝'; // Default fallback
  };

  const getFaviconUrl = (url: string): string | null => {
    if (!url?.trim()) return null;

    try {
      const urlObj = new URL(url);
      return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=16`;
    } catch {
      return null;
    }
  };

  const handleDragOver = (e: React.DragEvent, targetPosition: number) => {
    e.preventDefault();
    if (!draggedWidgetId) return;
    if (dragOverTargetRef.current === targetPosition) return;

    setWidgets((previousWidgets) => {
      const draggedWidget = previousWidgets.find((w) => w.id === draggedWidgetId);
      if (!draggedWidget) return previousWidgets;

      const currentIndex = previousWidgets.findIndex((w) => w.id === draggedWidgetId);
      if (currentIndex === -1 || currentIndex === targetPosition) return previousWidgets;

      const updatedWidgets = [...previousWidgets];
      updatedWidgets.splice(currentIndex, 1);
      updatedWidgets.splice(targetPosition, 0, draggedWidget);
      dragOverTargetRef.current = targetPosition;
      return updatedWidgets.map((w, idx) => ({ ...w, position: idx }));
    });
  };

  const handleDragEnd = () => {
    dragOverTargetRef.current = null;
    setDraggedWidgetId(null);
  };

  // Sort widgets: pinned first, then by position
  const sortedWidgets = useMemo(() => {
    return [...widgets].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return a.position - b.position;
    });
  }, [widgets]);

  // Calculate grid layout
  const totalCells = Math.ceil((sortedWidgets.length + 1) / GRID_COLUMNS) * GRID_COLUMNS;
  const gridCells = useMemo(() => Array.from({ length: totalCells }, (_, i) => i), [totalCells]);

  return (
    <div className="modern-widget-dashboard">
      {/* Layout toggle header */}
      <div className="dashboard-header">
        <button 
          className="layout-toggle-btn"
          onClick={() => setLayoutMode(layoutMode === "grid" ? "masonry" : "grid")}
          title={layoutMode === "grid" ? "Bytt til flytende layout" : "Bytt til grid layout"}
        >
          {layoutMode === "grid" ? "📊 Grid" : "🧱 Flytende"}
        </button>
      </div>
      
      <div className={`modern-widget-grid ${layoutMode === "masonry" ? "layout-masonry" : "layout-grid"}`}>
        {gridCells.map((cellIndex) => {
          const widget = sortedWidgets[cellIndex];
          
          if (!widget) {
            // Empty cell with + button
            return (
              <div
                key={`empty-${cellIndex}`}
                className="widget-cell widget-cell-empty"
                onDragOver={(e) => handleDragOver(e, cellIndex)}
              >
                <div className="widget-add-menu">
                  <button
                    className="widget-add-trigger"
                    onClick={(e) => handleAddButtonClick(e, cellIndex)}
                    title="Legg til widget"
                  >
                    <span className="add-icon">+</span>
                  </button>
                </div>
              </div>
            );
          }

          // Widget cell
          const colorStyle = COLOR_MAP[widget.color];
          const isDragging = draggedWidgetId === widget.id;
          const todoProgress =
            widget.type === "todo" && widget.items.length > 0
              ? Math.round((widget.items.filter((item) => item.completed).length / widget.items.length) * 100)
              : 0;

          return (
            <div
              key={widget.id}
              className={`widget-cell ${widget.pinned ? "is-pinned" : ""} ${isDragging ? "is-dragging" : ""} ${minimizedWidgets.has(widget.id) ? "is-minimized" : ""}`}
              draggable
              onDragStart={() => handleDragStart(widget.id)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => handleDragOver(e, cellIndex)}
              onContextMenu={(e) => handleContextMenu(e, widget.id)}
              style={{
                backgroundColor: colorStyle.bg,
                borderColor: colorStyle.border,
              }}
            >
              {/* Widget header */}
              <div 
                className="widget-header" 
                style={{ color: colorStyle.text, cursor: "pointer" }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleMinimize(widget.id);
                }}
                title={minimizedWidgets.has(widget.id) ? "Maksimer" : "Minimer"}
              >
                <div className="widget-title-container">
                  {renameWidgetId === widget.id ? (
                    <input
                      type="text"
                      className="widget-title-input"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveRename();
                        if (e.key === "Escape") setRenameWidgetId(null);
                      }}
                      onBlur={handleSaveRename}
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <h3 
                      className="widget-title"
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        handleRename(widget.id);
                      }}
                    >
                      {widget.title}
                    </h3>
                  )}
                </div>
                <div className="widget-header-actions">
                  <span
                    style={{ color: colorStyle.text, fontSize: "16px", fontWeight: "bold" }}
                  >
                    {minimizedWidgets.has(widget.id) ? "+" : "−"}
                  </span>
                  {widget.pinned && <span className="pin-indicator">📌</span>}
                </div>
              </div>

              {/* Widget content */}
              <div className="widget-content">
                {widget.type === "bookmark" && (
                  <ul className="bookmark-list">
                    {widget.links.length === 0 ? (
                      <li className="bookmark-empty">Ingen lenker ennå. Høyreklikk for å administrere.</li>
                    ) : (
                      widget.links.map((link) => {
                        const faviconUrl = getFaviconUrl(link.url);

                        return (
                          <li key={link.id} className="bookmark-item">
                            {faviconUrl && (
                              <img 
                                src={faviconUrl} 
                                alt="" 
                                className="bookmark-icon"
                                onError={(e) => {
                                  const target = e.currentTarget;
                                  target.style.display = 'none';
                                  const fallback = target.nextElementSibling as HTMLElement;
                                  if (fallback && fallback.classList.contains('bookmark-fallback-icon')) {
                                    fallback.style.display = 'inline';
                                  }
                                }}
                              />
                            )}
                            <span className="bookmark-fallback-icon" style={{ display: faviconUrl ? 'none' : 'inline', fontSize: '14px', flexShrink: 0 }}>
                              {getFallbackIcon(link.url)}
                            </span>
                            <a href={link.url} target="_blank" rel="noreferrer">
                              {link.label}
                            </a>
                          </li>
                        );
                      })
                    )}
                  </ul>
                )}

                {widget.type === "note" && (
                  <div className="note-editor">
                    <textarea
                      value={widget.content}
                      onChange={(e) => handleUpdateNote(widget.id, e.target.value)}
                      placeholder="Skriv notater her..."
                      className="note-textarea"
                      style={{ 
                        width: "100%", 
                        minHeight: "150px",
                        border: "none",
                        outline: "none",
                        resize: "vertical",
                        fontFamily: "inherit",
                        fontSize: "14px",
                        lineHeight: "1.6",
                        padding: "0"
                      }}
                    />
                  </div>
                )}

                {widget.type === "todo" && (
                  <div className="todo-editor">
                    {/* Progress bar */}
                    {widget.items.length > 0 && (
                      <div className="todo-progress-container">
                        <div className="todo-progress-bar">
                          <div 
                            className="todo-progress-fill"
                            style={{
                              width: `${todoProgress}%`
                            }}
                          />
                        </div>
                        <span className="todo-progress-text">
                          {todoProgress}%
                        </span>
                      </div>
                    )}
                    
                    <ul className="todo-list-editable">
                      {widget.items.map((item) => (
                        <li key={item.id} className={item.completed ? "completed" : ""}>
                          <input
                            type="checkbox"
                            checked={item.completed}
                            onChange={(e) => {
                              const updatedItems = widget.items.map((i) =>
                                i.id === item.id ? { ...i, completed: e.target.checked } : i
                              );
                              handleUpdateTodo(widget.id, updatedItems);
                            }}
                          />
                          <input
                            type="text"
                            value={item.text}
                            onChange={(e) => {
                              const updatedItems = widget.items.map((i) =>
                                i.id === item.id ? { ...i, text: e.target.value } : i
                              );
                              handleUpdateTodo(widget.id, updatedItems);
                            }}
                            className="todo-text-input"
                            style={{
                              flex: 1,
                              border: "none",
                              outline: "none",
                              background: "transparent",
                              fontSize: "13px",
                              textDecoration: item.completed ? "line-through" : "none"
                            }}
                          />
                          <button
                            onClick={() => {
                              const updatedItems = widget.items.filter((i) => i.id !== item.id);
                              handleUpdateTodo(widget.id, updatedItems);
                            }}
                            className="todo-delete-btn"
                            style={{
                              border: "none",
                              background: "transparent",
                              cursor: "pointer",
                              fontSize: "16px",
                              opacity: 0.5,
                              padding: "0 4px"
                            }}
                          >
                            ×
                          </button>
                        </li>
                      ))}
                    </ul>
                    <button
                      onClick={() => {
                        const newItem = {
                          id: `todo_${Date.now()}`,
                          text: "",
                          completed: false
                        };
                        handleUpdateTodo(widget.id, [...widget.items, newItem]);
                      }}
                      className="todo-add-btn"
                      style={{
                        width: "100%",
                        padding: "8px",
                        border: "1px dashed rgba(0,0,0,0.2)",
                        background: "transparent",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontSize: "13px",
                        marginTop: "8px"
                      }}
                    >
                      + Legg til oppgave
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="widget-context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button onClick={() => handleRename(contextMenu.widgetId)}>
            ✏️ Gi nytt navn
          </button>
          <div className="context-menu-divider"></div>
          <div className="color-picker-menu">
            <span className="menu-label">Velg farge:</span>
            <div className="color-options">
              {Object.entries(COLOR_MAP).map(([colorKey, colorStyle]) => (
                <button
                  key={colorKey}
                  className="color-option"
                  style={{ backgroundColor: colorStyle.bg, borderColor: colorStyle.border }}
                  onClick={() => handleChangeColor(contextMenu.widgetId, colorKey as Widget["color"])}
                  title={colorKey}
                />
              ))}
            </div>
          </div>
          <div className="context-menu-divider"></div>
          <button onClick={() => handleMinimize(contextMenu.widgetId)}>
            {minimizedWidgets.has(contextMenu.widgetId) ? "+ Maksimer" : "− Minimer"}
          </button>
          <div className="context-menu-divider"></div>
          <button onClick={() => handlePin(contextMenu.widgetId)}>
            📌 {widgets.find((w) => w.id === contextMenu.widgetId)?.pinned ? "Løs fra toppen" : "Fest til toppen"}
          </button>
          <div className="context-menu-divider"></div>
          <button className="danger" onClick={() => handleDelete(contextMenu.widgetId)}>
            🗑️ Slett widget
          </button>
        </div>
      )}

      {/* Add widget dropdown */}
      {dropdownPos && dropdownCellIndex !== null && (
        <div
          ref={dropdownRef}
          className="widget-add-dropdown"
          style={{ 
            top: dropdownPos.y, 
            left: dropdownPos.x,
            opacity: 1,
            visibility: 'visible'
          }}
        >
          <button onClick={() => handleAddWidget("bookmark", dropdownCellIndex)}>
            🔖 Bokmerke-widget
          </button>
          <button onClick={() => handleAddWidget("note", dropdownCellIndex)}>
            📝 Notat-widget
          </button>
          <button onClick={() => handleAddWidget("todo", dropdownCellIndex)}>
            ✓ Huskeliste-widget
          </button>
        </div>
      )}
    </div>
  );
}
