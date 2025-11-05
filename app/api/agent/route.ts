import { NextRequest } from 'next/server'

interface AgentCall {
  id: string
  depth: number
  task: string
  response: string
  status: 'thinking' | 'complete' | 'error'
  children: AgentCall[]
  timestamp: number
}

let callCounter = 0

function generateId(): string {
  return `agent-${Date.now()}-${callCounter++}`
}

async function simulateAIThinking(task: string, depth: number): Promise<string> {
  // Simulate AI processing time
  await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 700))

  // Generate contextual response based on task keywords
  const taskLower = task.toLowerCase()

  if (taskLower.includes('plan') || taskLower.includes('trip')) {
    return `Analyzed travel requirements. Key considerations: budget, duration, season, interests. Ready to delegate specific aspects.`
  } else if (taskLower.includes('flight')) {
    return `Found optimal flight options considering price, duration, and convenience. Recommendations prepared.`
  } else if (taskLower.includes('hotel') || taskLower.includes('accommodation')) {
    return `Evaluated accommodations based on location, ratings, and amenities. Top choices identified.`
  } else if (taskLower.includes('activit') || taskLower.includes('itinerary')) {
    return `Curated activities matching interests and schedule. Daily itinerary optimized.`
  } else if (taskLower.includes('research')) {
    return `Completed research gathering. Data compiled and analyzed for decision making.`
  } else if (taskLower.includes('analyze') || taskLower.includes('evaluat')) {
    return `Analysis complete. Patterns identified and insights extracted from available data.`
  } else if (taskLower.includes('write') || taskLower.includes('create')) {
    return `Content generated following best practices. Structure and flow optimized.`
  } else if (taskLower.includes('calculate') || taskLower.includes('compute')) {
    return `Calculations completed. Results verified and formatted for presentation.`
  } else {
    return `Task processed successfully. Requirements analyzed and solution prepared.`
  }
}

function shouldDecompose(task: string, depth: number, maxDepth: number): boolean {
  if (depth >= maxDepth) return false

  const taskLower = task.toLowerCase()
  const complexityIndicators = [
    'plan', 'create', 'develop', 'design', 'build', 'analyze',
    'research', 'compare', 'evaluate', 'organize', 'trip'
  ]

  return complexityIndicators.some(indicator => taskLower.includes(indicator))
}

function decomposeTask(task: string): string[] {
  const taskLower = task.toLowerCase()

  if (taskLower.includes('trip') || taskLower.includes('travel')) {
    return [
      'Research and book flights',
      'Find and reserve accommodation',
      'Plan daily activities and itinerary',
      'Calculate total budget and costs'
    ]
  } else if (taskLower.includes('flight')) {
    return [
      'Compare airline prices and schedules',
      'Evaluate flight duration and layovers',
      'Check baggage policies and fees'
    ]
  } else if (taskLower.includes('hotel') || taskLower.includes('accommodation')) {
    return [
      'Search hotels by location and ratings',
      'Compare prices and amenities',
      'Check availability and cancellation policies'
    ]
  } else if (taskLower.includes('activit') || taskLower.includes('itinerary')) {
    return [
      'Research popular attractions and landmarks',
      'Find local restaurants and dining options',
      'Plan transportation between locations'
    ]
  } else if (taskLower.includes('plan') || taskLower.includes('organize')) {
    return [
      'Define objectives and requirements',
      'Research relevant information',
      'Evaluate options and alternatives',
      'Create timeline and action items'
    ]
  } else {
    return [
      'Gather necessary information',
      'Analyze requirements',
      'Generate solution'
    ]
  }
}

async function executeAgent(
  task: string,
  depth: number,
  maxDepth: number,
  streamUpdate: (tree: AgentCall) => void
): Promise<AgentCall> {
  const call: AgentCall = {
    id: generateId(),
    depth,
    task,
    response: '',
    status: 'thinking',
    children: [],
    timestamp: Date.now()
  }

  streamUpdate(call)

  try {
    // Simulate AI thinking
    const response = await simulateAIThinking(task, depth)
    call.response = response
    streamUpdate(call)

    // Decide if we should decompose
    if (shouldDecompose(task, depth, maxDepth)) {
      const subtasks = decomposeTask(task)

      // Execute subtasks recursively
      for (const subtask of subtasks) {
        const childCall = await executeAgent(
          subtask,
          depth + 1,
          maxDepth,
          (childTree) => {
            // Update child in parent's children array
            const existingIndex = call.children.findIndex(c => c.id === childTree.id)
            if (existingIndex >= 0) {
              call.children[existingIndex] = childTree
            } else {
              call.children.push(childTree)
            }
            streamUpdate(call)
          }
        )
        call.children.push(childCall)
      }

      // Aggregate results
      const aggregated = call.children
        .map(c => c.response)
        .join(' ')
      call.response = `${response}\n\nSubtasks completed: ${call.children.length} tasks processed successfully.`
    }

    call.status = 'complete'
    streamUpdate(call)
    return call

  } catch (error) {
    call.status = 'error'
    call.response = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    streamUpdate(call)
    return call
  }
}

export async function POST(request: NextRequest) {
  const { task, maxDepth = 3 } = await request.json()

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const rootCall = await executeAgent(
          task,
          0,
          maxDepth,
          (tree) => {
            const data = `data: ${JSON.stringify({ tree })}\n\n`
            controller.enqueue(encoder.encode(data))
          }
        )

        controller.close()
      } catch (error) {
        controller.error(error)
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
