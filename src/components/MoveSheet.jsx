import { FolderIcon } from './Icons.jsx'

// Pick where the selected pieces should go.
export default function MoveSheet({ count, folders, currentFolderId, onPick, onNew, onClose }) {
  return (
    <>
      <div className="scrim scrim-on scrim-over" onClick={onClose} />
      <section className="sheet sheet-tall sheet-on sheet-over sheet-pop glass" role="dialog" aria-modal="true" aria-label="Move to folder">
        <div className="sheet-handle" />
        <div className="sheet-head">
          <h2>
            Move {count} {count === 1 ? 'piece' : 'pieces'}
          </h2>
          <button className="ov-link" onClick={onClose}>
            Cancel
          </button>
        </div>

        <div className="sheet-scroll">
          <button className="move-row" onClick={() => onPick(null)} disabled={currentFolderId == null}>
            <span className="move-ico">
              <FolderIcon />
            </span>
            <span>No folder (keep in the section)</span>
          </button>
          {folders.map((f) => (
            <button key={f.id} className="move-row" onClick={() => onPick(f.id)} disabled={f.id === currentFolderId}>
              <span className="move-ico">
                <FolderIcon />
              </span>
              <span>{f.name}</span>
            </button>
          ))}
          <button className="move-row move-new" onClick={onNew}>
            <span className="move-ico">+</span>
            <span>New folder</span>
          </button>
        </div>
      </section>
    </>
  )
}
