"use client";

import React, { useState, useEffect, useRef } from "react";
import NotesWidget from "./NotesWidget";
import TodoListWidget from "./TodoListWidget";
import "./ModernWidgetDashboard.css";

/**
 * ModernWidgetDashboard - Advanced dashboard with grid layout and context menus
 * Features:
 * - Grid-based layout with empty cells for adding new widgets
 * - Right-click context menu (rename, color, delete, pin)
 * - Three widget types: Bookmark, Note, Todo
 * - Drag & drop between grid cells
 * - localStorage persistence
 */

interface BaseWidget {
  id: string;
  title: string;
  color: "default" | "red" | "yellow" | "green" | "blue";
  pinned: boolean;
  position: number;
  createdAt: string;
}

interface BookmarkWidget extends BaseWidget {
  type: "bookmark";
  links: Array<{ id: string; label: string; url: string }>;
}

interface NoteWidget extends BaseWidget {
  type: "note";
  content: string;
  width: number;
  height: number;
}

interface TodoWidget extends BaseWidget {
  type: "todo";
  items: Array<{
    id: string;
    text: string;
    completed: boolean;
  }>;
}

type Widget = BookmarkWidget | NoteWidget | TodoWidget;

interface ContextMenu {
  x: number;
  y: number;
  widgetId: string;
}

const STORAGE_KEY = "legex_modern_widgets_v2";
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
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const [draggedWidgetId, setDraggedWidgetId] = useState<string | null>(null);
  const [renameWidgetId, setRenameWidgetId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [dropdownPos, setDropdownPos] = useState<{ x: number; y: number } | null>(null);
  const [dropdownCellIndex, setDropdownCellIndex] = useState<number | null>(null);
  const [minimizedWidgets, setMinimizedWidgets] = useState<Set<string>>(new Set());
  const [layoutMode, setLayoutMode] = useState<"grid" | "masonry">("masonry");
  const [editingWidgetId, setEditingWidgetId] = useState<string | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load widgets from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const loadedWidgets = JSON.parse(stored) as Widget[];
        setWidgets(loadedWidgets);
      } catch (error) {
        console.error("Failed to load widgets:", error);
      }
    } else {
      // Initialize with default bookmarks from original LinkBoxes
      const defaultWidgets: Widget[] = [
        {
          id: `widget_${Date.now()}_1`,
          type: "bookmark",
          title: "Medisin",
          color: "default",
          pinned: false,
          position: 0,
          createdAt: new Date().toISOString(),
          links: [
            { id: "med-1", label: "Felleskatalogen", url: "https://www.felleskatalogen.no/medisin/" },
            { id: "med-2", label: "Legemiddelhåndboka", url: "https://www.legemiddelhandboka.no/" },
            { id: "med-3", label: "Interaksjoner", url: "https://interaksjoner.no/" },
            { id: "med-4", label: "RELIS", url: "https://relis.no/" },
            { id: "med-5", label: "Koble", url: "https://koble.info/" },
            { id: "med-6", label: "Trygg Mammamedisin", url: "https://tryggmammamedisin.no/" },
            { id: "med-7", label: "Antibiotika i primærhelsetjenesten", url: "https://www.helsedirektoratet.no/retningslinjer/antibiotika-i-primaerhelsetjenesten" },
            { id: "med-8", label: "Knuse-dele-listen", url: "/pdfs/KnuseDeleListen v16.pdf" },
          ],
        },
        {
          id: `widget_${Date.now()}_2`,
          type: "bookmark",
          title: "Legeerklæringer (LE)",
          color: "default",
          pinned: false,
          position: 1,
          createdAt: new Date().toISOString(),
          links: [
            { id: "tt-1", label: "TT-kort (legeerkl.)", url: "https://innlandstrafikk.no/_f/p4/ic40b9736-aeeb-49d8-966c-649e57eff410/legeerklaering.pdf" },
            { id: "tt-2", label: "TT-kort (pasient)", url: "https://innlandstrafikk.no/_f/p4/i0158ef5d-fe72-4a2a-8c34-9be0f856e66f/tt-kort_innlandet-fylke_innlandstrafikk2022-skrivbar.pdf" },
            { id: "hc-1", label: "HC-park. (legeerkl.)", url: "https://lillehammer.kommune.no/_f/p1/iebadc1ca-c667-4501-8507-88f040fb0b24/legeerklaring-vedlegg-til-soknad-om-parkeringstillatelse-for-forflytningshemmede.pdf" },
            { id: "hc-2", label: "HC-park. (pasient)", url: "https://lillehammer.kommune.no/_f/p1/i8aabafbb-a0c7-4da4-b579-d34425f6b02a/soknadsskjema-om-parkeringstillatelse-for-forflytningshemmede.pdf" },
            { id: "ff-1", label: "Ikrafttredelse fullmakt (legeerkl.)", url: "https://www.statsforvalteren.no/siteassets/fm-oslo-og-viken/vergemal/informasjonsskriv/legeerklaringsskjema-fremtidsfullmakt.pdf" },
            { id: "ts-1", label: "Tillegsstipend (legeerkl.)", url: "https://lanekassen.no/nb-NO/stipend-og-lan/nedsatt-funksjonsevne/soknad-om-tilleggsstipend-ved-nedsatt-funksjonsevne/#samtykke-banner" },
          ],
        },
        {
          id: `widget_${Date.now()}_3`,
          type: "bookmark",
          title: "Generelle",
          color: "default",
          pinned: false,
          position: 2,
          createdAt: new Date().toISOString(),
          links: [
            { id: "gen-1", label: "Legehandboka", url: "https://legehandboka.no/" },
            { id: "gen-2", label: "Nevrologi Legehandboka", url: "https://nevrologi.legehandboka.no/" },
            { id: "gen-3", label: "Metodebok", url: "https://metodebok.no/index.php" },
          ],
        },
        {
          id: `widget_${Date.now()}_4`,
          type: "bookmark",
          title: "Henvisninger",
          color: "default",
          pinned: false,
          position: 3,
          createdAt: new Date().toISOString(),
          links: [
            { id: "henv-1", label: "Avtalespesialistoversikt", url: "https://avtalespesialister.helse-sorost.no/spesialister1.asp" },
            { id: "henv-2", label: "Skjema for familiær hyperkolesterolemi", url: "https://nktforfh.no/images/uploads/files/Rekvisisjon_for_FH_utfyllbarPDF.pdf" },
            { id: "henv-3", label: "ADHD henvisningsmal", url: "https://www.diakonhjemmetsykehus.no/4961a8/siteassets/documents/mal--henvisning-adhd-2019.pdf" },
            { id: "henv-4", label: "Henvisningsskjema rehabilitering", url: "https://www.sunnaas.no/fag-og-forskning/kompetansesentre-og-tjenester/Regional-koordinerende-enhet/henvisning/henvisning-til-rehabilitering-i-spesialisthelsetjenesten/" },
          ],
        },
        {
          id: `widget_${Date.now()}_5`,
          type: "bookmark",
          title: "Førerkort og diverse",
          color: "default",
          pinned: false,
          position: 4,
          createdAt: new Date().toISOString(),
          links: [
            { id: "fk-1", label: "Førerkortveileder", url: "https://www.helsedirektoratet.no/veiledere/forerkortveileder" },
            { id: "fk-2", label: "Egenerklæring", url: "https://www.vegvesen.no/globalassets/forerkort/ta-forerkort/soknad-om-forerkort-og-kompetansebevis-egenerklaering-om-helse.pdf" },
            { id: "div-1", label: "Legemidler førerkort", url: "https://legehandboka.no/handboken/skjema-kalkulatorer/kalkulatorer/diverse/legemiddelkalkulator" },
          ],
        },
        {
          id: `widget_${Date.now()}_6`,
          type: "bookmark",
          title: "Helsedirektoratets veiledere",
          color: "default",
          pinned: false,
          position: 5,
          createdAt: new Date().toISOString(),
          links: [
            { id: "hdir-1", label: "Diabetes", url: "https://www.helsedirektoratet.no/retningslinjer/diabetes" },
            { id: "hdir-2", label: "Hjerte og kar", url: "https://www.helsedirektoratet.no/retningslinjer/forebygging-av-hjerte-og-karsykdom" },
            { id: "hdir-3", label: "Hypertensjon", url: "https://www.helsedirektoratet.no/retningslinjer/forebygging-av-hjerte-og-karsykdom/kartlegging-av-hypertensjon-ved-forebygging-av-hjerte-og-karsykdom#utredning-av-hoyt-blodtrykk-ved-forebygging-av-hjerte-og-karsydom-praktisk-informasjon" },
            { id: "hdir-4", label: "Hyperkolesterolemi", url: "https://www.helsedirektoratet.no/retningslinjer/forebygging-av-hjerte-og-karsykdom/utredning-av-lipidverdiene-ved-primaer-og-sekundaerforebygging-av-hjerte-og-karsykdom#utredning-av-lipidverdiene-ved-primaer-og-sekundaerforebygging-av-hjerte-og-karsykdom" },
            { id: "hdir-5", label: "Svangerskap", url: "https://www.helsedirektoratet.no/retningslinjer/svangerskapsomsorgen" },
          ],
        },
      ];
      setWidgets(defaultWidgets);
      saveWidgets(defaultWidgets);
    }
  }, []);

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

  // Save widgets to localStorage
  const saveWidgets = (updatedWidgets: Widget[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedWidgets));
      setWidgets(updatedWidgets);
    } catch (error) {
      console.error("Failed to save widgets:", error);
    }
  };

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

    saveWidgets([...widgets, newWidget]);
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
    const updatedWidgets = widgets.map((w) =>
      w.id === renameWidgetId ? { ...w, title: renameValue.trim() } : w
    );
    saveWidgets(updatedWidgets);
    setRenameWidgetId(null);
    setRenameValue("");
  };

  const handleChangeColor = (widgetId: string, color: Widget["color"]) => {
    const updatedWidgets = widgets.map((w) =>
      w.id === widgetId ? { ...w, color } : w
    );
    saveWidgets(updatedWidgets);
    setContextMenu(null);
  };

  const handlePin = (widgetId: string) => {
    const updatedWidgets = widgets.map((w) =>
      w.id === widgetId ? { ...w, pinned: !w.pinned } : w
    );
    saveWidgets(updatedWidgets);
    setContextMenu(null);
  };

  const handleDelete = (widgetId: string) => {
    if (!confirm("Slett denne widgeten?")) return;
    const updatedWidgets = widgets.filter((w) => w.id !== widgetId);
    saveWidgets(updatedWidgets);
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
    const updatedWidgets = widgets.map((w) =>
      w.id === widgetId && w.type === "note" ? { ...w, content } : w
    );
    saveWidgets(updatedWidgets);
  };

  const handleUpdateTodo = (widgetId: string, items: TodoWidget["items"]) => {
    const updatedWidgets = widgets.map((w) =>
      w.id === widgetId && w.type === "todo" ? { ...w, items } : w
    );
    saveWidgets(updatedWidgets);
  };

  // Drag & drop handlers
  const handleDragStart = (widgetId: string) => {
    setDraggedWidgetId(widgetId);
  };

  // Get icon for bookmark based on URL
  const getBookmarkIcon = (url: string): string => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return '';
    }
  };

  const getFallbackIcon = (url: string): string => {
    const urlLower = url.toLowerCase();
    if (urlLower.includes('avtalespesialist')) return '👨‍⚕️';
    if (urlLower.includes('knuse-dele-listen') || urlLower.includes('.pdf')) return '📄';
    return '📝'; // Default fallback
  };

  const getFaviconUrl = (url: string): string => {
    try {
      const urlObj = new URL(url);
      return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=16`;
    } catch {
      return '';
    }
  };

  const handleDragOver = (e: React.DragEvent, targetPosition: number) => {
    e.preventDefault();
    if (!draggedWidgetId) return;

    const draggedWidget = widgets.find((w) => w.id === draggedWidgetId);
    if (!draggedWidget) return;

    const updatedWidgets = [...widgets];
    const currentIndex = updatedWidgets.findIndex((w) => w.id === draggedWidgetId);
    updatedWidgets.splice(currentIndex, 1);
    
    updatedWidgets.splice(targetPosition, 0, draggedWidget);
    
    const reorderedWidgets = updatedWidgets.map((w, idx) => ({ ...w, position: idx }));
    setWidgets(reorderedWidgets);
  };

  const handleDragEnd = () => {
    if (draggedWidgetId) {
      saveWidgets(widgets);
    }
    setDraggedWidgetId(null);
  };

  // Sort widgets: pinned first, then by position
  const sortedWidgets = [...widgets].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return a.position - b.position;
  });

  // Calculate grid layout
  const totalCells = Math.ceil((sortedWidgets.length + 1) / GRID_COLUMNS) * GRID_COLUMNS;
  const gridCells = Array.from({ length: totalCells }, (_, i) => i);

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
                      widget.links.map((link) => (
                        <li key={link.id} className="bookmark-item">
                          <img 
                            src={getFaviconUrl(link.url)} 
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
                          <span className="bookmark-fallback-icon" style={{ display: 'none', fontSize: '14px', flexShrink: 0 }}>
                            {getFallbackIcon(link.url)}
                          </span>
                          <a href={link.url} target="_blank" rel="noreferrer">
                            {link.label}
                          </a>
                        </li>
                      ))
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
                              width: `${Math.round((widget.items.filter(i => i.completed).length / widget.items.length) * 100)}%`
                            }}
                          />
                        </div>
                        <span className="todo-progress-text">
                          {Math.round((widget.items.filter(i => i.completed).length / widget.items.length) * 100)}%
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
