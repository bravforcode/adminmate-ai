import { memo, useMemo } from 'react'
import { ChevronDown, User } from 'lucide-react'
import type { OrgChartNode } from '../../services/hris/orgChartService'

interface OrgChartProps {
  nodes: OrgChartNode[]
  onNodeClick?: (employeeId: string) => void
}

interface TreeNode extends OrgChartNode {
  children: TreeNode[]
  displayName?: string
  jobTitle?: string
}

function buildTree(nodes: OrgChartNode[]): TreeNode[] {
  const nodeMap = new Map<string, TreeNode>()
  const roots: TreeNode[] = []

  for (const node of nodes) {
    const raw = node as unknown as Record<string, unknown>
    const employees = raw.employees as Record<string, unknown> | undefined
    const profiles = employees?.employee_profiles as Record<string, unknown> | undefined
    const displayName = (profiles?.display_name as string) || (employees?.job_title as string) || node.position_title
    const jobTitle = (employees?.job_title as string) || node.position_title

    const enriched: TreeNode = {
      ...node,
      children: [],
      displayName,
      jobTitle,
    }
    nodeMap.set(node.employee_id, enriched)
  }

  for (const node of nodes) {
    const treeNode = nodeMap.get(node.employee_id)!
    if (node.manager_employee_id && nodeMap.has(node.manager_employee_id)) {
      nodeMap.get(node.manager_employee_id)!.children.push(treeNode)
    } else {
      roots.push(treeNode)
    }
  }

  return roots
}

const OrgChartNodeComponent = memo(function OrgChartNodeComponent({
  node,
  depth = 0,
  onNodeClick,
}: {
  node: TreeNode
  depth?: number
  onNodeClick?: (employeeId: string) => void
}) {
  const hasChildren = node.children.length > 0
  const initials = (node.displayName || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="select-none">
      <div
        className={`flex items-center gap-2 p-2 rounded-lg hover:bg-surface-sunken dark:hover:bg-surface-sunken cursor-pointer transition-colors ${depth > 0 ? 'ml-6' : ''}`}
        onClick={() => onNodeClick?.(node.employee_id)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onNodeClick?.(node.employee_id)}
      >
        {hasChildren ? (
          <ChevronDown size={14} className="text-ink-variant flex-shrink-0" />
        ) : (
          <span className="w-3.5 flex-shrink-0" />
        )}
        <div className="w-8 h-8 rounded-full bg-primary-container dark:bg-primary-container text-white-container dark:text-primary-muted flex items-center justify-center text-xs font-bold flex-shrink-0">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-ink truncate">{node.displayName}</p>
          <p className="text-xs text-ink-variant text-ink-variant truncate">{node.jobTitle}</p>
        </div>
        {node.department_id && (
          <span className="text-xs text-ink-variant/60 px-1.5 py-0.5 rounded bg-surface-sunken-lowest bg-surface-sunken-lowest flex-shrink-0">
            Dept
          </span>
        )}
      </div>
      {hasChildren && (
        <div className="border-l border-border/30 border-border/30 ml-5">
          {node.children.map(child => (
            <OrgChartNodeComponent key={child.employee_id} node={child} depth={depth + 1} onNodeClick={onNodeClick} />
          ))}
        </div>
      )}
    </div>
  )
})

export const OrgChart = memo(function OrgChart({ nodes, onNodeClick }: OrgChartProps) {
  const tree = useMemo(() => buildTree(nodes), [nodes])

  if (tree.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-ink-variant text-ink-variant">
        <User size={36} className="mb-2 opacity-40" />
        <p className="text-sm">No org chart data available</p>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {tree.map(root => (
        <OrgChartNodeComponent key={root.employee_id} node={root} onNodeClick={onNodeClick} />
      ))}
    </div>
  )
})

export default OrgChart
