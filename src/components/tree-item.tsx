'use client'

import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ChevronRight, ChevronDown, Folder, FileText, Edit, Trash2, Copy, FolderPlus } from 'lucide-react'
import { TreeItem as TreeItemType, TreeNode } from '@/types/range'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface TreeItemProps {
  node: TreeNode
  onToggle: (id: string) => void
  onCreate: (parentId: string, type: 'folder' | 'range') => void
  onSelect: (item: TreeItemType) => void
  onEdit: (item: TreeItemType) => void
  onDelete: (item: TreeItemType) => void
  onDuplicate: (item: TreeItemType) => void
  selectedId?: string | undefined
}

export function TreeItem({ node, onToggle, onCreate, onSelect, onEdit, onDelete, onDuplicate, selectedId }: TreeItemProps) {
  const [isHovered, setIsHovered] = useState(false)
  const { item, children, level } = node
  const isFolder = item.type === 'folder'
  const isExpanded = isFolder && (item as any).isExpanded
  const hasChildren = children.length > 0
  const isSelected = selectedId === item.id

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative",
        isDragging && "opacity-50"
      )}
      {...attributes}
    >
      <div
        className={cn(
          "flex items-center gap-1 py-1 px-2 rounded-sm cursor-pointer transition-colors",
          "hover:bg-accent/50",
          isSelected && "bg-accent"
        )}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => {
          if (isFolder) {
            onToggle(item.id)
          } else {
            onSelect(item)
          }
        }}
        {...listeners}
      >
        {/* Expand/Collapse Icon */}
        {isFolder && (
          <Button
            variant="ghost"
            size="sm"
            className="h-4 w-4 p-0 hover:bg-transparent"
            onClick={(e) => {
              e.stopPropagation()
              onToggle(item.id)
            }}
          >
            {hasChildren && isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : hasChildren ? (
              <ChevronRight className="h-3 w-3" />
            ) : (
              <div className="h-3 w-3" />
            )}
          </Button>
        )}
        {!isFolder && <div className="h-4 w-4" />}

        {/* Icon */}
        {isFolder ? (
          <Folder className="h-4 w-4 text-muted-foreground" />
        ) : (
          <FileText className="h-4 w-4 text-muted-foreground" />
        )}

        {/* Name */}
        <span className="flex-1 text-sm truncate">{item.name}</span>

        {/* Actions */}
        {isHovered && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* Actions spécifiques aux dossiers */}
            {isFolder && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0"
                  title="Ajouter un dossier"
                  onClick={(e) => {
                    e.stopPropagation()
                    onCreate(item.id, 'folder')
                  }}
                >
                  <FolderPlus className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0"
                  title="Ajouter un range"
                  onClick={(e) => {
                    e.stopPropagation()
                    onCreate(item.id, 'range')
                  }}
                >
                  <FileText className="h-3 w-3" />
                </Button>
              </>
            )}
            
            {/* Action dupliquer pour les ranges */}
            {!isFolder && (
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0"
                title="Dupliquer"
                onClick={(e) => {
                  e.stopPropagation()
                  onDuplicate(item)
                }}
              >
                <Copy className="h-3 w-3" />
              </Button>
            )}
            
            {/* Actions communes (modifier/supprimer) */}
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0"
              title="Modifier"
              onClick={(e) => {
                e.stopPropagation()
                onEdit(item)
              }}
            >
              <Edit className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0 hover:text-destructive"
              title="Supprimer"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(item)
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      {/* Children */}
      {isFolder && isExpanded && hasChildren && (
        <div>
          {children.map((child) => (
            <TreeItem
              key={child.item.id}
              node={child}
              onToggle={onToggle}
              onCreate={onCreate}
              onSelect={onSelect}
              onEdit={onEdit}
              onDelete={onDelete}
              onDuplicate={onDuplicate}
              selectedId={selectedId}
            />
          ))}
        </div>
      )}
    </div>
  )
}