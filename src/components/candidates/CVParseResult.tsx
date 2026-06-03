import { FileText, Calendar, Award, Languages } from 'lucide-react'

interface CVParseResultProps { cvDocument: any }

export function CVParseResult({ cvDocument }: CVParseResultProps) {
  if (!cvDocument?.parsed_content) return null
  const parsed = cvDocument.parsed_content

  return (
    <div className="space-y-4" data-testid="cv-parsed-badge">
      {parsed.summary && <div><h4 className="text-sm font-semibold mb-1">Summary</h4><p className="text-sm text-on-surface-variant">{parsed.summary}</p></div>}
      {parsed.skills?.length > 0 && (
        <div data-testid="skills-section">
          <h4 className="text-sm font-semibold mb-2">Skills</h4>
          <div className="flex flex-wrap gap-2">
            {parsed.skills.map((s: any, i: number) => (
              <span key={i} className="px-3 py-1 bg-primary-container/15 text-primary rounded-full text-xs font-medium">{s.name} {s.level && `(${s.level})`}</span>
            ))}
          </div>
        </div>
      )}
      {parsed.work_experience?.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2"><Calendar size={14} /> Experience</h4>
          {parsed.work_experience.map((exp: any, i: number) => (
            <div key={i} className="mb-3 pl-4 border-l-2 border-outline-variant">
              <p className="text-sm font-medium">{exp.title} at {exp.company}</p>
              <p className="text-xs text-on-surface-variant">{exp.start_date} - {exp.end_date || 'Present'}</p>
              {exp.description && <p className="text-xs text-on-surface-variant mt-1">{exp.description}</p>}
            </div>
          ))}
        </div>
      )}
      {parsed.education?.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2"><Award size={14} /> Education</h4>
          {parsed.education.map((edu: any, i: number) => (
            <div key={i} className="text-sm">
              <p className="font-medium">{edu.degree} in {edu.field}</p>
              <p className="text-xs text-on-surface-variant">{edu.institution} ({edu.start_date} - {edu.end_date})</p>
            </div>
          ))}
        </div>
      )}
      {parsed.languages?.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2"><Languages size={14} /> Languages</h4>
          <div className="flex gap-2">{parsed.languages.map((l: any, i: number) => <span key={i} className="px-2 py-0.5 bg-surface-container-low rounded text-xs">{l.name}: {l.level}</span>)}</div>
        </div>
      )}
    </div>
  )
}
