import { openDB } from 'idb'
import type { WorkbookDocument, WorkbookSnapshot } from '../store/workbook'

const databaseName = 'statlab-projects'
const autosaveKey = 'autosave'

async function database() {
  return openDB(databaseName, 1, {
    upgrade(db) {
      db.createObjectStore('workbooks')
    },
  })
}

export async function saveAutosave(workbook: WorkbookDocument): Promise<void> {
  const db = await database()
  await db.put('workbooks', workbook, autosaveKey)
}

export async function loadAutosave(): Promise<WorkbookDocument | WorkbookSnapshot | undefined> {
  const db = await database()
  return db.get('workbooks', autosaveKey) as Promise<
    WorkbookDocument | WorkbookSnapshot | undefined
  >
}
