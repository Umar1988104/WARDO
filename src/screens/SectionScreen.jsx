import { useCallback, useMemo, useState } from 'react'
import Screen from '../components/Screen.jsx'
import ItemGrid from '../components/ItemGrid.jsx'
import FolderSheet from '../components/FolderSheet.jsx'
import MoveSheet from '../components/MoveSheet.jsx'
import { FolderIcon } from '../components/Icons.jsx'
import { useBackClose } from '../lib/backstack.js'

// One section (Winter, Summer...) with its folders. Open a folder to see only its clothes.
// "Select" lets you pick several pieces and move them into a folder in one go.
export default function SectionScreen({ section, folders, folderId, setFolderId, items, actions, onBack, onAdd, onOpenItem }) {
  const [selecting, setSelecting] = useState(false)
  const [picked, setPicked] = useState(() => new Set())
  const [sheet, setSheet] = useState(null) // 'new' | 'rename' | 'move' | 'new-move'

  const sectionFolders = useMemo(() => folders.filter((f) => f.section === section.id), [folders, section.id])
  const folder = sectionFolders.find((f) => f.id === folderId) || null

  const inSection = useMemo(() => items.filter((i) => i.section === section.id), [items, section.id])
  const folderIds = useMemo(() => new Set(sectionFolders.map((f) => f.id)), [sectionFolders])

  const counts = useMemo(() => {
    const map = new Map()
    for (const i of inSection) if (i.folderId != null) map.set(i.folderId, (map.get(i.folderId) || 0) + 1)
    return map
  }, [inSection])

  const shown = useMemo(
    () =>
      folder
        ? inSection.filter((i) => i.folderId === folder.id)
        : inSection.filter((i) => i.folderId == null || !folderIds.has(i.folderId)),
    [inSection, folder, folderIds]
  )

  const endSelect = useCallback(() => {
    setSelecting(false)
    setPicked(new Set())
  }, [])

  const toggle = useCallback((id) => {
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  // Back leaves select mode before it leaves the section
  useBackClose(endSelect, selecting)

  function goBack() {
    endSelect()
    if (folder) setFolderId(null)
    else onBack()
  }

  async function move(target) {
    const ids = [...picked]
    setSheet(null)
    endSelect()
    await actions.moveItems(ids, target)
  }

  async function moveToNew(name) {
    const id = await actions.createFolder(section.id, name)
    await move(id)
  }

  const title = folder ? folder.name : section.label
  const back = { label: folder ? section.label : 'Wardrobe', onClick: goBack }

  return (
    <Screen
      title={title}
      back={back}
      overlays={
        <>
          {selecting && (
            <div className="selbar glass">
              <button className="btn-primary" disabled={picked.size === 0} onClick={() => setSheet('move')}>
                Move to folder
              </button>
            </div>
          )}

          {sheet === 'new' && (
            <FolderSheet
              title="New folder"
              cta="Create folder"
              takenNames={sectionFolders.map((f) => f.name)}
              onClose={() => setSheet(null)}
              onSave={async (name) => {
                await actions.createFolder(section.id, name)
                setSheet(null)
              }}
            />
          )}

          {sheet === 'rename' && folder && (
            <FolderSheet
              title="Rename folder"
              initial={folder.name}
              takenNames={sectionFolders.map((f) => f.name)}
              onClose={() => setSheet(null)}
              onSave={async (name) => {
                await actions.renameFolder(folder.id, name)
                setSheet(null)
              }}
              onDelete={async () => {
                setSheet(null)
                setFolderId(null)
                await actions.deleteFolder(folder.id)
              }}
            />
          )}

          {sheet === 'move' && (
            <MoveSheet
              count={picked.size}
              folders={sectionFolders}
              currentFolderId={folder ? folder.id : null}
              onPick={move}
              onNew={() => setSheet('new-move')}
              onClose={() => setSheet(null)}
            />
          )}

          {sheet === 'new-move' && (
            <FolderSheet
              title="New folder"
              cta="Create and move"
              takenNames={sectionFolders.map((f) => f.name)}
              onClose={() => setSheet('move')}
              onSave={moveToNew}
            />
          )}
        </>
      }
    >
      {!selecting && (
        <div className="actions-row">
          {!folder && (
            <button className="pill" onClick={() => setSheet('new')}>
              + New folder
            </button>
          )}
          {folder && (
            <button className="pill" onClick={() => setSheet('rename')}>
              Rename or delete
            </button>
          )}
          {shown.length > 0 && (
            <button className="pill" onClick={() => setSelecting(true)}>
              Select
            </button>
          )}
        </div>
      )}

      {selecting && (
        <div className="actions-row actions-sel">
          <strong>{picked.size === 0 ? 'Tap pieces to select' : `${picked.size} selected`}</strong>
          <span className="actions-gap" />
          <button className="pill" onClick={() => setPicked(new Set(shown.map((i) => i.id)))}>
            Select all
          </button>
          <button className="pill pill-quiet" onClick={endSelect}>
            Cancel
          </button>
        </div>
      )}

      {!folder && sectionFolders.length > 0 && (
        <div className={'folder-grid tone-' + section.tone}>
          {sectionFolders.map((f) => (
            <button
              key={f.id}
              className="folder-tile glass"
              onClick={() => {
                endSelect()
                setFolderId(f.id)
              }}
            >
              <span className="chip">
                <FolderIcon />
              </span>
              <strong>{f.name}</strong>
              <span className="muted">
                {counts.get(f.id) || 0} {(counts.get(f.id) || 0) === 1 ? 'item' : 'items'}
              </span>
            </button>
          ))}
        </div>
      )}

      {!folder && sectionFolders.length > 0 && shown.length > 0 && <h3 className="section-title">Not in a folder</h3>}

      {shown.length === 0 ? (
        folder ? (
          <div className={'empty glass tone-' + section.tone}>
            <div className="chip">
              <FolderIcon />
            </div>
            <h2>This folder is empty</h2>
            <p className="muted">Open the section, tap Select, pick some pieces and move them here. Or add a new piece.</p>
            <button className="btn-primary" onClick={onAdd}>
              Add an item
            </button>
          </div>
        ) : inSection.length === 0 ? (
          <div className={'empty glass tone-' + section.tone}>
            <div className="chip">
              <section.Icon />
            </div>
            <h2>No {section.label.toLowerCase()} items yet</h2>
            <p className="muted">Photograph a piece and it will appear here as a clean cutout.</p>
            <button className="btn-primary" onClick={onAdd}>
              Add an item
            </button>
          </div>
        ) : null
      ) : (
        <ItemGrid key={folder ? folder.id : 'root'} items={shown} onOpen={selecting ? toggle : onOpenItem} selecting={selecting} picked={picked} />
      )}
    </Screen>
  )
}
