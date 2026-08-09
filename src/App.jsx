import { useState, useEffect } from 'react'
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  Background,
  Panel,
  MiniMap,
  useReactFlow,
  ReactFlowProvider,
  getNodesBounds,
  getViewportForBounds,
  Handle,
  Position,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { motion, AnimatePresence } from 'motion/react'
import { toPng } from 'html-to-image'

const nodeClassName = 'transition-shadow duration-200 hover:shadow-lg cursor-pointer'

const nodeStyleLight = {
  background: '#ffffff', color: '#44403c', fontFamily: 'Inter', fontSize: 13, fontWeight: 500,
  padding: '10px 18px', borderRadius: 14, border: '1px solid #e7e5e4', boxShadow: '0 4px 14px rgba(0,0,0,0.05)',
}
const nodeStyleCenter = {
  background: '#292524', color: '#fafaf9', fontFamily: 'Inter', fontWeight: 600, fontSize: 15,
  padding: '16px 24px', borderRadius: 16, border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.18)',
}
const nodeStyleManual = {
  background: '#fffbeb', color: '#78350f', fontFamily: 'Inter', fontSize: 13, fontWeight: 500,
  padding: '10px 18px', borderRadius: 14, border: '2px dashed #d97706',
}

function ConceptNode({ id, data }) {
  const [editing, setEditing] = useState(!!data.autoEdit)
  const [value, setValue] = useState(data.label)

  const commit = () => {
    setEditing(false)
    const trimmed = value.trim()
    if (trimmed && trimmed !== data.label) data.onLabelChange(id, trimmed)
    else setValue(data.label)
  }

  const baseStyle = data.isCenter ? nodeStyleCenter : data.manual ? nodeStyleManual : nodeStyleLight
  const canExpand = !data.manual && !data.noExpand && !data.expanded && data.explanation

  return (
    <div style={{ ...baseStyle, position: 'relative' }} className={nodeClassName}
      onDoubleClick={(e) => { e.stopPropagation(); setEditing(true) }}>
      <Handle type="target" position={Position.Top} style={{ background: '#a8a29e' }} />
      {editing ? (
        <input autoFocus value={value} onChange={(e) => setValue(e.target.value)} onBlur={commit}
          onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur() }} onClick={(e) => e.stopPropagation()}
          className="bg-transparent outline-none w-full text-center" style={{ color: 'inherit', font: 'inherit' }} />
      ) : (
        <span>{data.label}</span>
      )}
      {canExpand && (
        <button onClick={(e) => { e.stopPropagation(); data.onExpand(id) }} title="Expand using the original text"
          className="absolute -bottom-2 -right-2 w-5 h-5 rounded-full bg-stone-800 text-white text-xs
                     flex items-center justify-center hover:bg-stone-600 transition-colors">
          +
        </button>
      )}
      <Handle type="source" position={Position.Bottom} style={{ background: '#a8a29e' }} />
    </div>
  )
}

const nodeTypes = { concept: ConceptNode }

const initialNodes = [
  { id: '1', type: 'concept', position: { x: 340, y: 220 }, data: { label: 'Artificial Intelligence', explanation: 'The broad field of building machines that can perform tasks normally requiring human intelligence.', isCenter: true, noExpand: true } },
  { id: '2', type: 'concept', position: { x: 80, y: 60 }, data: { label: 'Machine Learning', explanation: 'A subset of AI where systems learn patterns from data instead of following explicit rules.', noExpand: true } },
  { id: '3', type: 'concept', position: { x: 600, y: 60 }, data: { label: 'Neural Networks', explanation: 'A machine learning approach loosely modeled on how neurons connect in the brain.', noExpand: true } },
  { id: '4', type: 'concept', position: { x: 80, y: 380 }, data: { label: 'Ethics & Bias', explanation: 'The study of fairness, harm, and unintended discrimination in AI systems.', noExpand: true } },
  { id: '5', type: 'concept', position: { x: 600, y: 380 }, data: { label: 'Robotics', explanation: 'The application of AI to physical machines that sense and act in the real world.', noExpand: true } },
]
const initialEdges = [
  { id: 'e1-2', source: '1', target: '2' }, { id: 'e1-3', source: '1', target: '3' },
  { id: 'e1-4', source: '1', target: '4' }, { id: 'e1-5', source: '1', target: '5' },
]

async function extractMindMap(text) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
    {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `Read the following text. Identify the single central topic, and however many genuinely distinct key related concepts actually appear — this could be as few as 2 or as many as 8, do not force a fixed number, base it entirely on what's actually in the text. Keep each label short (2-4 words). For the central topic and every related concept, also write one short, plain-language sentence explaining it.\n\nText:\n${text}` }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              central: { type: 'STRING' }, centralExplanation: { type: 'STRING' },
              branches: { type: 'ARRAY', items: { type: 'OBJECT', properties: { label: { type: 'STRING' }, explanation: { type: 'STRING' } }, required: ['label', 'explanation'] } },
            },
            required: ['central', 'centralExplanation', 'branches'],
          },
        },
      }),
    }
  )
  if (!res.ok) throw new Error(`Gemini API error (${res.status}): ${await res.text()}`)
  const data = await res.json()
  return JSON.parse(data.candidates[0].content.parts[0].text)
}

async function expandConcept(conceptLabel, sourceText) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
    {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `Here is a source text:\n\n${sourceText}\n\nBased ONLY on what is explicitly stated in this text — do not use outside knowledge — identify 2 to 5 sub-concepts specifically related to "${conceptLabel}" that are discussed in this text, each with a short plain-language explanation using only what the text says. If the text doesn't contain enough detail to break "${conceptLabel}" down further, return an empty array.` }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: { type: 'OBJECT', properties: { subconcepts: { type: 'ARRAY', items: { type: 'OBJECT', properties: { label: { type: 'STRING' }, explanation: { type: 'STRING' } }, required: ['label', 'explanation'] } } }, required: ['subconcepts'] },
        },
      }),
    }
  )
  if (!res.ok) throw new Error(`Gemini API error (${res.status}): ${await res.text()}`)
  const data = await res.json()
  return JSON.parse(data.candidates[0].content.parts[0].text)
}

function buildGraph({ central, centralExplanation, branches }) {
  const centerX = 400, centerY = 300, radius = 260
  const nodes = [
    { id: 'center', type: 'concept', position: { x: centerX, y: centerY }, data: { label: central, explanation: centralExplanation, isCenter: true } },
    ...branches.map((branch, i) => {
      const angle = (i / branches.length) * 2 * Math.PI
      return { id: `branch-${i}`, type: 'concept', position: { x: centerX + radius * Math.cos(angle) - 60, y: centerY + radius * Math.sin(angle) - 20 }, data: { label: branch.label, explanation: branch.explanation } }
    }),
  ]
  const edges = branches.map((_, i) => ({ id: `e-center-${i}`, source: 'center', target: `branch-${i}` }))
  return { nodes, edges }
}

// Builds a simple study-note outline from the current graph — central
// topic as H1, each primary branch as an H2 with its note, each
// expansion child as a sub-bullet. Anything not connected to the
// center (stray manual nodes) gets swept into an "Other notes" section
// so nothing you wrote gets silently dropped from the export.
function generateMarkdown(nodes, edges) {
  const center = nodes.find((n) => n.data.isCenter) || nodes[0]
  const childrenOf = (id) => edges.filter((e) => e.source === id).map((e) => nodes.find((n) => n.id === e.target)).filter(Boolean)
  const visited = new Set(center ? [center.id] : [])
  let md = `# ${center?.data.label || 'Mind Map'}\n\n`
  if (center?.data.explanation) md += `${center.data.explanation}\n\n`
  const branches = center ? childrenOf(center.id) : []
  branches.forEach((branch) => {
    visited.add(branch.id)
    md += `## ${branch.data.label}\n`
    if (branch.data.explanation) md += `${branch.data.explanation}\n\n`
    childrenOf(branch.id).forEach((child) => {
      visited.add(child.id)
      md += `- **${child.data.label}** — ${child.data.explanation || ''}\n`
    })
    md += '\n'
  })
  const orphans = nodes.filter((n) => !visited.has(n.id))
  if (orphans.length > 0) {
    md += `## Other notes\n`
    orphans.forEach((n) => { md += `- **${n.data.label}** — ${n.data.explanation || ''}\n` })
  }
  return md
}

function ExportButton() {
  const { getNodes } = useReactFlow()
  const handleExport = () => {
    const bounds = getNodesBounds(getNodes())
    const width = 1024, height = 768
    const viewport = getViewportForBounds(bounds, width, height, 0.5, 2, 0.1)
    toPng(document.querySelector('.react-flow__viewport'), {
      backgroundColor: '#fafaf9', width, height,
      style: { width, height, transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})` },
    }).then((dataUrl) => {
      const a = document.createElement('a')
      a.setAttribute('download', 'mapify-export.png')
      a.setAttribute('href', dataUrl)
      a.click()
    })
  }
  return <button onClick={handleExport} className="font-[Inter] text-sm text-stone-500 hover:text-stone-800 transition-colors duration-200">Export PNG</button>
}

function Legend() {
  return (
    <Panel position="bottom-left">
      <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-stone-200 px-4 py-3 text-xs font-[Inter] text-stone-500 space-y-1.5 shadow-sm">
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-stone-800" /> Central topic</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-white border border-stone-300" /> AI-generated</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-amber-50 border-2 border-dashed border-amber-600" /> Added by you</div>
        <div className="flex items-center gap-2"><span className="w-4 h-0.5 bg-stone-300" /> Primary connection</div>
        <div className="flex items-center gap-2"><span className="w-4 h-0.5 border-t-2 border-dashed border-stone-400" /> Expanded connection</div>
      </div>
    </Panel>
  )
}

// onGraphChange is the fix: it reports the current nodes/edges up to
// App any time something meaningful settles (a drag finishes, a node
// is deleted, a label/note/expansion is saved) — but deliberately NOT
// on every intermediate frame of an active drag, which is what would
// bring back the earlier lag bug.
function MapCanvas({ seedNodes, seedEdges, seedSourceText, onGraphChange }) {
  const [nodes, setNodes] = useNodesState(seedNodes)[0] !== undefined ? useNodesState(seedNodes) : [[], () => {}, () => {}]
  const [edges, setEdges] = useEdgesState(seedEdges)
  const [selectedNode, setSelectedNode] = useState(null)
  const [selectedEdge, setSelectedEdge] = useState(null)
  const [edgeLabelDraft, setEdgeLabelDraft] = useState('')
  const [noteDraft, setNoteDraft] = useState('')
  const [expanding, setExpanding] = useState(false)
  const [undoStack, setUndoStack] = useState([])
  const [redoStack, setRedoStack] = useState([])

  const pushUndo = () => { setUndoStack((s) => [...s, { nodes, edges }].slice(-20)); setRedoStack([]) }

  const undo = () => {
    setUndoStack((stack) => {
      if (stack.length === 0) return stack
      const previous = stack[stack.length - 1]
      setRedoStack((r) => [...r, { nodes, edges }])
      setNodes(previous.nodes); setEdges(previous.edges)
      onGraphChange(previous.nodes, previous.edges)
      return stack.slice(0, -1)
    })
  }
  const redo = () => {
    setRedoStack((stack) => {
      if (stack.length === 0) return stack
      const next = stack[stack.length - 1]
      setUndoStack((u) => [...u, { nodes, edges }])
      setNodes(next.nodes); setEdges(next.edges)
      onGraphChange(next.nodes, next.edges)
      return stack.slice(0, -1)
    })
  }

  useEffect(() => {
    const handleKeyDown = (e) => {
      const isMod = e.metaKey || e.ctrlKey
      if (!isMod || e.key.toLowerCase() !== 'z') return
      e.preventDefault()
      if (e.shiftKey) redo(); else undo()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [nodes, edges, undoStack, redoStack])

  const onNodesChange = (changes) => {
    if (changes.some((c) => c.type === 'remove')) pushUndo()
    setNodes((nds) => {
      const updated = applyNodeChanges(changes, nds)
      if (changes.some((c) => c.type === 'remove')) onGraphChange(updated, edges)
      return updated
    })
  }
  const onEdgesChange = (changes) => {
    if (changes.some((c) => c.type === 'remove')) pushUndo()
    setEdges((eds) => {
      const updated = applyEdgeChanges(changes, eds)
      if (changes.some((c) => c.type === 'remove')) onGraphChange(nodes, updated)
      return updated
    })
  }
  const onNodeDragStart = () => pushUndo()
  const onNodeDragStop = () => onGraphChange(nodes, edges)

  const handleLabelChange = (id, newLabel) => {
    pushUndo()
    const updated = nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, label: newLabel } } : n))
    setNodes(updated)
    onGraphChange(updated, edges)
  }

  const handleNoteChange = (id, newExplanation) => {
    pushUndo()
    const updated = nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, explanation: newExplanation } } : n))
    setNodes(updated)
    onGraphChange(updated, edges)
  }

  const handleExpand = async (nodeId) => {
    if (!seedSourceText) { alert("This map has no original source text to expand from (it's the starter example) — generate a real map first."); return }
    const parent = nodes.find((n) => n.id === nodeId)
    if (!parent) return
    setExpanding(true)
    try {
      const result = await expandConcept(parent.data.label, seedSourceText)
      if (!result.subconcepts || result.subconcepts.length === 0) { alert("The original text doesn't have enough detail to break this concept down further."); return }
      pushUndo()
      const centerX = 400, centerY = 300
      const dx = parent.position.x - centerX, dy = parent.position.y - centerY
      const baseAngle = Math.atan2(dy, dx) || 0
      const spread = Math.PI / 3
      const count = result.subconcepts.length
      const newNodes = result.subconcepts.map((sc, i) => {
        const t = count === 1 ? 0 : i / (count - 1) - 0.5
        const angle = baseAngle + t * spread
        const dist = 200
        return { id: `${nodeId}-child-${i}-${Date.now()}`, type: 'concept', position: { x: parent.position.x + dist * Math.cos(angle), y: parent.position.y + dist * Math.sin(angle) }, data: { label: sc.label, explanation: sc.explanation, noExpand: true } }
      })
      const newEdges = newNodes.map((n) => ({ id: `e-${nodeId}-${n.id}`, source: nodeId, target: n.id, style: { stroke: '#a8a29e', strokeWidth: 1.2, strokeDasharray: '4 4' } }))
      const updatedNodes = nodes.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, expanded: true } } : n)).concat(newNodes)
      const updatedEdges = edges.concat(newEdges)
      setNodes(updatedNodes); setEdges(updatedEdges)
      onGraphChange(updatedNodes, updatedEdges)
    } catch (err) {
      console.error(err); alert('Expansion failed — check the browser console for details.')
    } finally { setExpanding(false) }
  }

  const handleAddManualNode = () => {
    pushUndo()
    const id = `manual-${Date.now()}`
    const newNode = { id, type: 'concept', position: { x: 400 + Math.random() * 100 - 50, y: 550 }, data: { label: 'New idea', manual: true, autoEdit: true } }
    const updated = nodes.concat(newNode)
    setNodes(updated)
    onGraphChange(updated, edges)
  }

  const onConnect = (connection) => {
    pushUndo()
    const updated = addEdge({ ...connection, label: '' }, edges)
    setEdges(updated)
    onGraphChange(nodes, updated)
  }

  const onNodeClick = (event, node) => { setSelectedEdge(null); setSelectedNode(node); setNoteDraft(node.data.explanation || '') }
  const onEdgeClick = (event, edge) => { setSelectedNode(null); setSelectedEdge(edge); setEdgeLabelDraft(edge.label || '') }

  const saveEdgeLabel = () => {
    pushUndo()
    const updated = edges.map((e) => (e.id === selectedEdge.id ? { ...e, label: edgeLabelDraft } : e))
    setEdges(updated)
    onGraphChange(nodes, updated)
    setSelectedEdge(null)
  }

  const handleExportMarkdown = () => {
    const md = generateMarkdown(nodes, edges)
    const blob = new Blob([md], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'mapify-notes.md'; a.click()
    URL.revokeObjectURL(url)
  }

  const nodesWithHandlers = nodes.map((n) => ({ ...n, data: { ...n.data, onLabelChange: handleLabelChange, onExpand: handleExpand } }))

  return (
    <>
      <ReactFlow
        nodes={nodesWithHandlers} edges={edges} nodeTypes={nodeTypes}
        onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect}
        onNodeClick={onNodeClick} onEdgeClick={onEdgeClick}
        onNodeDragStart={onNodeDragStart} onNodeDragStop={onNodeDragStop}
        onPaneClick={() => { setSelectedNode(null); setSelectedEdge(null) }}
        defaultEdgeOptions={{ type: 'default', style: { stroke: '#d6d3d1', strokeWidth: 1.5 }, labelStyle: { fill: '#78716c', fontFamily: 'Inter', fontSize: 11 }, labelBgStyle: { fill: '#fafaf9' } }}
        fitView
      >
        <Background color="#e7e5e4" gap={28} />
        <MiniMap pannable zoomable nodeColor={(n) => (n.data.isCenter ? '#292524' : n.data.manual ? '#fbbf24' : '#e7e5e4')} maskColor="rgba(250, 250, 249, 0.6)" style={{ background: '#fafaf9' }} />
        <Legend />
        <Panel position="top-right" className="flex flex-wrap gap-4 items-center max-w-xs justify-end">
          <button onClick={undo} disabled={undoStack.length === 0} title="Undo (Cmd/Ctrl+Z)" className="font-[Inter] text-sm text-stone-500 hover:text-stone-800 transition-colors duration-200 disabled:opacity-30 disabled:pointer-events-none">↺ Undo</button>
          <button onClick={redo} disabled={redoStack.length === 0} title="Redo (Cmd/Ctrl+Shift+Z)" className="font-[Inter] text-sm text-stone-500 hover:text-stone-800 transition-colors duration-200 disabled:opacity-30 disabled:pointer-events-none">↻ Redo</button>
          <button onClick={handleAddManualNode} className="font-[Inter] text-sm text-stone-500 hover:text-stone-800 transition-colors duration-200">+ Add Node</button>
          <button onClick={handleExportMarkdown} className="font-[Inter] text-sm text-stone-500 hover:text-stone-800 transition-colors duration-200">Export Notes</button>
          <ExportButton />
        </Panel>
        {expanding && <Panel position="bottom-center"><p className="font-[Inter] text-xs text-stone-500 bg-white px-3 py-1.5 rounded-full shadow">Expanding from your text...</p></Panel>}
      </ReactFlow>

      <AnimatePresence>
        {selectedNode && (
          <motion.div initial={{ x: 320, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 320, opacity: 0 }} transition={{ duration: 0.3, ease: 'easeOut' }}
            className="fixed top-0 right-0 h-screen w-80 bg-white shadow-[-8px_0_30px_rgba(0,0,0,0.06)] p-8 z-20 flex flex-col">
            <button onClick={() => setSelectedNode(null)} className="self-end text-stone-400 hover:text-stone-800 text-sm mb-6">✕ Close</button>
            <h2 className="font-[Fraunces] text-2xl text-stone-800 mb-4">{selectedNode.data.label}</h2>
            <textarea value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} placeholder="Add your own notes or explanation..."
              className="font-[Inter] text-stone-600 text-sm leading-relaxed flex-1 resize-none border border-stone-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-stone-300" />
            <button onClick={() => { handleNoteChange(selectedNode.id, noteDraft); setSelectedNode(null) }}
              className="font-[Inter] text-sm bg-stone-800 text-white rounded-full px-4 py-2 mt-4 hover:bg-stone-700 transition-colors">Save</button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedEdge && (
          <motion.div initial={{ x: 320, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 320, opacity: 0 }} transition={{ duration: 0.3, ease: 'easeOut' }}
            className="fixed top-0 right-0 h-screen w-80 bg-white shadow-[-8px_0_30px_rgba(0,0,0,0.06)] p-8 z-20 flex flex-col">
            <button onClick={() => setSelectedEdge(null)} className="self-end text-stone-400 hover:text-stone-800 text-sm mb-6">✕ Close</button>
            <h2 className="font-[Fraunces] text-xl text-stone-800 mb-4">Relationship</h2>
            <input autoFocus value={edgeLabelDraft} onChange={(e) => setEdgeLabelDraft(e.target.value)} placeholder="e.g. enables, limits, causes..."
              className="font-[Inter] text-sm border border-stone-200 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-stone-300" />
            <button onClick={saveEdgeLabel} className="font-[Inter] text-sm bg-stone-800 text-white rounded-full px-4 py-2 hover:bg-stone-700 transition-colors">Save</button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

function App() {
  const [view, setView] = useState(() => (localStorage.getItem('mapify-current') ? 'map' : 'input'))
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [graph, setGraph] = useState(() => {
    const saved = localStorage.getItem('mapify-current')
    return saved ? JSON.parse(saved) : { nodes: initialNodes, edges: initialEdges, sourceText: null }
  })
  const [mapKey, setMapKey] = useState(0)
  const [history, setHistory] = useState([])
  const [currentHistoryId, setCurrentHistoryId] = useState(null)

  useEffect(() => {
    const saved = localStorage.getItem('mapify-history')
    if (saved) setHistory(JSON.parse(saved))
  }, [])

  const updateGraph = (newGraph) => {
    setGraph(newGraph)
    localStorage.setItem('mapify-current', JSON.stringify(newGraph))
  }

  const handleGraphChange = (newNodes, newEdges) => {
  updateGraph({ ...graph, nodes: newNodes, edges: newEdges })
  if (currentHistoryId) updateHistoryEntry(currentHistoryId, newNodes, newEdges)
}

  const saveToHistory = (id, title, newNodes, newEdges, sourceText) => {
  setHistory((h) => {
    const entry = { id, title, nodes: newNodes, edges: newEdges, sourceText }
    const updated = [entry, ...h.filter((e) => e.id !== id)].slice(0, 8)
    localStorage.setItem('mapify-history', JSON.stringify(updated))
    return updated
  })
}

const updateHistoryEntry = (id, newNodes, newEdges) => {
  setHistory((h) => {
    const updated = h.map((entry) => (entry.id === id ? { ...entry, nodes: newNodes, edges: newEdges } : entry))
    localStorage.setItem('mapify-history', JSON.stringify(updated))
    return updated
  })
}

const deleteFromHistory = (id) => {
  setHistory((h) => {
    const updated = h.filter((entry) => entry.id !== id)
    localStorage.setItem('mapify-history', JSON.stringify(updated))
    return updated
  })
}

  const loadFromHistory = (entry) => {
  updateGraph({ nodes: entry.nodes, edges: entry.edges, sourceText: entry.sourceText })
  setMapKey((k) => k + 1)
  setView('map')
  setCurrentHistoryId(entry.id)
}

  const handleMapIt = async () => {
  if (!text.trim()) return
  setLoading(true)
  try {
    const result = await extractMindMap(text)
    const { nodes: newNodes, edges: newEdges } = buildGraph(result)
    const id = Date.now()
    updateGraph({ nodes: newNodes, edges: newEdges, sourceText: text })
    setMapKey((k) => k + 1)
    setView('map')
    setCurrentHistoryId(id)
    saveToHistory(id, result.central, newNodes, newEdges, text)
  } catch (err) {
    console.error(err)
    alert('Something went wrong — check the browser console for details.')
  } finally {
    setLoading(false)
  }
}

  return (
    <>
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center px-6">
        <h1 className="font-[Fraunces] text-5xl text-stone-800 mb-3 tracking-tight">Mind Mapper</h1>
        <p className="font-[Inter] text-stone-500 mb-10 text-sm">Paste your text. Watch it become a map.</p>
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste a dense block of text here..."
          className="font-[Inter] w-full max-w-xl h-48 p-5 rounded-2xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-stone-200 text-stone-700 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300 resize-none" />
        <button onClick={handleMapIt} disabled={loading}
          className="font-[Inter] mt-6 px-8 py-3 rounded-full bg-stone-800 text-stone-50 text-sm font-medium hover:bg-stone-700 transition-colors duration-200 disabled:opacity-50">
          {loading ? 'Mapping...' : 'Map It'}
        </button>
        {history.length > 0 && (
          <div className="mt-10 flex flex-wrap gap-2 max-w-xl justify-center">
            {history.map((entry) => (
              <div key={entry.id} className="flex items-center gap-1 pl-4 pr-2 py-2 rounded-full bg-white border border-stone-200 hover:border-stone-400 transition-colors duration-200">
                <button onClick={() => loadFromHistory(entry)} className="font-[Inter] text-xs text-stone-500 hover:text-stone-700 transition-colors duration-200">{entry.title}</button>
                <button onClick={() => deleteFromHistory(entry.id)} title="Remove from history" className="text-stone-300 hover:text-stone-600 text-xs w-4 h-4 flex items-center justify-center transition-colors duration-200">✕</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {view === 'map' && (
          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 1, ease: 'easeOut' }}
            className="w-full h-screen absolute inset-0 bg-stone-50">
            <button onClick={() => setView('input')} className="absolute top-6 left-6 z-10 font-[Inter] text-sm text-stone-500 hover:text-stone-800 transition-colors duration-200">← New Map</button>
            <p className="absolute top-6 left-1/2 -translate-x-1/2 z-10 font-[Inter] text-xs text-stone-400">Click a node to view or edit notes · Double-click to rename · Click an edge to label it</p>
            <ReactFlowProvider>
              <MapCanvas key={mapKey} seedNodes={graph.nodes} seedEdges={graph.edges} seedSourceText={graph.sourceText} onGraphChange={handleGraphChange} />
            </ReactFlowProvider>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default App