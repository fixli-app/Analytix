import { useEffect, useState, type ChangeEvent } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { ArrowDown, ArrowUp, LineChart, Plus, Trash2, X } from 'lucide-react'
import { GraphPlot } from '../charts/GraphPlot'
import type { GraphModel } from '../charts/graphData'

export interface DashboardGraphSource {
  id: string
  label: string
  graph: GraphModel
}

export type DashboardBlock =
  | { id: string; kind: 'chart'; title: string; graph: GraphModel }
  | { id: string; kind: 'text'; title: string; text: string }

interface DashboardDialogProps {
  open: boolean
  graphs: DashboardGraphSource[]
  blocks: DashboardBlock[]
  language: string
  theme: 'light' | 'dark'
  onBlocksChange: (blocks: DashboardBlock[]) => void
  onOpenChange: (open: boolean) => void
}

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function DashboardDialog({
  open,
  graphs,
  blocks,
  language,
  theme,
  onBlocksChange,
  onOpenChange,
}: DashboardDialogProps) {
  const [selectedGraphId, setSelectedGraphId] = useState('')
  const isSwedish = language === 'sv'

  useEffect(() => {
    if (!graphs.some((source) => source.id === selectedGraphId)) {
      setSelectedGraphId(graphs[0]?.id ?? '')
    }
  }, [graphs, selectedGraphId])

  function updateBlock(id: string, patch: Partial<DashboardBlock>) {
    onBlocksChange(
      blocks.map((block) => (block.id === id ? ({ ...block, ...patch } as DashboardBlock) : block)),
    )
  }

  function addChart() {
    const source = graphs.find((item) => item.id === selectedGraphId)
    if (!source) return
    const snapshot = structuredClone(source.graph)
    delete snapshot.stableKey
    onBlocksChange([
      ...blocks,
      { id: newId(), kind: 'chart', title: source.graph.title, graph: snapshot },
    ])
  }

  function addText() {
    onBlocksChange([...blocks, { id: newId(), kind: 'text', title: '', text: '' }])
  }

  function moveBlock(id: string, direction: -1 | 1) {
    const index = blocks.findIndex((block) => block.id === id)
    const nextIndex = index + direction
    if (index < 0 || nextIndex < 0 || nextIndex >= blocks.length) return
    const reordered = [...blocks]
    ;[reordered[index], reordered[nextIndex]] = [reordered[nextIndex], reordered[index]]
    onBlocksChange(reordered)
  }

  function setText(
    block: Extract<DashboardBlock, { kind: 'text' }>,
    field: 'title' | 'text',
    value: string,
  ) {
    updateBlock(block.id, { [field]: value })
  }

  function handleSelect(event: ChangeEvent<HTMLSelectElement>) {
    setSelectedGraphId(event.target.value)
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content dashboard-dialog">
          <div className="dialog-heading">
            <div>
              <Dialog.Title className="dialog-title">
                {isSwedish ? 'Dashboard' : 'Dashboard'}
              </Dialog.Title>
              <Dialog.Description className="dialog-description">
                {isSwedish
                  ? 'Bygg en sparad vy av analysgrafer och egna textblock.'
                  : 'Build a saved view from analysis charts and text blocks.'}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                className="icon-button"
                type="button"
                aria-label={isSwedish ? 'Stäng dashboard' : 'Close dashboard'}
              >
                <X size={16} />
              </button>
            </Dialog.Close>
          </div>
          <div className="dashboard-toolbar">
            <label className="dialog-field">
              <span>{isSwedish ? 'Analysgraf' : 'Analysis graph'}</span>
              <select
                value={selectedGraphId}
                onChange={handleSelect}
                disabled={graphs.length === 0}
              >
                {graphs.length === 0 && (
                  <option value="">{isSwedish ? 'Inga analysgrafer' : 'No analysis charts'}</option>
                )}
                {graphs.map((source) => (
                  <option value={source.id} key={source.id}>
                    {source.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="quality-add-button"
              type="button"
              onClick={addChart}
              disabled={!selectedGraphId}
            >
              <LineChart size={14} /> {isSwedish ? 'Lägg till graf' : 'Add chart'}
            </button>
            <button className="quality-add-button" type="button" onClick={addText}>
              <Plus size={14} /> {isSwedish ? 'Lägg till text' : 'Add text'}
            </button>
          </div>
          {blocks.length === 0 ? (
            <p className="session-caption" role="status">
              {isSwedish ? 'Dashboarden är tom.' : 'The dashboard is empty.'}
            </p>
          ) : (
            <div className="dashboard-blocks">
              {blocks.map((block, index) => (
                <section className="dashboard-block" key={block.id}>
                  <div className="dashboard-block-actions">
                    {block.kind === 'chart' ? (
                      <input
                        className="dashboard-block-title"
                        aria-label={
                          isSwedish ? `Graftitel ${index + 1}` : `Chart title ${index + 1}`
                        }
                        value={block.title}
                        onChange={(event) => updateBlock(block.id, { title: event.target.value })}
                      />
                    ) : (
                      <input
                        className="dashboard-block-title"
                        aria-label={
                          isSwedish ? `Texttitel ${index + 1}` : `Text title ${index + 1}`
                        }
                        placeholder={isSwedish ? 'Rubrik' : 'Heading'}
                        value={block.title}
                        onChange={(event) => setText(block, 'title', event.target.value)}
                      />
                    )}
                    <button
                      className="icon-button"
                      type="button"
                      title={isSwedish ? 'Flytta upp' : 'Move up'}
                      aria-label={`${isSwedish ? 'Flytta upp block' : 'Move block up'} ${index + 1}`}
                      disabled={index === 0}
                      onClick={() => moveBlock(block.id, -1)}
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      className="icon-button"
                      type="button"
                      title={isSwedish ? 'Flytta ned' : 'Move down'}
                      aria-label={`${isSwedish ? 'Flytta ned block' : 'Move block down'} ${index + 1}`}
                      disabled={index === blocks.length - 1}
                      onClick={() => moveBlock(block.id, 1)}
                    >
                      <ArrowDown size={14} />
                    </button>
                    <button
                      className="icon-button"
                      type="button"
                      aria-label={`${isSwedish ? 'Ta bort dashboardblock' : 'Remove dashboard block'} ${index + 1}`}
                      onClick={() => onBlocksChange(blocks.filter((item) => item.id !== block.id))}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  {block.kind === 'chart' ? (
                    <GraphPlot
                      graph={{ ...block.graph, title: block.title }}
                      language={language}
                      theme={theme}
                    />
                  ) : (
                    <textarea
                      className="dashboard-text-block"
                      aria-label={
                        isSwedish ? `Dashboardtext ${index + 1}` : `Dashboard text ${index + 1}`
                      }
                      rows={5}
                      placeholder={
                        isSwedish ? 'Skriv notering eller slutsats' : 'Write a note or finding'
                      }
                      value={block.text}
                      onChange={(event) => setText(block, 'text', event.target.value)}
                    />
                  )}
                </section>
              ))}
            </div>
          )}
          <div className="quality-save-status" role="status">
            {isSwedish ? 'Dashboard sparas automatiskt lokalt' : 'Dashboard is saved locally'}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
