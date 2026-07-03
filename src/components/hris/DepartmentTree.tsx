import { memo, useMemo } from 'react'
import { ChevronDown, Building2 } from 'lucide-react'
import type { Department } from '../../services/orgStructureService'
import type { Team } from '../../services/orgStructureService'

interface DepartmentTreeProps {
  departments: Department[]
  teams?: Team[]
  selectedDepartmentId?: string
  selectedTeamId?: string
  onDepartmentSelect?: (id: string) => void
  onTeamSelect?: (id: string) => void
}

interface DeptNode extends Department {
  children: DeptNode[]
  teams: Team[]
}

function buildDeptTree(departments: Department[], teams: Team[]): DeptNode[] {
  const nodeMap = new Map<string, DeptNode>()
  const roots: DeptNode[] = []

  for (const dept of departments) {
    nodeMap.set(dept.id, { ...dept, children: [], teams: [] })
  }

  for (const team of teams) {
    if (team.department_id && nodeMap.has(team.department_id)) {
      nodeMap.get(team.department_id)!.teams.push(team)
    }
  }

  for (const dept of departments) {
    const node = nodeMap.get(dept.id)!
    if (dept.parent_department_id && nodeMap.has(dept.parent_department_id)) {
      nodeMap.get(dept.parent_department_id)!.children.push(node)
    } else {
      roots.push(node)
    }
  }

  return roots
}

const DeptNodeComponent = memo(function DeptNodeComponent({
  node,
  depth = 0,
  selectedDepartmentId,
  selectedTeamId,
  onDepartmentSelect,
  onTeamSelect,
}: {
  node: DeptNode
  depth?: number
  selectedDepartmentId?: string
  selectedTeamId?: string
  onDepartmentSelect?: (id: string) => void
  onTeamSelect?: (id: string) => void
}) {
  const hasContent = node.children.length > 0 || node.teams.length > 0
  const isSelected = selectedDepartmentId === node.id

  return (
    <div className="select-none">
      <div
        className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
          isSelected
            ? 'bg-primary/10 text-primary dark:bg-primary/20'
            : 'hover:bg-surface-container-low dark:hover:bg-surface-container-low'
        } ${depth > 0 ? 'ml-4' : ''}`}
        onClick={() => onDepartmentSelect?.(node.id)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onDepartmentSelect?.(node.id)}
      >
        {hasContent ? (
          <ChevronDown size={14} className="text-on-surface-variant flex-shrink-0" />
        ) : (
          <span className="w-3.5 flex-shrink-0" />
        )}
        <Building2 size={14} className="text-on-surface-variant flex-shrink-0" />
        <span className="text-sm font-medium text-on-surface dark:text-on-surface truncate">{node.name}</span>
        {node.status === 'inactive' && (
          <span className="text-xs text-on-surface-variant/60 px-1.5 py-0.5 rounded bg-surface-container-lowest">inactive</span>
        )}
      </div>
      {node.teams.length > 0 && (
        <div className="ml-8 space-y-0.5">
          {node.teams.map(team => (
            <div
              key={team.id}
              className={`flex items-center gap-2 p-1.5 rounded-lg cursor-pointer transition-colors ${
                selectedTeamId === team.id
                  ? 'bg-primary/10 text-primary dark:bg-primary/20'
                  : 'hover:bg-surface-container-low dark:hover:bg-surface-container-low'
              }`}
              onClick={() => onTeamSelect?.(team.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onTeamSelect?.(team.id)}
            >
              <span className="w-3.5" />
              <span className="text-xs text-on-surface-variant dark:text-on-surface-variant">{team.name}</span>
            </div>
          ))}
        </div>
      )}
      {node.children.length > 0 && (
        <div className="border-l border-outline-variant/20 dark:border-outline/20 ml-3">
          {node.children.map(child => (
            <DeptNodeComponent
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedDepartmentId={selectedDepartmentId}
              selectedTeamId={selectedTeamId}
              onDepartmentSelect={onDepartmentSelect}
              onTeamSelect={onTeamSelect}
            />
          ))}
        </div>
      )}
    </div>
  )
})

export const DepartmentTree = memo(function DepartmentTree({
  departments,
  teams = [],
  selectedDepartmentId,
  selectedTeamId,
  onDepartmentSelect,
  onTeamSelect,
}: DepartmentTreeProps) {
  const tree = useMemo(() => buildDeptTree(departments, teams), [departments, teams])

  if (tree.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-on-surface-variant dark:text-on-surface-variant">
        <Building2 size={28} className="mb-2 opacity-40" />
        <p className="text-sm">No departments configured</p>
      </div>
    )
  }

  return (
    <div className="space-y-0.5">
      {tree.map(root => (
        <DeptNodeComponent
          key={root.id}
          node={root}
          selectedDepartmentId={selectedDepartmentId}
          selectedTeamId={selectedTeamId}
          onDepartmentSelect={onDepartmentSelect}
          onTeamSelect={onTeamSelect}
        />
      ))}
    </div>
  )
})

export default DepartmentTree
