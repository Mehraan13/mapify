import { useState, useEffect } from 'react'
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  addEdge,
  Background,
  Panel,
  useReactFlow,
  ReactFlowProvider,
  getNodesBounds,
  getViewportForBounds,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { motion, AnimatePresence } from 'motion/react'
import { toPng } from 'html-to-image'

const nodeClassName = 'transition-shadow duration-200 hover:shadow-lg cursor-pointer'

const nodeStyleLight = {
  background: '#ffffff',
  color: '#44403c',
  fontFamily: 'Inter',
  fontSize: 13,
  fontWeight: 500,
  padding: '10px 18px',
  borderRadius: 14,
  border: '1px solid #e7e5e4',
  boxShadow: '0 4px 14px rgba(0,0,0,0.05)',
}

const nodeStyleCenter = {
  background: '#292524',
  color: '#fafaf9',
  fontFamily: 'Inter',
  fontWeight: 600,
  fontSize: 15,
  padding: '16px 24px',
  borderRadius: 16,
  border: 'none',
  boxShadow: '0 10px 30px rgba(0,0,0,0.18)',
}

const initialNodes = [
  { id: '1', position: { x: 340, y: 220 }, data: { label: 'Artificial Intelligence', explanation: 'The broad field of building machines that can perform tasks normally requiring human intelligence.' }, style: nodeStyleCenter, className: nodeClassName },
  { id: '2', position: { x: 80, y: 60 }, data: { label: 'Machine Learning', explanation: 'A subset of AI where systems learn patterns from data instead of following explicit rules.' }, style: nodeStyleLight, className: nodeClassName },
  { id: '3', position: { x: 600, y: 60 }, data: { label: 'Neural Networks', explanation: 'A machine learning approach loosely modeled on how neurons connect in the brain.' }, style: nodeStyleLight, className: nodeClassName },
  { id: '4', position: { x: 80, y: 380 }, data: { label: 'Ethics & Bias', explanation: 'The study of fairness, harm, and unintended discrimination in AI systems.' }, style: nodeStyleLight, className: nodeClassName },
  { id: '5', position: { x: 600, y: 380 }, data: { label: 'Robotics', explanation: 'The application of AI to physical machines that sense and act in the real world.' }, style: nodeStyleLight, className: nodeClassName },
]

const initialEdges = [
  { id: 'e1-2', source: '1', target: '2' },
  { id: 'e1-3', source: '1', target: '3' },
  { id: 'e1-4', source: '1', target: '4' },
  { id: 'e1-5', source: '1', target: '5' },
]

async function extractMindMap(text) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Read the following text. Identify the single central topic, and however many genuinely distinct key related concepts actually appear — this could be as few as 2 or as many as 8, do not force a fixed number, base it entirely on what's actually in the text. Keep each label short (2-4 words). For the central topic and every related concept, also write one short, plain-language sentence explaining it.\n\nText:\n${text}`,
          }],
        }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              central: { type: 'STRING' },
              centralExplanation: { type: 'STRING' },
              branches: {
                type: 'ARRAY',
                items: {
                  type: 'OBJECT',
                  properties: {
                    label: { type: 'STRING' },
                    explanation: { type: 'STRING' },
                  },
                  required: ['label', 'explanation'],
                },
              },
            },
            required: ['central', 'centralExplanation', 'branches'],
          },
        },
      }),
    }
  )

  if (!res.ok) {
    const errorBody = await res.text()
    throw new Error(`Gemini API error (${res.status}): ${errorBody}`)
  }

  const data = await res.json()
  const jsonText = data.candidates[0].content.parts[0].text
  return JSON.parse(jsonText)
}

function buildGraph({ central, centralExplanation, branches }) {
  const centerX = 400
  const centerY = 300
  const radius = 260

  const nodes = [
    {
      id: 'center',
      position: { x: centerX, y: centerY },
      data: { label: central, explanation: centralExplanation },
      style: nodeStyleCenter,
      className: nodeClassName,
    },
    ...branches.map((branch, i) => {
      const angle = (i / branches.length) * 2 * Math.PI
      return {
        id: `branch-${i}`,
        position: {
          x: centerX + radius * Math.cos(angle) - 60,
          y: centerY + radius * Math.sin(angle) - 20,
        },
        data: { label: branch.label, explanation: branch.explanation },
        style: nodeStyleLight,
        className: nodeClassName,
      }
    }),
  ]

  const edges = branches.map((_, i) => ({
    id: `e-center-${i}`,
    source: 'center',
    target: `branch-${i}`,
  }))

  return { nodes, edges }
}

function ExportButton() {
  const { getNodes } = useReactFlow()

  const handleExport = () => {
    const nodes = getNodes()
    const bounds = getNodesBounds(nodes)
    const width = 1024
    const height = 768
    const viewport = getViewportForBounds(bounds, width, height, 0.5, 2, 0.1)
    const viewportEl = document.querySelector('.react-flow__viewport')

    toPng(viewportEl, {
      backgroundColor: '#fafaf9',
      width,
      height,
      style: {
        width,
        height,
        transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
      },
    }).then((dataUrl) => {
      const a = document.createElement('a')
      a.setAttribute('download', 'mapify-export.png')
      a.setAttribute('href', dataUrl)
      a.click()
    })
  }

  return (
    <button
      onClick={handleExport}
      className="font-[Inter] text-sm text-stone-500 hover:text-stone-800 transition-colors duration-200"
    >
      Export PNG
    </button>
  )
}

// Owns its own nodes/edges state entirely. Dragging, connecting, and
// panning now only re-render THIS component, not the whole App —
// that's what keeps nodes and edges perfectly in sync while dragging.
function MapCanvas({ seedNodes, seedEdges, onNodeClick, onPaneClick }) {
  const [nodes, , onNodesChange] = useNodesState(seedNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(seedEdges)
  const onConnect = (connection) => setEdges((eds) => addEdge(connection, eds))

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onNodeClick={onNodeClick}
      onPaneClick={onPaneClick}
      defaultEdgeOptions={{
        type: 'smoothstep',
        style: { stroke: '#d6d3d1', strokeWidth: 1.5 },
      }}
      fitView
    >
      <Background color="#e7e5e4" gap={28} />
      <Panel position="top-right">
        <ExportButton />
      </Panel>
    </ReactFlow>
  )
}

function App() {
  const [view, setView] = useState('input')
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [graph, setGraph] = useState({ nodes: initialNodes, edges: initialEdges })
  const [mapKey, setMapKey] = useState(0)
  const [selectedNode, setSelectedNode] = useState(null)
  const [history, setHistory] = useState([])

  useEffect(() => {
    const saved = localStorage.getItem('mapify-history')
    if (saved) setHistory(JSON.parse(saved))
  }, [])

  const onNodeClick = (event, node) => setSelectedNode(node)

  const saveToHistory = (title, newNodes, newEdges) => {
    const entry = { id: Date.now(), title, nodes: newNodes, edges: newEdges }
    const updated = [entry, ...history].slice(0, 8)
    setHistory(updated)
    localStorage.setItem('mapify-history', JSON.stringify(updated))
  }

  const loadFromHistory = (entry) => {
    setGraph({ nodes: entry.nodes, edges: entry.edges })
    setMapKey((k) => k + 1)
    setView('map')
  }

  const handleMapIt = async () => {
    if (!text.trim()) return
    setLoading(true)
    try {
      const result = await extractMindMap(text)
      const { nodes: newNodes, edges: newEdges } = buildGraph(result)
      setGraph({ nodes: newNodes, edges: newEdges })
      setMapKey((k) => k + 1)
      setView('map')
      saveToHistory(result.central, newNodes, newEdges)
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
        <h1 className="font-[Fraunces] text-5xl text-stone-800 mb-3 tracking-tight">
          Mind Mapper
        </h1>
        <p className="font-[Inter] text-stone-500 mb-10 text-sm">
          Paste your text. Watch it become a map.
        </p>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste a dense block of text here..."
          className="font-[Inter] w-full max-w-xl h-48 p-5 rounded-2xl bg-white
                     shadow-[0_8px_30px_rgb(0,0,0,0.06)]
                     border border-stone-200
                     text-stone-700 placeholder:text-stone-400
                     focus:outline-none focus:ring-2 focus:ring-stone-300
                     resize-none"
        />

        <button
          onClick={handleMapIt}
          disabled={loading}
          className="font-[Inter] mt-6 px-8 py-3 rounded-full
                     bg-stone-800 text-stone-50 text-sm font-medium
                     hover:bg-stone-700 transition-colors duration-200
                     disabled:opacity-50"
        >
          {loading ? 'Mapping...' : 'Map It'}
        </button>

        {history.length > 0 && (
          <div className="mt-10 flex flex-wrap gap-2 max-w-xl justify-center">
            {history.map((entry) => (
              <button
                key={entry.id}
                onClick={() => loadFromHistory(entry)}
                className="font-[Inter] text-xs px-4 py-2 rounded-full bg-white
                           border border-stone-200 text-stone-500
                           hover:border-stone-400 hover:text-stone-700
                           transition-colors duration-200"
              >
                {entry.title}
              </button>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {view === 'map' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="w-full h-screen absolute inset-0 bg-stone-50"
          >
            <button
              onClick={() => setView('input')}
              className="absolute top-6 left-6 z-10 font-[Inter] text-sm text-stone-500
                         hover:text-stone-800 transition-colors duration-200"
            >
              ← New Map
            </button>

            <p className="absolute top-6 left-1/2 -translate-x-1/2 z-10 font-[Inter] text-xs text-stone-400">
              Click any node for details
            </p>

            <ReactFlowProvider>
              <MapCanvas
                key={mapKey}
                seedNodes={graph.nodes}
                seedEdges={graph.edges}
                onNodeClick={onNodeClick}
                onPaneClick={() => setSelectedNode(null)}
              />
            </ReactFlowProvider>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedNode && (
          <motion.div
            initial={{ x: 320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 320, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="fixed top-0 right-0 h-screen w-80 bg-white
                       shadow-[-8px_0_30px_rgba(0,0,0,0.06)] p-8 z-20 flex flex-col"
          >
            <button
              onClick={() => setSelectedNode(null)}
              className="self-end text-stone-400 hover:text-stone-800 text-sm mb-6"
            >
              ✕ Close
            </button>
            <h2 className="font-[Fraunces] text-2xl text-stone-800 mb-4">
              {selectedNode.data.label}
            </h2>
            <p className="font-[Inter] text-stone-600 text-sm leading-relaxed">
              {selectedNode.data.explanation}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default App