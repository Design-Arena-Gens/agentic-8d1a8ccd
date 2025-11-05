'use client'

import { useState } from 'react'

interface AgentCall {
  id: string
  depth: number
  task: string
  response: string
  status: 'thinking' | 'complete' | 'error'
  children: AgentCall[]
  timestamp: number
}

export default function Home() {
  const [task, setTask] = useState('')
  const [loading, setLoading] = useState(false)
  const [agentTree, setAgentTree] = useState<AgentCall | null>(null)
  const [maxDepth, setMaxDepth] = useState(3)

  const executeTask = async () => {
    if (!task.trim()) return

    setLoading(true)
    setAgentTree(null)

    try {
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task, maxDepth }),
      })

      if (!response.ok) {
        throw new Error('Failed to execute task')
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) throw new Error('No reader available')

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n').filter(line => line.trim())

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6))
            if (data.tree) {
              setAgentTree(data.tree)
            }
          }
        }
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Failed to execute task')
    } finally {
      setLoading(false)
    }
  }

  const renderAgentCall = (call: AgentCall, isLast: boolean = false) => {
    const statusColors = {
      thinking: 'bg-yellow-100 border-yellow-400 text-yellow-800',
      complete: 'bg-green-100 border-green-400 text-green-800',
      error: 'bg-red-100 border-red-400 text-red-800',
    }

    const statusIcons = {
      thinking: '🤔',
      complete: '✅',
      error: '❌',
    }

    return (
      <div key={call.id} className="ml-6 mt-4">
        <div className={`border-l-4 pl-4 py-3 rounded-r ${statusColors[call.status]}`}>
          <div className="flex items-start gap-2">
            <span className="text-2xl">{statusIcons[call.status]}</span>
            <div className="flex-1">
              <div className="font-semibold mb-1">
                Depth {call.depth}: {call.task}
              </div>
              <div className="text-sm opacity-90 whitespace-pre-wrap">
                {call.response || 'Processing...'}
              </div>
              <div className="text-xs mt-1 opacity-60">
                {new Date(call.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        </div>
        {call.children.length > 0 && (
          <div className="ml-2">
            {call.children.map((child, idx) =>
              renderAgentCall(child, idx === call.children.length - 1)
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <main className="min-h-screen p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Self-Calling AI Agent</h1>
        <p className="text-gray-600 dark:text-gray-400">
          An AI agent that can recursively call itself to break down and solve complex tasks
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Task Description
          </label>
          <textarea
            value={task}
            onChange={(e) => setTask(e.target.value)}
            placeholder="Enter a complex task (e.g., 'Plan a trip to Japan including flights, hotels, and activities')"
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600"
            rows={4}
            disabled={loading}
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Max Recursion Depth: {maxDepth}
          </label>
          <input
            type="range"
            min="1"
            max="5"
            value={maxDepth}
            onChange={(e) => setMaxDepth(Number(e.target.value))}
            className="w-full"
            disabled={loading}
          />
          <div className="text-xs text-gray-500 mt-1">
            How many levels deep the agent can call itself
          </div>
        </div>

        <button
          onClick={executeTask}
          disabled={loading || !task.trim()}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
        >
          {loading ? 'Agent Working...' : 'Execute Task'}
        </button>
      </div>

      {agentTree && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-4">Agent Execution Tree</h2>
          {renderAgentCall(agentTree)}
        </div>
      )}

      <div className="mt-8 bg-blue-50 dark:bg-blue-900 rounded-lg p-6">
        <h3 className="font-semibold mb-2">How It Works</h3>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li>The agent receives your task and analyzes it</li>
          <li>If the task is complex, it breaks it into subtasks</li>
          <li>Each subtask is handled by a new agent instance (recursive call)</li>
          <li>Results are aggregated back up the call tree</li>
          <li>Watch the execution tree grow in real-time!</li>
        </ul>
      </div>
    </main>
  )
}
