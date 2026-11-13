import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { toPng, toSvg } from 'html-to-image'
import {
  addEdge,
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  SelectionMode,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type DefaultEdgeOptions,
  type Edge,
  type EdgeMarker,
  type Node,
  type NodeProps,
} from '@xyflow/react'
import {
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  Copy,
  Download,
  FileCode,
  Image as ImageIcon,
  Link2,
  Minus,
  Plus,
  Redo2,
  Trash2,
  Undo2,
  X,
} from 'lucide-react'
import '@xyflow/react/dist/style.css'

export type FlowShape =
  'start' | 'process' | 'decision' | 'document' | 'inputOutput' | 'database' | 'subprocess'
type ArrowStyle = 'closed' | 'open' | 'none'
type LineStyle = 'solid' | 'dashed'

interface FlowNodeData extends Record<string, unknown> {
  label: string
  shape: FlowShape
  color: string
}

interface FlowEdgeData extends Record<string, unknown> {
  label: string
  color: string
  arrow: ArrowStyle
  direction?: 'forward' | 'reverse' | 'both' | 'none'
  line: LineStyle
  route: 'straight' | 'smoothstep' | 'step'
}

type FlowNode = Node<FlowNodeData, 'flowShape'>
type FlowEdge = Edge<FlowEdgeData>

interface SavedFlowchart {
  id: string
  title: string
  nodes: FlowNode[]
  edges: FlowEdge[]
}

interface SavedFlowchartDocument {
  version: 2
  activeBoardId: string
  boards: SavedFlowchart[]
}

interface FlowSnapshot {
  title: string
  nodes: FlowNode[]
  edges: FlowEdge[]
}

interface FlowchartEditorProps {
  open: boolean
  language: string
  onOpenChange: (open: boolean) => void
}

const storageKey = 'statlab-flowcharts-v2'
const legacyStorageKey = 'statlab-flowchart-v1'
const colorPalette = [
  { name: 'Sage', value: '#d8eee4' },
  { name: 'Coral', value: '#f9ddd2' },
  { name: 'Gold', value: '#faedc6' },
  { name: 'Sky', value: '#dceaf5' },
  { name: 'Lilac', value: '#e9e1f3' },
  { name: 'White', value: '#ffffff' },
]
const defaultEdgeOptions: DefaultEdgeOptions = {
  type: 'smoothstep',
  markerEnd: { type: MarkerType.ArrowClosed, color: '#49665b' },
  style: { stroke: '#49665b', strokeWidth: 2 },
}
const nodeTypes = { flowShape: FlowShapeNode }

const shapeLabels: Record<FlowShape, [string, string]> = {
  start: ['Start/slut', 'Start/end'],
  process: ['Process', 'Process'],
  decision: ['Beslut', 'Decision'],
  document: ['Dokument', 'Document'],
  inputOutput: ['In-/utdata', 'Input/output'],
  database: ['Databas', 'Database'],
  subprocess: ['Delprocess', 'Subprocess'],
}

function createId(prefix: string) {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? `${prefix}-${crypto.randomUUID()}`
    : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function markerFor(arrow: ArrowStyle, color: string): EdgeMarker | undefined {
  if (arrow === 'none') return undefined
  return { type: arrow === 'open' ? MarkerType.Arrow : MarkerType.ArrowClosed, color }
}

function markersFor(direction: FlowEdgeData['direction'], arrow: ArrowStyle, color: string) {
  const marker = markerFor(arrow, color)
  return {
    markerStart: marker && (direction === 'reverse' || direction === 'both') ? marker : undefined,
    markerEnd: marker && direction !== 'reverse' && direction !== 'none' ? marker : undefined,
  }
}

function readSavedFlowcharts(): SavedFlowchartDocument {
  try {
    const stored = localStorage.getItem(storageKey)
    if (stored) {
      const document = JSON.parse(stored) as Partial<SavedFlowchartDocument>
      const boards = Array.isArray(document.boards)
        ? document.boards.filter((board): board is SavedFlowchart =>
            Boolean(
              board &&
              typeof board.id === 'string' &&
              typeof board.title === 'string' &&
              Array.isArray(board.nodes) &&
              Array.isArray(board.edges),
            ),
          )
        : []
      if (document.version === 2 && boards.length > 0) {
        const activeBoardId = boards.some((board) => board.id === document.activeBoardId)
          ? document.activeBoardId!
          : boards[0].id
        return { version: 2, activeBoardId, boards }
      }
    }
    const legacy = localStorage.getItem(legacyStorageKey)
    if (legacy) {
      const board = JSON.parse(legacy) as Partial<SavedFlowchart> & { version?: number }
      if (
        typeof board.title === 'string' &&
        Array.isArray(board.nodes) &&
        Array.isArray(board.edges)
      ) {
        const migrated: SavedFlowchart = {
          id: 'board-1',
          title: board.title,
          nodes: board.nodes as FlowNode[],
          edges: board.edges as FlowEdge[],
        }
        return { version: 2, activeBoardId: migrated.id, boards: [migrated] }
      }
    }
  } catch {
    // Ignore invalid local data and start with a clean board.
  }
  const firstBoard: SavedFlowchart = {
    id: 'board-1',
    title: 'Flödesschema 1',
    nodes: [],
    edges: [],
  }
  return { version: 2, activeBoardId: firstBoard.id, boards: [firstBoard] }
}

function FlowShapeNode({ data, selected }: NodeProps<FlowNode>) {
  const sides = [
    {
      side: 'top',
      position: Position.Top,
      sourceStyle: { left: '35%' },
      targetStyle: { left: '65%' },
    },
    {
      side: 'right',
      position: Position.Right,
      sourceStyle: { top: '35%' },
      targetStyle: { top: '65%' },
    },
    {
      side: 'bottom',
      position: Position.Bottom,
      sourceStyle: { left: '65%' },
      targetStyle: { left: '35%' },
    },
    {
      side: 'left',
      position: Position.Left,
      sourceStyle: { top: '65%' },
      targetStyle: { top: '35%' },
    },
  ] as const

  return (
    <div
      className={`flow-shape flow-shape-${data.shape}${selected ? ' selected' : ''}`}
      style={{ backgroundColor: data.color, '--flow-fill': data.color } as CSSProperties}
    >
      {sides.map(({ side, position, sourceStyle }) => (
        <Handle
          key={`source-${side}`}
          type="source"
          position={position}
          id={`source-${side}`}
          className="flow-port flow-port-source"
          style={sourceStyle}
          title={`Connect from ${side}`}
        />
      ))}
      <span>{data.label}</span>
      {sides.map(({ side, position, targetStyle }) => (
        <Handle
          key={`target-${side}`}
          type="target"
          position={position}
          id={`target-${side}`}
          className="flow-port flow-port-target"
          style={targetStyle}
          title={`Connect to ${side}`}
        />
      ))}
    </div>
  )
}

function FlowchartWorkspace({ language }: { language: string }) {
  const [initial] = useState(readSavedFlowcharts)
  const [boards, setBoards] = useState(initial.boards)
  const [activeBoardId, setActiveBoardId] = useState(initial.activeBoardId)
  const activeBoard = boards.find((board) => board.id === activeBoardId) ?? boards[0]
  const [title, setTitle] = useState(activeBoard.title)
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>(activeBoard.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState<FlowEdge>(activeBoard.edges)
  const undoStack = useRef<FlowSnapshot[]>([])
  const redoStack = useRef<FlowSnapshot[]>([])
  const titleBeforeEdit = useRef<string | null>(null)
  const [historyRevision, setHistoryRevision] = useState(0)
  const [connectionMode, setConnectionMode] = useState(false)
  const [connectFromId, setConnectFromId] = useState<string | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const { screenToFlowPosition } = useReactFlow<FlowNode, FlowEdge>()
  const isSwedish = language === 'sv'
  const selectedNode = nodes.find((node) => node.selected)
  const selectedEdge = edges.find((edge) => edge.selected)
  const canUndo = undoStack.current.length > 0
  const canRedo = redoStack.current.length > 0

  function snapshot(): FlowSnapshot {
    return {
      title,
      nodes: nodes.map((node) => ({ ...node, selected: false })),
      edges: edges.map((edge) => ({ ...edge, selected: false })),
    }
  }

  function recordHistory(before = snapshot()) {
    undoStack.current = [...undoStack.current.slice(-49), before]
    redoStack.current = []
    setHistoryRevision((revision) => revision + 1)
  }

  function undo() {
    const previous = undoStack.current.pop()
    if (!previous) return
    redoStack.current.push(snapshot())
    setTitle(previous.title)
    setNodes(previous.nodes)
    setEdges(previous.edges)
    setHistoryRevision((revision) => revision + 1)
  }

  function redo() {
    const next = redoStack.current.pop()
    if (!next) return
    undoStack.current.push(snapshot())
    setTitle(next.title)
    setNodes(next.nodes)
    setEdges(next.edges)
    setHistoryRevision((revision) => revision + 1)
  }

  function finishTitleEdit() {
    const previousTitle = titleBeforeEdit.current
    titleBeforeEdit.current = null
    if (previousTitle === null || previousTitle === title) return
    recordHistory({
      title: previousTitle,
      nodes: nodes.map((node) => ({ ...node, selected: false })),
      edges: edges.map((edge) => ({ ...edge, selected: false })),
    })
  }

  useEffect(() => {
    setBoards((current) =>
      current.map((board) =>
        board.id === activeBoardId
          ? {
              ...board,
              title,
              nodes: nodes.map((node) => ({ ...node, selected: false })),
              edges: edges.map((edge) => ({ ...edge, selected: false })),
            }
          : board,
      ),
    )
  }, [activeBoardId, edges, nodes, title])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved: SavedFlowchartDocument = {
        version: 2,
        activeBoardId,
        boards,
      }
      try {
        localStorage.setItem(storageKey, JSON.stringify(saved))
      } catch {
        // Keep the editor usable if browser storage is unavailable or full.
      }
    }, 250)
    return () => window.clearTimeout(timer)
  }, [activeBoardId, boards])

  function createBoard() {
    const baseName = isSwedish ? 'Flödesschema' : 'Flowchart'
    let number = boards.length + 1
    while (boards.some((board) => board.title === `${baseName} ${number}`)) number++
    const board: SavedFlowchart = {
      id: `board-${Date.now()}`,
      title: `${baseName} ${number}`,
      nodes: [],
      edges: [],
    }
    setBoards((current) => [...current, board])
    setActiveBoardId(board.id)
    setTitle(board.title)
    setNodes([])
    setEdges([])
    undoStack.current = []
    redoStack.current = []
    setHistoryRevision((revision) => revision + 1)
  }

  function selectBoard(boardId: string) {
    const board = boards.find((item) => item.id === boardId)
    if (!board || board.id === activeBoardId) return
    setActiveBoardId(board.id)
    setTitle(board.title)
    setNodes(board.nodes)
    setEdges(board.edges)
    undoStack.current = []
    redoStack.current = []
    setHistoryRevision((revision) => revision + 1)
  }

  function deleteBoard() {
    if (boards.length <= 1) return
    const activeIndex = boards.findIndex((board) => board.id === activeBoardId)
    const nextBoard = boards[activeIndex === 0 ? 1 : activeIndex - 1]
    setBoards((current) => current.filter((board) => board.id !== activeBoardId))
    setActiveBoardId(nextBoard.id)
    setTitle(nextBoard.title)
    setNodes(nextBoard.nodes)
    setEdges(nextBoard.edges)
    undoStack.current = []
    redoStack.current = []
    setHistoryRevision((revision) => revision + 1)
  }

  function addShape(shape: FlowShape) {
    const bounds = canvasRef.current?.getBoundingClientRect()
    const canvasWidth = bounds?.width ?? 900
    const canvasColumns = Math.max(1, Math.floor((canvasWidth - 24) / 350))
    const columnIndex = nodes.length % canvasColumns
    const rowIndex = Math.floor(nodes.length / canvasColumns)
    const position = screenToFlowPosition({
      x: (bounds?.left ?? 0) + ((columnIndex + 0.5) * canvasWidth) / canvasColumns,
      y: (bounds?.top ?? 0) + 115 + rowIndex * 205,
    })
    recordHistory()
    setNodes((current) => [
      ...current,
      {
        id: createId('node'),
        type: 'flowShape',
        position,
        data: {
          shape,
          label: `${shapeLabels[shape][isSwedish ? 0 : 1]}${shape === 'decision' ? '?' : ''}`,
          color: colorPalette[0].value,
        },
      },
    ])
  }

  function updateNode(patch: Partial<FlowNodeData>) {
    if (!selectedNode) return
    recordHistory()
    setNodes((current) =>
      current.map((node) =>
        node.id === selectedNode.id ? { ...node, data: { ...node.data, ...patch } } : node,
      ),
    )
  }

  function updateEdge(patch: Partial<FlowEdgeData>) {
    if (!selectedEdge) return
    recordHistory()
    setEdges((current) =>
      current.map((edge) => {
        if (edge.id !== selectedEdge.id) return edge
        const data = { ...edge.data, ...patch }
        return {
          ...edge,
          data,
          label: data.label,
          type: data.route ?? 'smoothstep',
          ...markersFor(data.direction, data.arrow, data.color),
          style: {
            ...edge.style,
            stroke: data.color,
            strokeWidth: 2,
            strokeDasharray: data.line === 'dashed' ? '7 5' : undefined,
          },
        }
      }),
    )
  }

  function connect(connection: Connection) {
    const data: FlowEdgeData = {
      label: '',
      color: '#49665b',
      arrow: 'closed',
      direction: 'forward',
      line: 'solid',
      route: 'smoothstep',
    }
    recordHistory()
    setNodes((current) => current.map((node) => ({ ...node, selected: false })))
    const edgeId = createId('edge')
    setEdges((current) =>
      addEdge(
        {
          ...connection,
          id: edgeId,
          type: 'smoothstep',
          label: data.label,
          data,
          ...markersFor(data.direction, data.arrow, data.color),
          style: { stroke: data.color, strokeWidth: 2 },
        },
        current.map((edge) => ({ ...edge, selected: false })),
      ).map((edge) => ({ ...edge, selected: edge.id === edgeId })),
    )
  }

  function handleNodeClick(node: FlowNode) {
    if (!connectionMode) return
    if (!connectFromId) {
      setConnectFromId(node.id)
      return
    }
    if (node.id === connectFromId) {
      setConnectFromId(null)
      return
    }

    const source = nodes.find((item) => item.id === connectFromId)
    if (!source) {
      setConnectFromId(null)
      return
    }

    const deltaX = node.position.x - source.position.x
    const deltaY = node.position.y - source.position.y
    let sourceSide: string
    let targetSide: string
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      sourceSide = deltaX >= 0 ? 'right' : 'left'
      targetSide = deltaX >= 0 ? 'left' : 'right'
    } else {
      sourceSide = deltaY >= 0 ? 'bottom' : 'top'
      targetSide = deltaY >= 0 ? 'top' : 'bottom'
    }

    connect({
      source: source.id,
      target: node.id,
      sourceHandle: `source-${sourceSide}`,
      targetHandle: `target-${targetSide}`,
    })
    setConnectFromId(null)
  }

  function toggleConnectionMode() {
    setConnectFromId(null)
    setConnectionMode((active) => !active)
  }

  function deleteSelection() {
    const selectedNodeIds = new Set(nodes.filter((node) => node.selected).map((node) => node.id))
    if (selectedNodeIds.size === 0 && !edges.some((edge) => edge.selected)) return
    recordHistory()
    setNodes((current) => current.filter((node) => !selectedNodeIds.has(node.id)))
    setEdges((current) =>
      current.filter(
        (edge) =>
          !edge.selected && !selectedNodeIds.has(edge.source) && !selectedNodeIds.has(edge.target),
      ),
    )
  }

  function duplicateSelection() {
    const selectedNodes = nodes.filter((node) => node.selected)
    const selectedEdges = edges.filter((edge) => edge.selected)
    if (selectedNodes.length === 0 && selectedEdges.length === 0) return
    recordHistory()

    const idMap = new Map(selectedNodes.map((node) => [node.id, createId('node')]))
    const duplicates = selectedNodes.map((node) => ({
      ...node,
      id: idMap.get(node.id)!,
      selected: true,
      position: { x: node.position.x + 36, y: node.position.y + 36 },
    }))
    const duplicatedEdges = edges
      .filter(
        (edge) =>
          (edge.selected || (idMap.has(edge.source) && idMap.has(edge.target))) &&
          (selectedNodes.length === 0 ||
            selectedEdges.includes(edge) ||
            (idMap.has(edge.source) && idMap.has(edge.target))),
      )
      .map((edge) => ({
        ...edge,
        id: createId('edge'),
        source: idMap.get(edge.source) ?? edge.source,
        target: idMap.get(edge.target) ?? edge.target,
        selected: true,
      }))

    setNodes((current) => [...current.map((node) => ({ ...node, selected: false })), ...duplicates])
    setEdges((current) => [
      ...current.map((edge) => ({ ...edge, selected: false })),
      ...duplicatedEdges,
    ])
  }

  function exportFlowchart() {
    const file = {
      version: 1,
      title,
      nodes: nodes.map((node) => ({ ...node, selected: false })),
      edges: edges.map((edge) => ({ ...edge, selected: false })),
    }
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' }),
    )
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${title.trim() || 'flowchart'}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  async function exportImage(format: 'png' | 'svg') {
    if (!canvasRef.current) return
    try {
      const render = format === 'png' ? toPng : toSvg
      const dataUrl = await render(canvasRef.current, {
        backgroundColor: '#ffffff',
        pixelRatio: 2,
        filter: (element) =>
          !(
            element instanceof HTMLElement &&
            (element.classList.contains('react-flow__controls') ||
              element.classList.contains('react-flow__minimap') ||
              element.classList.contains('flow-empty-state'))
          ),
      })
      const anchor = document.createElement('a')
      anchor.href = dataUrl
      anchor.download = `${title.trim() || 'flowchart'}.${format}`
      document.body.append(anchor)
      anchor.click()
      anchor.remove()
    } catch {
      window.alert(
        isSwedish ? 'Diagrammet kunde inte exporteras.' : 'The diagram could not be exported.',
      )
    }
  }

  function handleEditorKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    const target = event.target
    const isEditingText =
      target instanceof HTMLElement &&
      (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
    if (isEditingText) return

    if (event.key === 'Escape' && connectionMode) {
      setConnectionMode(false)
      setConnectFromId(null)
    } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
      event.preventDefault()
      if (event.shiftKey) redo()
      else undo()
    } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
      event.preventDefault()
      redo()
    } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd') {
      event.preventDefault()
      duplicateSelection()
    } else if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault()
      deleteSelection()
    }
  }

  return (
    <div
      className="flow-editor-shell"
      data-history-revision={historyRevision}
      onKeyDown={handleEditorKeyDown}
    >
      <header className="flow-editor-toolbar">
        <div className="flow-editor-brand">
          <span className="flow-editor-mark" aria-hidden="true">
            F
          </span>
          <input
            aria-label={isSwedish ? 'Diagramnamn' : 'Diagram name'}
            value={title}
            onFocus={() => {
              titleBeforeEdit.current = title
            }}
            onBlur={finishTitleEdit}
            onChange={(event) => setTitle(event.target.value)}
          />
          <select
            className="flow-board-select"
            aria-label={isSwedish ? 'Välj diagram' : 'Choose diagram'}
            value={activeBoardId}
            onChange={(event) => selectBoard(event.target.value)}
          >
            {boards.map((board) => (
              <option value={board.id} key={board.id}>
                {board.title}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="icon-button"
            title={isSwedish ? 'Nytt diagram' : 'New diagram'}
            aria-label={isSwedish ? 'Nytt diagram' : 'New diagram'}
            onClick={createBoard}
          >
            <Plus size={15} />
          </button>
          <button
            type="button"
            className="icon-button"
            title={isSwedish ? 'Ta bort diagram' : 'Delete diagram'}
            aria-label={isSwedish ? 'Ta bort diagram' : 'Delete diagram'}
            onClick={deleteBoard}
            disabled={boards.length <= 1}
          >
            <Trash2 size={15} />
          </button>
        </div>
        <div
          className="flow-shape-toolbar"
          role="toolbar"
          aria-label={isSwedish ? 'Former' : 'Shapes'}
        >
          <button type="button" onClick={() => addShape('start')}>
            <Plus size={14} />
            {isSwedish ? 'Start/slut' : 'Start/end'}
          </button>
          <button type="button" onClick={() => addShape('process')}>
            <Plus size={14} />
            {isSwedish ? 'Process' : 'Process'}
          </button>
          <button type="button" onClick={() => addShape('decision')}>
            <Plus size={14} />
            {isSwedish ? 'Beslut' : 'Decision'}
          </button>
          <button type="button" onClick={() => addShape('document')}>
            <Plus size={14} />
            {isSwedish ? 'Dokument' : 'Document'}
          </button>
          <button type="button" onClick={() => addShape('inputOutput')}>
            <Plus size={14} />
            {isSwedish ? 'In-/utdata' : 'Input/output'}
          </button>
          <button type="button" onClick={() => addShape('database')}>
            <Plus size={14} />
            {isSwedish ? 'Databas' : 'Database'}
          </button>
          <button type="button" onClick={() => addShape('subprocess')}>
            <Plus size={14} />
            {isSwedish ? 'Delprocess' : 'Subprocess'}
          </button>
        </div>
        <div className="flow-editor-actions">
          <button
            type="button"
            className="flow-connect-toggle"
            title={
              connectionMode
                ? isSwedish
                  ? 'Avsluta koppling'
                  : 'Cancel connection'
                : isSwedish
                  ? 'Koppla två former'
                  : 'Connect two shapes'
            }
            aria-pressed={connectionMode}
            onClick={toggleConnectionMode}
          >
            <Link2 size={15} />
            {connectionMode
              ? isSwedish
                ? 'Avbryt koppling'
                : 'Cancel connect'
              : isSwedish
                ? 'Koppla'
                : 'Connect'}
          </button>
          {connectionMode && (
            <span className="flow-connect-hint" role="status">
              {connectFromId
                ? isSwedish
                  ? 'Välj till-form'
                  : 'Choose target'
                : isSwedish
                  ? 'Välj från-form'
                  : 'Choose source'}
            </span>
          )}
          <button
            type="button"
            className="icon-button"
            title={isSwedish ? 'Ångra (Ctrl+Z)' : 'Undo (Ctrl+Z)'}
            aria-label={isSwedish ? 'Ångra' : 'Undo'}
            onClick={undo}
            disabled={!canUndo}
          >
            <Undo2 size={16} />
          </button>
          <button
            type="button"
            className="icon-button"
            title={isSwedish ? 'Gör om (Ctrl+Y)' : 'Redo (Ctrl+Y)'}
            aria-label={isSwedish ? 'Gör om' : 'Redo'}
            onClick={redo}
            disabled={!canRedo}
          >
            <Redo2 size={16} />
          </button>
          <button
            type="button"
            className="icon-button"
            title={isSwedish ? 'Duplicera markering (Ctrl+D)' : 'Duplicate selection (Ctrl+D)'}
            aria-label={isSwedish ? 'Duplicera markering' : 'Duplicate selection'}
            onClick={duplicateSelection}
            disabled={!selectedNode && !selectedEdge}
          >
            <Copy size={16} />
          </button>
          <button
            type="button"
            className="icon-button"
            title={isSwedish ? 'Ta bort markering' : 'Delete selection'}
            onClick={deleteSelection}
          >
            <Trash2 size={16} />
          </button>
          <button
            type="button"
            className="icon-button"
            title={isSwedish ? 'Exportera diagram' : 'Export diagram'}
            onClick={exportFlowchart}
          >
            <Download size={16} />
          </button>
          <button
            type="button"
            className="icon-button"
            title={isSwedish ? 'Exportera som PNG' : 'Export as PNG'}
            aria-label={isSwedish ? 'Exportera som PNG' : 'Export as PNG'}
            onClick={() => void exportImage('png')}
          >
            <ImageIcon size={16} />
          </button>
          <button
            type="button"
            className="icon-button"
            title={isSwedish ? 'Exportera som SVG' : 'Export as SVG'}
            aria-label={isSwedish ? 'Exportera som SVG' : 'Export as SVG'}
            onClick={() => void exportImage('svg')}
          >
            <FileCode size={16} />
          </button>
          <Dialog.Close asChild>
            <button
              type="button"
              className="icon-button"
              title={isSwedish ? 'Stäng diagram' : 'Close diagram'}
              aria-label={isSwedish ? 'Stäng diagram' : 'Close diagram'}
            >
              <X size={16} />
            </button>
          </Dialog.Close>
        </div>
      </header>
      <div className="flow-editor-body">
        <div className={`flow-canvas${connectionMode ? ' connection-mode' : ''}`} ref={canvasRef}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={(_, node) => handleNodeClick(node)}
            onNodeDragStart={() => recordHistory()}
            onConnect={connect}
            defaultEdgeOptions={defaultEdgeOptions}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            deleteKeyCode={null}
            panOnDrag={[1, 2]}
            selectionOnDrag
            selectionMode={SelectionMode.Partial}
          >
            <Background variant={BackgroundVariant.Dots} gap={18} size={1} />
            <MiniMap pannable zoomable nodeColor={(node) => (node.data as FlowNodeData).color} />
            <Controls />
          </ReactFlow>
          {nodes.length === 0 && (
            <div className="flow-empty-state" aria-hidden="true">
              <span>{isSwedish ? 'Börja med en form' : 'Start with a shape'}</span>
            </div>
          )}
        </div>
        <aside className="flow-inspector" aria-label={isSwedish ? 'Egenskaper' : 'Properties'}>
          {selectedNode ? (
            <>
              <h2>{isSwedish ? 'Form' : 'Shape'}</h2>
              <label className="flow-inspector-field">
                <span>{isSwedish ? 'Text' : 'Text'}</span>
                <textarea
                  value={selectedNode.data.label}
                  onChange={(event) => updateNode({ label: event.target.value })}
                  rows={3}
                />
              </label>
              <label className="flow-inspector-field">
                <span>{isSwedish ? 'Formtyp' : 'Shape type'}</span>
                <select
                  value={selectedNode.data.shape}
                  onChange={(event) => updateNode({ shape: event.target.value as FlowShape })}
                >
                  <option value="start">{isSwedish ? 'Start/slut' : 'Start/end'}</option>
                  <option value="process">{isSwedish ? 'Process' : 'Process'}</option>
                  <option value="decision">{isSwedish ? 'Beslut' : 'Decision'}</option>
                  <option value="document">{isSwedish ? 'Dokument' : 'Document'}</option>
                  <option value="inputOutput">{isSwedish ? 'In-/utdata' : 'Input/output'}</option>
                  <option value="database">{isSwedish ? 'Databas' : 'Database'}</option>
                  <option value="subprocess">{isSwedish ? 'Delprocess' : 'Subprocess'}</option>
                </select>
              </label>
              <fieldset className="flow-color-picker">
                <legend>{isSwedish ? 'Fyllnadsfärg' : 'Fill color'}</legend>
                {colorPalette.map((color) => (
                  <button
                    type="button"
                    key={color.value}
                    aria-label={`${isSwedish ? 'Färg' : 'Color'} ${color.name}`}
                    aria-pressed={selectedNode.data.color === color.value}
                    style={{ backgroundColor: color.value }}
                    onClick={() => updateNode({ color: color.value })}
                  />
                ))}
              </fieldset>
              <label className="flow-inspector-field flow-custom-color">
                <span>{isSwedish ? 'Anpassad färg' : 'Custom color'}</span>
                <input
                  type="color"
                  aria-label={isSwedish ? 'Anpassad fyllnadsfärg' : 'Custom fill color'}
                  value={selectedNode.data.color}
                  onChange={(event) => updateNode({ color: event.target.value })}
                />
              </label>
            </>
          ) : selectedEdge ? (
            <>
              <h2>{isSwedish ? 'Pil' : 'Arrow'}</h2>
              <div
                className="flow-direction-picker"
                role="group"
                aria-label={isSwedish ? 'Pilens riktning' : 'Arrow direction'}
              >
                <button
                  type="button"
                  aria-label={isSwedish ? 'Framåt' : 'Forward'}
                  aria-pressed={(selectedEdge.data.direction ?? 'forward') === 'forward'}
                  onClick={() => updateEdge({ direction: 'forward' })}
                >
                  <ArrowRight size={16} />
                  <span>{isSwedish ? 'Framåt' : 'Forward'}</span>
                </button>
                <button
                  type="button"
                  aria-label={isSwedish ? 'Bakåt' : 'Reverse'}
                  aria-pressed={selectedEdge.data.direction === 'reverse'}
                  onClick={() => updateEdge({ direction: 'reverse' })}
                >
                  <ArrowLeft size={16} />
                  <span>{isSwedish ? 'Bakåt' : 'Reverse'}</span>
                </button>
                <button
                  type="button"
                  aria-label={isSwedish ? 'Båda riktningarna' : 'Both directions'}
                  aria-pressed={selectedEdge.data.direction === 'both'}
                  onClick={() => updateEdge({ direction: 'both' })}
                >
                  <ArrowLeftRight size={16} />
                  <span>{isSwedish ? 'Båda' : 'Both'}</span>
                </button>
                <button
                  type="button"
                  aria-label={isSwedish ? 'Ingen riktning' : 'No direction'}
                  aria-pressed={selectedEdge.data.direction === 'none'}
                  onClick={() => updateEdge({ direction: 'none' })}
                >
                  <Minus size={16} />
                  <span>{isSwedish ? 'Ingen' : 'None'}</span>
                </button>
              </div>
              <label className="flow-inspector-field">
                <span>{isSwedish ? 'Etikett' : 'Label'}</span>
                <input
                  value={selectedEdge.data.label}
                  onChange={(event) => updateEdge({ label: event.target.value })}
                />
              </label>
              <label className="flow-inspector-field">
                <span>{isSwedish ? 'Pilspets' : 'Arrowhead'}</span>
                <select
                  value={selectedEdge.data.arrow}
                  onChange={(event) => updateEdge({ arrow: event.target.value as ArrowStyle })}
                >
                  <option value="closed">{isSwedish ? 'Fylld pil' : 'Closed arrow'}</option>
                  <option value="open">{isSwedish ? 'Öppen pil' : 'Open arrow'}</option>
                  <option value="none">{isSwedish ? 'Ingen' : 'None'}</option>
                </select>
              </label>
              <label className="flow-inspector-field">
                <span>{isSwedish ? 'Linje' : 'Line'}</span>
                <select
                  value={selectedEdge.data.line}
                  onChange={(event) => updateEdge({ line: event.target.value as LineStyle })}
                >
                  <option value="solid">{isSwedish ? 'Heldragen' : 'Solid'}</option>
                  <option value="dashed">{isSwedish ? 'Streckad' : 'Dashed'}</option>
                </select>
              </label>
              <label className="flow-inspector-field">
                <span>{isSwedish ? 'Dragning' : 'Routing'}</span>
                <select
                  value={selectedEdge.data.route ?? 'smoothstep'}
                  onChange={(event) =>
                    updateEdge({ route: event.target.value as FlowEdgeData['route'] })
                  }
                >
                  <option value="smoothstep">{isSwedish ? 'Rundad' : 'Smooth step'}</option>
                  <option value="step">{isSwedish ? 'Rätvinklig' : 'Right angle'}</option>
                  <option value="straight">{isSwedish ? 'Rak' : 'Straight'}</option>
                </select>
              </label>
              <fieldset className="flow-color-picker">
                <legend>{isSwedish ? 'Pilen färg' : 'Arrow color'}</legend>
                {colorPalette.map((color) => (
                  <button
                    type="button"
                    key={color.value}
                    aria-label={`${isSwedish ? 'Färg' : 'Color'} ${color.name}`}
                    aria-pressed={selectedEdge.data.color === color.value}
                    style={{ backgroundColor: color.value }}
                    onClick={() => updateEdge({ color: color.value })}
                  />
                ))}
              </fieldset>
              <label className="flow-inspector-field flow-custom-color">
                <span>{isSwedish ? 'Anpassad färg' : 'Custom color'}</span>
                <input
                  type="color"
                  aria-label={isSwedish ? 'Anpassad pilfärg' : 'Custom arrow color'}
                  value={selectedEdge.data.color}
                  onChange={(event) => updateEdge({ color: event.target.value })}
                />
              </label>
            </>
          ) : (
            <div className="flow-inspector-empty">
              {isSwedish ? 'Välj en form eller pil' : 'Select a shape or arrow'}
            </div>
          )}
          {(selectedNode || selectedEdge) && (
            <button type="button" className="flow-delete-button" onClick={deleteSelection}>
              <Trash2 size={14} />
              {isSwedish ? 'Ta bort' : 'Delete'}
            </button>
          )}
        </aside>
      </div>
    </div>
  )
}

export function FlowchartEditor({ open, language, onOpenChange }: FlowchartEditorProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="flow-editor-overlay" />
        <Dialog.Content className="flow-editor-dialog" aria-describedby="flow-editor-description">
          <Dialog.Title className="sr-only">
            {language === 'sv' ? 'Flödesschemaeditor' : 'Flowchart editor'}
          </Dialog.Title>
          <Dialog.Description id="flow-editor-description" className="sr-only">
            {language === 'sv' ? 'Redigera former och pilar.' : 'Edit shapes and arrows.'}
          </Dialog.Description>
          <ReactFlowProvider>
            <FlowchartWorkspace language={language} />
          </ReactFlowProvider>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
