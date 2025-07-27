export interface Range {
  id: string
  name: string
  type: 'range'
  parentId: string | null
  createdAt: Date
  updatedAt: Date
  data?: RangeData
}

export interface Folder {
  id: string
  name: string
  type: 'folder'
  parentId: string | null
  createdAt: Date
  updatedAt: Date
  isExpanded?: boolean
}

export interface RangeData {
  hands: string[]
  notes?: string
  editorData?: {
    title: string
    handActions: Array<{
      handId: string
      actionId?: string
      mixedColorId?: string
      percentage?: number
    }>
    actions: Array<{
      id: string
      name: string
      color: string
    }>
    mixedColors: Array<{
      id: string
      actions: Array<{
        actionId: string
        percentage: number
      }>
    }>
  }
}

export type TreeItem = Range | Folder

export interface TreeNode {
  item: TreeItem
  children: TreeNode[]
  level: number
}