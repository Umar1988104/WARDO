// Bottom sheet. The real camera + cutout flow arrives in v0.2.
export default function AddSheet({ open, onClose }) {
  return (
    <>
      <div className={'scrim' + (open ? ' scrim-on' : '')} onClick={onClose} />
      <section
        className={'sheet glass' + (open ? ' sheet-on' : '')}
        role="dialog"
        aria-modal="true"
        aria-label="Add item"
        aria-hidden={!open}
      >
        <div className="sheet-handle" />
        <h2>Add an item</h2>
        <p className="muted">
          Taking a photo and cutting out your clothes comes in the next version. For now, this is
          where it will live.
        </p>
        <button className="btn-primary" onClick={onClose}>
          Got it
        </button>
      </section>
    </>
  )
}
