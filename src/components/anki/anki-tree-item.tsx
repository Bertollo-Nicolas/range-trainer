'use client'

import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ChevronRight, ChevronDown, MoreHorizontal, FolderOpen, Folder, GripVertical } from 'lucide-react'
import { AnkiTreeNode } from '@/types/anki'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface AnkiTreeItemProps {
  item: AnkiTreeNode
  level: number
  isSelected?: boolean
  onSelect?: ((item: AnkiTreeNode) => void) | undefined
  onToggleExpanded?: ((itemId: string) => void) | undefined
  onEdit?: ((item: AnkiTreeNode) => void) | undefined
  onDelete?: ((item: AnkiTreeNode) => void) | undefined
  onDuplicate?: ((item: AnkiTreeNode) => void) | undefined
  onCreateChild?: ((parentId: string, type: 'deck') => void) | undefined
}

export function AnkiTreeItem({
  item,
  level,
  isSelected = false,
  onSelect,
  onToggleExpanded,
  onEdit,
  onDelete,
  onDuplicate,
  onCreateChild,
}: AnkiTreeItemProps) {
  const [isHovered, setIsHovered] = useState(false)
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.id,
    data: {
      type: 'deck',
      item,
    },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const hasChildren = item.children && item.children.length > 0
  const paddingLeft = level * 16 + 8

  const handleToggleExpanded = () => {
    onToggleExpanded?.(item.id)
  }

  const handleSelect = () => {
    onSelect?.(item)
  }

  const handleCreateChild = () => {
    onCreateChild?.(item.id, 'deck')
  }

  const handleEdit = () => {
    onEdit?.(item)
  }

  const handleDelete = () => {
    onDelete?.(item)
  }

  const handleDuplicate = () => {
    onDuplicate?.(item)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group",
        isDragging && "opacity-50"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={cn(
          "flex items-center h-8 hover:bg-muted/50 rounded-sm cursor-pointer transition-colors",
          isSelected && "bg-muted"
        )}
        style={{ paddingLeft }}
        onClick={handleSelect}
      >
        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          className={cn(
            "flex items-center justify-center w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab",
            isDragging && "cursor-grabbing"
          )}
        >
          <GripVertical className="h-3 w-3 text-muted-foreground" />
        </div>

        {/* Expand/collapse button */}
        <Button
          variant="ghost"
          size="sm"
          className="h-4 w-4 p-0 mr-1"
          onClick={(e) => {
            e.stopPropagation()
            handleToggleExpanded()
          }}
        >
          {hasChildren ? (
            item.is_expanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )
          ) : (
            <div className="h-3 w-3" />
          )}
        </Button>

        {/* Icon */}
        <div className="flex items-center justify-center w-4 h-4 mr-2">
          {item.icon ? (
            <span className="text-sm">{item.icon}</span>
          ) : hasChildren ? (
            item.is_expanded ? (
              <FolderOpen className="h-3 w-3 text-blue-500" />
            ) : (
              <Folder className="h-3 w-3 text-blue-500" />
            )
          ) : (
            <div 
              className="h-2 w-2 rounded-full" 
              style={{ backgroundColor: item.color }}
            />
          )}
        </div>

        {/* Name */}
        <span className="flex-1 text-sm truncate font-medium">
          {item.name}
        </span>

        {/* Stats badges */}
        <div className="flex items-center gap-1 mr-2">
          {item.cardCount > 0 && (
            <Badge variant="secondary" className="text-xs h-5 px-1">
              {item.cardCount}
            </Badge>
          )}
          {item.dueCards > 0 && (
            <Badge variant="destructive" className="text-xs h-5 px-1">
              {item.dueCards}
            </Badge>
          )}
          {item.newCards > 0 && (
            <Badge variant="default" className="text-xs h-5 px-1 bg-green-600">
              {item.newCards}
            </Badge>
          )}
        </div>

        {/* Actions menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity",
                isHovered && "opacity-100"
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={handleCreateChild}>
              Nouveau deck
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleEdit}>
              Modifier
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDuplicate}>
              Dupliquer
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={handleDelete}
              className="text-destructive"
            >
              Supprimer
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Children */}
      {hasChildren && item.is_expanded && (
        <div className="ml-2">
          {item.children.map((child) => (
            <AnkiTreeItem
              key={child.id}
              item={child}
              level={level + 1}
              isSelected={isSelected}
              onSelect={onSelect}
              onToggleExpanded={onToggleExpanded}
              onEdit={onEdit}
              onDelete={onDelete}
              onDuplicate={onDuplicate}
              onCreateChild={onCreateChild}
            />
          ))}
        </div>
      )}
    </div>
  )
}