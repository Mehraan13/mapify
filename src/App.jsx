import { useState } from 'react'
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  addEdge,
  Background,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { motion, AnimatePresence } from 'motion/react'

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
  { id: '1', position: { x: 340, y: 220 }, data: { label: 'Artificial Intelligence' }, style: nodeStyleCenter },
  { id: '2', position: { x: 80, y: 60 }, data: { label: 'Machine Learning' }, style: nodeStyleLight },
  { id: '3', position: { x: 600, y: 60 }, data: { label: 'Neural Networks' }, style: nodeStyleLight },
  { id: '4', position: { x: 80, y: 380 }, data: { label: 'Ethics & Bias' }, style: nodeStyleLight },
  { id: '5', position: { x: 600, y: 380 }, data: { label: 'Robotics' }, style: nodeStyleLight },
]

const initialEdges = [
  { id: 'e1-2', source: '1', target: '2' },
  { id: 'e1-3', source: '1', target: '3' },
  { id: 'e1-4', source: '1', target: '4' },
  { id: 'e1-5', source: '1', target: '5' },
]

// Calls Gemini and asks it to return exactly the shape we need: one
// central topic + a handful of related concepts. responseSchema forces
// the model to return valid JSON matching this shape, every time.
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
            text: `Read the following text. Identify the single central topic, and 4 to 6 key related concepts. Keep each label short (2-4 words).\n\nText:\n${text}`,
          }],
        }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              central: { type: 'STRING' },
              branches: { type: 'ARRAY', items: { type: 'STRING' } },
            },
            required: ['central', 'branches'],
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


// Turns { central, branches } into React Flow nodes/edges, placing
// branches evenly around the center using basic trig — our radial layout.
function buildGraph({ central, branches }) {
  const centerX = 400
  const centerY = 300
  const radius = 260

  const nodes = [
    { id: 'center', position: { x: centerX, y: centerY }, data: { label: central }, style: nodeStyleCenter },
    ...branches.map((label, i) => {
      const angle = (i / branches.length) * 2 * Math.PI
      return {
        id: `branch-${i}`,
        position: {
          x: centerX + radius * Math.cos(angle) - 60,
          y: centerY + radius * Math.sin(angle) - 20,
        },
        data: { label },
        style: nodeStyleLight,
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

function App() {
  const [view, setView] = useState('input')
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  const onConnect = (connection) => setEdges((eds) => addEdge(connection, eds))

  const handleMapIt = async () => {
    if (!text.trim()) return
    setLoading(true)
    try {
      const result = await extractMindMap(text)
      const { nodes: newNodes, edges: newEdges } = buildGraph(result)
      setNodes(newNodes)
      setEdges(newEdges)
      setView('map')
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
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              defaultEdgeOptions={{
                type: 'smoothstep',
                style: { stroke: '#d6d3d1', strokeWidth: 1.5 },
              }}
              fitView
            >
              <Background color="#e7e5e4" gap={28} />
            </ReactFlow>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default App