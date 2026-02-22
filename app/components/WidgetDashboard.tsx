"use client";

import React, { useState, useEffect } from "react";
import NotesWidget from "./NotesWidget";
import TodoListWidget from "./TodoListWidget";
import "./WidgetDashboard.css";

/**
 * WidgetDashboard - Dashboard for managing notes and todo list widgets
 * Features:
 * - Add notes and todo lists
 * - Drag & drop reordering
 * - localStorage persistence for widget layout
 */

interface Widget {
  id: string;
  type: "note" | "todo";
  position: number;
}

const DASHBOARD_STORAGE_KEY = "legex_widget_dashboard";

export default function WidgetDashboard() {
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [draggedWidget, setDraggedWidget] = useState<string | null>(null);

  // Load widget layout from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(DASHBOARD_STORAGE_KEY);
    if (stored) {
      try {
        const loadedWidgets = JSON.parse(stored) as Widget[];
        setWidgets(loadedWidgets);
      } catch (error) {
        console.error("Failed to load dashboard layout:", error);
      }
    }
  }, []);

  // Save widget layout to localStorage
  const saveWidgets = (updatedWidgets: Widget[]) => {
    try {
      localStorage.setItem(DASHBOARD_STORAGE_KEY, JSON.stringify(updatedWidgets));
      setWidgets(updatedWidgets);
    } catch (error) {
      console.error("Failed to save dashboard layout:", error);
    }
  };

  // Add new note widget
  const handleAddNote = () => {
    const newWidget: Widget = {
      id: `note_${Date.now()}`,
      type: "note",
      position: widgets.length,
    };
    saveWidgets([...widgets, newWidget]);
  };

  // Add new todo list widget
  const handleAddTodoList = () => {
    const newWidget: Widget = {
      id: `todo_${Date.now()}`,
      type: "todo",
      position: widgets.length,
    };
    saveWidgets([...widgets, newWidget]);
  };

  // Delete widget
  const handleDeleteWidget = (widgetId: string) => {
    const updatedWidgets = widgets.filter((w) => w.id !== widgetId);
    saveWidgets(updatedWidgets);
  };

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, widgetId: string) => {
    setDraggedWidget(widgetId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, targetWidgetId: string) => {
    e.preventDefault();
    if (!draggedWidget || draggedWidget === targetWidgetId) return;
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetWidgetId: string) => {
    e.preventDefault();
    if (!draggedWidget || draggedWidget === targetWidgetId) return;

    const currentWidgets = [...widgets];
    const draggedIdx = currentWidgets.findIndex((w) => w.id === draggedWidget);
    const targetIdx = currentWidgets.findIndex((w) => w.id === targetWidgetId);

    if (draggedIdx !== -1 && targetIdx !== -1) {
      const draggedItem = currentWidgets[draggedIdx];
      currentWidgets.splice(draggedIdx, 1);
      currentWidgets.splice(targetIdx, 0, draggedItem);

      // Update positions
      const updatedWidgets = currentWidgets.map((widget, index) => ({
        ...widget,
        position: index,
      }));
      
      saveWidgets(updatedWidgets);
    }
    setDraggedWidget(null);
  };

  const handleDragEnd = () => {
    setDraggedWidget(null);
  };

  // Sort widgets by position
  const sortedWidgets = [...widgets].sort((a, b) => a.position - b.position);

  return (
    <div className="widget-dashboard">
      <div className="widget-dashboard-header">
        <h2>Mine Widgets</h2>
        <div className="widget-dashboard-actions">
          <button className="widget-add-btn" onClick={handleAddNote}>
            + Nytt Notat
          </button>
          <button className="widget-add-btn" onClick={handleAddTodoList}>
            + Ny Huskeliste
          </button>
        </div>
      </div>

      <div className="widget-grid">
        {widgets.length === 0 ? (
          <div className="widget-empty-state">
            <p>Ingen widgets ennå.</p>
            <p className="widget-empty-hint">
              Legg til et notat eller en huskeliste for å komme i gang!
            </p>
          </div>
        ) : (
          sortedWidgets.map((widget) => (
            <div
              key={widget.id}
              onDragOver={(e) => handleDragOver(e, widget.id)}
              onDrop={(e) => handleDrop(e, widget.id)}
            >
              {widget.type === "note" ? (
                <NotesWidget
                  noteId={widget.id}
                  onDelete={handleDeleteWidget}
                  isDragging={draggedWidget === widget.id}
                  onDragStart={(e) => handleDragStart(e, widget.id)}
                  onDragEnd={handleDragEnd}
                />
              ) : (
                <TodoListWidget
                  listId={widget.id}
                  onDelete={handleDeleteWidget}
                  isDragging={draggedWidget === widget.id}
                  onDragStart={(e) => handleDragStart(e, widget.id)}
                  onDragEnd={handleDragEnd}
                />
              )}
            </div>
          ))
        )}
      </div>

      <div className="widget-dashboard-info">
        <p>
          💡 <strong>Tips:</strong> Dra widgets for å endre rekkefølgen.
          Dobbeltklikk på oppgaver eller notat-innhold for å redigere.
        </p>
      </div>
    </div>
  );
}
