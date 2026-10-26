// "Folder" chips for the Add and Edit screens. A piece sits in at most one folder.
export default function FolderField({ section, folders, value, onChange, onNew }) {
  if (!section) return null
  const list = folders.filter((f) => f.section === section)

  return (
    <div className="field">
      <span>Folder (optional)</span>
      <div className="picks">
        {list.map((f) => {
          const on = value === f.id
          return (
            <button
              type="button"
              key={f.id}
              className={'pick tone-blue' + (on ? ' pick-on' : '')}
              aria-pressed={on}
              onClick={() => onChange(on ? null : f.id)}
            >
              {f.name}
            </button>
          )
        })}
        <button type="button" className="pick pick-add" onClick={onNew}>
          + New folder
        </button>
      </div>
    </div>
  )
}
