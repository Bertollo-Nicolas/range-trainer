'use client'

import { useState, useEffect } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import {
  CSS,
} from '@dnd-kit/utilities';
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { 
  Plus, Edit, Trash2, ArrowLeft, Clock, Target, AlertTriangle,
  CheckCircle, GripVertical, ChevronDown, ChevronRight, MoreHorizontal,
  Copy, Bookmark, FolderPlus, Archive, Palette
} from 'lucide-react'
import { PokerMindService } from '@/lib/services/pokermind-service'
import { Task, TaskCategory, TaskStatus, TaskPriority, TaskTemplate } from '@/types/pokermind'
import Link from 'next/link'

// Composant TaskCard pour le drag & drop avec dnd-kit
function SortableTaskCard({ 
  task, 
  onEdit, 
  onArchive,
  onDelete,
  onAddSubtask,
  onDuplicate,
  onSaveAsTemplate,
  onToggleSubtask,
  expandedTasks,
  onToggleExpand,
  showArchived
}: { 
  task: Task; 
  onEdit: (task: Task) => void;
  onArchive?: (taskId: string) => void;
  onDelete?: (taskId: string) => void;
  onAddSubtask?: (parentTask: Task) => void;
  onDuplicate?: (taskId: string) => void;
  onSaveAsTemplate?: (task: Task) => void;
  onToggleSubtask?: (parentTaskId: string, subtaskId: string) => void;
  expandedTasks?: Set<string>;
  onToggleExpand?: (taskId: string) => void;
  showArchived?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({id: task.id});

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isExpanded = expandedTasks?.has(task.id) || false
  const hasSubtasks = task.subtasks && task.subtasks.length > 0

  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case 'high': return 'text-red-400'
      case 'medium': return 'text-yellow-400'
      case 'low': return 'text-green-400'
      default: return 'text-muted-foreground'
    }
  }

  const getPriorityIcon = (priority: TaskPriority) => {
    switch (priority) {
      case 'high': return '🔴'
      case 'medium': return '🟡'
      case 'low': return '🟢'
      default: return '⚪'
    }
  }

  const getDeadlineStatus = (deadline?: Date) => {
    if (!deadline) return null
    const now = new Date()
    const deadlineDate = new Date(deadline)
    const diffDays = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) return { status: 'overdue', text: 'En retard', color: 'text-red-500' }
    if (diffDays === 0) return { status: 'today', text: 'Aujourd\'hui', color: 'text-orange-500' }
    if (diffDays === 1) return { status: 'tomorrow', text: 'Demain', color: 'text-yellow-500' }
    if (diffDays <= 3) return { status: 'soon', text: `Dans ${diffDays}j`, color: 'text-blue-500' }
    return { status: 'ok', text: `Dans ${diffDays}j`, color: 'text-muted-foreground' }
  }

  const getCategoryDisplay = (category?: TaskCategory) => {
    if (!category) {
      return {
        name: 'Non catégorisé',
        color: '#6b7280', // gray-500
        bgColor: '#6b728020' // gray-500 with 20% opacity
      }
    }
    return {
      name: category.name,
      color: category.color,
      bgColor: `${category.color}4D` // 30% opacity (4D = 76/255 ≈ 30%)
    }
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit'
    })
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="mb-3 cursor-grab active:cursor-grabbing"
    >
          <Card className="group hover:shadow-md transition-shadow border-border/50 bg-card hover:bg-card/80 select-none">
            {/* Header avec Category et Options Menu */}
            <div className="p-2 flex items-center justify-between">
              <div 
                className="px-2 py-1 rounded text-xs font-medium"
                style={{
                  color: getCategoryDisplay(task.category).color,
                  backgroundColor: getCategoryDisplay(task.category).bgColor
                }}
              >
                {getCategoryDisplay(task.category).name}
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onAddSubtask && (
                    <DropdownMenuItem onClick={() => onAddSubtask(task)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Ajouter sous-tâche
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => onEdit(task)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Modifier
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDuplicate && onDuplicate(task.id)}>
                    <Copy className="h-4 w-4 mr-2" />
                    Dupliquer
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onSaveAsTemplate && onSaveAsTemplate(task)}>
                    <Bookmark className="h-4 w-4 mr-2" />
                    Sauver comme template
                  </DropdownMenuItem>
                  {onArchive && (
                    <DropdownMenuItem 
                      onClick={() => {
                        if (confirm(showArchived ? 'Restaurer cette tâche ?' : 'Archiver cette tâche ?')) {
                          onArchive(task.id)
                        }
                      }}
                      className={showArchived ? "text-blue-600" : "text-orange-600"}
                    >
                      <Archive className="h-4 w-4 mr-2" />
                      {showArchived ? 'Restaurer' : 'Archiver'}
                    </DropdownMenuItem>
                  )}
                  {onDelete && (
                    <DropdownMenuItem 
                      onClick={() => onDelete(task.id)}
                      className="text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Supprimer
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Content */}
            <div className="px-2 pb-2">
              {/* Titre */}
              <div className="flex items-start gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground/60 hover:text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <h4 className={`font-medium text-sm ${task.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>
                    {task.title}
                    {hasSubtasks && onToggleExpand && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={(e) => {
                          e.stopPropagation()
                          onToggleExpand(task.id)
                        }}
                        className="h-4 w-4 p-0 ml-2 inline-flex"
                      >
                        {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                      </Button>
                    )}
                  </h4>
                  
                  {/* Description */}
                  {task.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {task.description}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Subtasks Separator et Liste */}
            {hasSubtasks && isExpanded && (
              <>
                {/* Separator */}
                <div className="px-2 py-1 border-t border-border/30">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Sous-tâches ({task.subtasks!.filter(st => st.status === 'done').length}/{task.subtasks!.length})</span>
                  </div>
                </div>
                
                {/* Subtasks List */}
                <div className="px-2 pb-2 space-y-1">
                  {task.subtasks!.map((subtask) => (
                    <div key={subtask.id} className="flex items-center gap-2 text-sm pl-4">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={(e) => {
                          e.stopPropagation()
                          onToggleSubtask?.(task.id, subtask.id)
                        }}
                        className="h-4 w-4 p-0"
                      >
                        {subtask.status === 'done' ? 
                          <CheckCircle className="h-3 w-3 text-green-500" /> : 
                          <div className="h-3 w-3 border border-muted-foreground rounded" />
                        }
                      </Button>
                      <span className={`flex-1 ${subtask.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>
                        {subtask.title}
                      </span>
                      <span className={`text-xs ${getPriorityColor(subtask.priority)}`}>
                        {getPriorityIcon(subtask.priority)}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
            
            {/* Bottom Separator avec Priority et Date */}
            <div className="px-2 py-1 border-t border-border/30">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className={`${getPriorityColor(task.priority)}`}>
                    {getPriorityIcon(task.priority)}
                  </span>
                  {task.subtasks && task.subtasks.length > 0 && !isExpanded && (
                    <span className="text-blue-400">
                      📋 {task.subtasks.filter(st => st.status === 'done').length}/{task.subtasks.length}
                    </span>
                  )}
                  {task.completedAt && (
                    <span className="text-green-400">
                      ✓ {formatDate(task.completedAt)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  {task.deadline && (
                    <span className={getDeadlineStatus(task.deadline)?.color}>
                      {getDeadlineStatus(task.deadline)?.text}
                    </span>
                  )}
                  <span>
                    <Clock className="h-3 w-3 inline mr-1" />
                    {formatDate(task.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          </Card>
    </div>
  )
}

// Composant colonne Kanban
function KanbanColumn({ 
  title, 
  status, 
  tasks, 
  icon: Icon,
  onEdit,
  onArchive,
  onDelete,
  onAddSubtask,
  onDuplicate,
  onSaveAsTemplate,
  onToggleSubtask,
  expandedTasks,
  onToggleExpand,
  showArchived
}: { 
  title: string
  status: TaskStatus
  tasks: Task[]
  icon: React.ComponentType<any>
  onEdit: (task: Task) => void
  onArchive?: (taskId: string) => void
  onDelete?: (taskId: string) => void
  onAddSubtask?: (parentTask: Task) => void
  onDuplicate?: (taskId: string) => void
  onSaveAsTemplate?: (task: Task) => void
  onToggleSubtask?: (parentTaskId: string, subtaskId: string) => void
  expandedTasks?: Set<string>
  onToggleExpand?: (taskId: string) => void
  showArchived?: boolean
}) {
  return (
    <div className="flex-1 min-w-80">
      <div className="p-4 rounded-t-lg bg-card border-b border-border/20">
        <div className="flex items-center gap-2">
          <Icon className={`h-5 w-5 ${status === 'todo' ? 'text-orange-400' : status === 'inprogress' ? 'text-blue-400' : 'text-green-400'}`} />
          <h3 className="font-semibold text-foreground">{title}</h3>
          <Badge variant="secondary" className="ml-auto bg-muted text-muted-foreground">
            {tasks.length}
          </Badge>
        </div>
      </div>
      
      <SortableContext items={tasks.map(task => task.id)} strategy={verticalListSortingStrategy}>
        <div className="min-h-96 p-4 bg-muted/30 rounded-b-lg">
          {tasks.map((task) => (
            <SortableTaskCard 
              key={task.id} 
              task={task} 
              onEdit={onEdit}
              {...(onArchive && { onArchive })}
              {...(onDelete && { onDelete })}
              {...(onAddSubtask && { onAddSubtask })}
              {...(onDuplicate && { onDuplicate })}
              {...(onSaveAsTemplate && { onSaveAsTemplate })}
              {...(onToggleSubtask && { onToggleSubtask })}
              {...(expandedTasks && { expandedTasks })}
              {...(onToggleExpand && { onToggleExpand })}
              {...(showArchived !== undefined && { showArchived })}
            />
          ))}
          {tasks.length === 0 && (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              <div className="text-center">
                <Icon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Glissez vos tâches ici</p>
              </div>
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  )
}

// Dialog pour créer/éditer une tâche
function TaskDialog({ 
  task, 
  parentTask,
  isOpen, 
  onClose, 
  onSave 
}: { 
  task?: Task
  parentTask?: Task
  isOpen: boolean
  onClose: () => void
  onSave: () => void
}) {
  const [title, setTitle] = useState(task?.title || '')
  const [description, setDescription] = useState(task?.description || '')
  const [category, setCategory] = useState<TaskCategory | null>(task?.category || null)
  const [priority, setPriority] = useState<TaskPriority>(task?.priority || 'medium')
  const [deadline, setDeadline] = useState(task?.deadline ? new Date(task.deadline).toISOString().split('T')[0] : '')
  const [categories, setCategories] = useState<TaskCategory[]>([])
  const [isSaving, setIsSaving] = useState(false)

  const loadCategories = async () => {
    const allCategories = await PokerMindService.getTaskCategories()
    setCategories(allCategories)
    if (!category && allCategories.length > 0) {
      setCategory(allCategories[0])
    }
  }

  useEffect(() => {
    loadCategories()
  }, [])

  useEffect(() => {
    if (task) {
      setTitle(task.title)
      setDescription(task.description || '')
      setCategory(task.category)
      setPriority(task.priority)
      setDeadline(task.deadline ? new Date(task.deadline).toISOString().split('T')[0] : '')
    } else {
      setTitle('')
      setDescription('')
      setPriority('medium')
      setDeadline('')
      if (categories.length > 0) {
        setCategory(categories[0])
      }
    }
  }, [task, categories])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !category) return

    setIsSaving(true)
    try {
      if (task) {
        const updateData: Partial<Task> = {
          title: title.trim(),
          category,
          priority
        }
        if (description.trim()) {
          updateData.description = description.trim()
        }
        if (deadline) {
          updateData.deadline = new Date(deadline)
        }
        await PokerMindService.updateTask(task.id, updateData)
      } else if (parentTask) {
        // Create subtask
        const newSubtask: Task = {
          id: `${Date.now()}_${Math.random()}`,
          title: title.trim(),
          category,
          priority,
          status: 'todo',
          createdAt: new Date(),
          parentId: parentTask.id
        }
        if (description.trim()) {
          newSubtask.description = description.trim()
        }
        if (deadline) {
          newSubtask.deadline = new Date(deadline)
        }
        
        // Add to parent's subtasks
        const updatedSubtasks = [...(parentTask.subtasks || []), newSubtask]
        await PokerMindService.updateTask(parentTask.id, {
          subtasks: updatedSubtasks
        })
      } else {
        const newTaskData: Omit<Task, 'id'> = {
          title: title.trim(),
          category,
          priority,
          status: 'todo',
          createdAt: new Date()
        }
        if (description.trim()) {
          newTaskData.description = description.trim()
        }
        if (deadline) {
          newTaskData.deadline = new Date(deadline)
        }
        await PokerMindService.createTask(newTaskData)
      }
      onSave()
      onClose()
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {task ? 'Modifier la tâche' : parentTask ? `Nouvelle sous-tâche de "${parentTask.title}"` : 'Nouvelle tâche'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Titre</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titre de la tâche..."
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description détaillée..."
              rows={3}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Catégorie</label>
            <Select value={category?.id || ''} onValueChange={(value) => {
              const selectedCategory = categories.find(c => c.id === value)
              if (selectedCategory) setCategory(selectedCategory)
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une catégorie" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded"
                        style={{ backgroundColor: cat.color }}
                      />
                      {cat.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Priorité</label>
            <Select value={priority} onValueChange={(value: TaskPriority) => setPriority(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high">🔴 Haute</SelectItem>
                <SelectItem value="medium">🟡 Moyenne</SelectItem>
                <SelectItem value="low">🟢 Basse</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Date limite (optionnel)</label>
            <Input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>
          
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={!title.trim() || !category || isSaving}>
              {isSaving ? 'Sauvegarde...' : task ? 'Modifier' : 'Créer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// Template Manager Component
function TemplateManager({ 
  isOpen, 
  onClose, 
  onCreateFromTemplate 
}: { 
  isOpen: boolean
  onClose: () => void
  onCreateFromTemplate: (templateId: string) => void
}) {
  const [templates, setTemplates] = useState<TaskTemplate[]>([])
  const [loading, setLoading] = useState(true)

  const loadTemplates = async () => {
    try {
      const allTemplates = await PokerMindService.getTaskTemplates()
      setTemplates(allTemplates)
    } catch (error) {
      console.error('Error loading templates:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadTemplates()
    }
  }, [isOpen])

  const handleDeleteTemplate = async (templateId: string) => {
    if (confirm('Supprimer ce template ?')) {
      try {
        await PokerMindService.deleteTaskTemplate(templateId)
        await loadTemplates()
      } catch (error) {
        console.error('Error deleting template:', error)
      }
    }
  }

  const getCategoryDisplay = (category?: TaskCategory) => {
    if (!category) {
      return {
        name: 'Non catégorisé',
        color: '#6b7280',
        bgColor: '#6b728020'
      }
    }
    return {
      name: category.name,
      color: category.color,
      bgColor: `${category.color}4D`
    }
  }

  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case 'high': return 'text-red-400'
      case 'medium': return 'text-yellow-400'
      case 'low': return 'text-green-400'
      default: return 'text-muted-foreground'
    }
  }

  const getPriorityIcon = (priority: TaskPriority) => {
    switch (priority) {
      case 'high': return '🔴'
      case 'medium': return '🟡'
      case 'low': return '🟢'
      default: return '⚪'
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Templates de tâches</DialogTitle>
        </DialogHeader>
        
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Target className="h-8 w-8 animate-pulse text-primary" />
          </div>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {templates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bookmark className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Aucun template sauvegardé</p>
                <p className="text-sm">Utilisez "Sauver comme template" sur une tâche</p>
              </div>
            ) : (
              templates.map(template => (
                <div key={template.id} className="border border-border rounded-lg p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-medium text-sm">{template.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{template.task.title}</p>
                      {template.task.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {template.task.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        size="sm"
                        onClick={() => onCreateFromTemplate(template.id)}
                        className="h-7"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Créer
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteTemplate(template.id)}
                        className="h-7 w-7 p-0 text-red-400 hover:text-red-500"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div 
                        className="px-2 py-0.5 rounded text-xs"
                        style={{
                          color: getCategoryDisplay(template.task.category).color,
                          backgroundColor: getCategoryDisplay(template.task.category).bgColor
                        }}
                      >
                        {getCategoryDisplay(template.task.category).name}
                      </div>
                      <span className={getPriorityColor(template.task.priority)}>
                        {getPriorityIcon(template.task.priority)}
                      </span>
                    </div>
                    <span className="text-muted-foreground">
                      {new Date(template.createdAt).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// Category Manager Component
function CategoryManager({ 
  isOpen, 
  onClose 
}: { 
  isOpen: boolean
  onClose: () => void
}) {
  const [categories, setCategories] = useState<TaskCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<TaskCategory | undefined>()
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryColor, setNewCategoryColor] = useState('#3b82f6')

  const loadCategories = async () => {
    try {
      const allCategories = await PokerMindService.getTaskCategories()
      setCategories(allCategories)
    } catch (error) {
      console.error('Error loading categories:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadCategories()
    }
  }, [isOpen])

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return
    
    try {
      if (editingCategory) {
        await PokerMindService.updateTaskCategory(editingCategory.id, {
          name: newCategoryName.trim(),
          color: newCategoryColor
        })
      } else {
        await PokerMindService.createTaskCategory({
          name: newCategoryName.trim(),
          color: newCategoryColor,
          isDefault: false
        })
      }
      
      setIsCreateDialogOpen(false)
      setEditingCategory(undefined)
      setNewCategoryName('')
      setNewCategoryColor('#3b82f6')
      await loadCategories()
    } catch (error) {
      console.error('Error saving category:', error)
    }
  }

  const handleEditCategory = (category: TaskCategory) => {
    setEditingCategory(category)
    setNewCategoryName(category.name)
    setNewCategoryColor(category.color)
    setIsCreateDialogOpen(true)
  }

  const handleDeleteCategory = async (categoryId: string) => {
    if (confirm('Supprimer cette catégorie ? Les tâches utilisant cette catégorie deviendront "Non catégorisé".')) {
      try {
        await PokerMindService.deleteTaskCategory(categoryId)
        await loadCategories()
      } catch (error) {
        console.error('Error deleting category:', error)
      }
    }
  }

  const predefinedColors = [
    '#3b82f6', // blue
    '#10b981', // green  
    '#8b5cf6', // purple
    '#f59e0b', // amber
    '#ef4444', // red
    '#06b6d4', // cyan
    '#84cc16', // lime
    '#f97316', // orange
    '#ec4899', // pink
    '#6b7280'  // gray
  ]

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Gestion des catégories</DialogTitle>
          </DialogHeader>
          
          <div className="flex justify-end mb-4">
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle catégorie
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Target className="h-8 w-8 animate-pulse text-primary" />
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {categories.map(category => (
                <div key={category.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                      style={{ backgroundColor: category.color }}
                    />
                    <div>
                      <span className="font-medium">{category.name}</span>
                      {category.isDefault && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          Par défaut
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEditCategory(category)}
                      className="h-8 px-2"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    {!category.isDefault && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteCategory(category.id)}
                        className="h-8 px-2 text-red-400 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create/Edit Category Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Nom</label>
              <Input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Nom de la catégorie..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Couleur</label>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-8 h-8 rounded-full border-2 border-border"
                    style={{ backgroundColor: newCategoryColor }}
                  />
                  <Input
                    type="color"
                    value={newCategoryColor}
                    onChange={(e) => setNewCategoryColor(e.target.value)}
                    className="w-20 h-8 p-1 border rounded"
                  />
                  <span className="text-sm text-muted-foreground">{newCategoryColor}</span>
                </div>
                
                <div className="grid grid-cols-5 gap-2">
                  {predefinedColors.map(color => (
                    <button
                      key={color}
                      type="button"
                      className={`w-8 h-8 rounded-full border-2 hover:scale-110 transition-transform ${
                        newCategoryColor === color ? 'border-primary ring-2 ring-primary/50' : 'border-border'
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setNewCategoryColor(color)}
                    />
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsCreateDialogOpen(false)
                  setEditingCategory(undefined)
                  setNewCategoryName('')
                  setNewCategoryColor('#3b82f6')
                }}
              >
                Annuler
              </Button>
              <Button 
                onClick={handleCreateCategory} 
                disabled={!newCategoryName.trim()}
              >
                {editingCategory ? 'Modifier' : 'Créer'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default function TaskManager() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | undefined>()
  const [parentTaskForSubtask, setParentTaskForSubtask] = useState<Task | undefined>()
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set())
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [taskToSaveAsTemplate, setTaskToSaveAsTemplate] = useState<Task | undefined>()
  const [isTemplateManagerOpen, setIsTemplateManagerOpen] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const loadTasks = async () => {
    try {
      const allTasks = await PokerMindService.getTasks()
      setTasks(allTasks)
    } catch (error) {
      console.error('Error loading tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTasks()
  }, [])

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Check if we're dropping over a different container/status
    const activeTask = tasks.find(task => task.id === activeId);
    if (!activeTask) return;

    // For now, we'll keep the same column sorting logic
    // In a full implementation, you'd determine the new status from the drop zone
    
    console.log('Drag ended:', { activeId, overId });
  }

  const handleTaskSave = () => {
    loadTasks()
    setEditingTask(undefined)
  }


  const handleArchiveTask = async (taskId: string) => {
    try {
      await PokerMindService.archiveTask(taskId)
      await loadTasks()
    } catch (error) {
      console.error('Error archiving task:', error)
    }
  }

  const handleRestoreTask = async (taskId: string) => {
    try {
      await PokerMindService.updateTask(taskId, { 
        status: 'todo'
      })
      await loadTasks()
    } catch (error) {
      console.error('Error restoring task:', error)
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    if (confirm('Supprimer définitivement cette tâche ? Cette action est irréversible.')) {
      try {
        await PokerMindService.deleteTask(taskId)
        await loadTasks()
      } catch (error) {
        console.error('Error deleting task:', error)
      }
    }
  }

  const handleToggleSubtask = async (parentTaskId: string, subtaskId: string) => {
    try {
      const parentTask = tasks.find(t => t.id === parentTaskId)
      if (!parentTask || !parentTask.subtasks) return

      const subtaskIndex = parentTask.subtasks.findIndex(st => st.id === subtaskId)
      if (subtaskIndex === -1) return

      const updatedSubtasks = [...parentTask.subtasks]
      const currentSubtask = updatedSubtasks[subtaskIndex]
      
      // Toggle entre 'todo' et 'done'
      updatedSubtasks[subtaskIndex] = {
        ...currentSubtask,
        status: currentSubtask.status === 'done' ? 'todo' : 'done',
        ...(currentSubtask.status !== 'done' && { completedAt: new Date() })
      }

      await PokerMindService.updateTask(parentTaskId, {
        subtasks: updatedSubtasks
      })
      await loadTasks()
    } catch (error) {
      console.error('Error toggling subtask:', error)
    }
  }

  const handleAddSubtask = (parentTask: Task) => {
    setParentTaskForSubtask(parentTask)
    setEditingTask(undefined)
    setIsTaskDialogOpen(true)
  }

  const handleToggleExpand = (taskId: string) => {
    const newExpanded = new Set(expandedTasks)
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId)
    } else {
      newExpanded.add(taskId)
    }
    setExpandedTasks(newExpanded)
  }

  const handleDuplicateTask = async (taskId: string) => {
    try {
      await PokerMindService.duplicateTask(taskId)
      await loadTasks()
    } catch (error) {
      console.error('Error duplicating task:', error)
    }
  }

  const handleSaveAsTemplate = (task: Task) => {
    setTaskToSaveAsTemplate(task)
    setTemplateName(`Template: ${task.title}`)
    setIsTemplateDialogOpen(true)
  }

  const handleSaveTemplate = async () => {
    if (!taskToSaveAsTemplate || !templateName.trim()) return
    
    try {
      const templateTask: Omit<Task, 'id' | 'createdAt' | 'isTemplate' | 'templateName'> = {
        title: taskToSaveAsTemplate.title,
        category: taskToSaveAsTemplate.category,
        priority: taskToSaveAsTemplate.priority,
        status: 'todo'
      }
      
      if (taskToSaveAsTemplate.description) {
        templateTask.description = taskToSaveAsTemplate.description
      }
      if (taskToSaveAsTemplate.deadline) {
        templateTask.deadline = taskToSaveAsTemplate.deadline
      }
      
      await PokerMindService.createTaskTemplate({
        name: templateName.trim(),
        task: templateTask
      })
      setIsTemplateDialogOpen(false)
      setTaskToSaveAsTemplate(undefined)
      setTemplateName('')
    } catch (error) {
      console.error('Error saving template:', error)
    }
  }



  const activeTasks = tasks.filter(t => t.status !== 'archived')
  const archivedTasks = tasks.filter(t => t.status === 'archived')
  
  const displayTasks = showArchived ? archivedTasks : activeTasks
  const todoTasks = displayTasks.filter(t => t.status === 'todo')
  const inProgressTasks = displayTasks.filter(t => t.status === 'inprogress')
  const doneTasks = displayTasks.filter(t => t.status === 'done')
  const archivedTasksForDisplay = displayTasks.filter(t => t.status === 'archived')

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Target className="h-12 w-12 animate-pulse text-primary mx-auto mb-4" />
          <p>Chargement des tâches...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-background border-b border-border p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/pokermind">
                <ArrowLeft className="h-6 w-6 text-muted-foreground hover:text-foreground" />
              </Link>
              <div className="flex items-center space-x-3">
                <Target className="h-8 w-8 text-primary" />
                <div>
                  <h1 className="text-2xl font-bold">Task Manager</h1>
                  <p className="text-sm text-muted-foreground">
                    Glissez-déposez vos tâches entre les colonnes
                  </p>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              {showArchived ? (
                <Button 
                  onClick={() => setShowArchived(false)} 
                  variant="outline"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Retour au Kanban
                </Button>
              ) : (
                <>
                  <Button 
                    onClick={() => setShowArchived(true)} 
                    variant="outline"
                  >
                    <Archive className="h-4 w-4 mr-2" />
                    Voir archivées ({archivedTasks.length})
                  </Button>
                  <Button onClick={() => setIsTemplateManagerOpen(true)} variant="outline">
                    <FolderPlus className="h-4 w-4 mr-2" />
                    Templates
                  </Button>
                  <Button onClick={() => setIsCategoryManagerOpen(true)} variant="outline">
                    <Palette className="h-4 w-4 mr-2" />
                    Catégories
                  </Button>
                  <Button onClick={() => setIsTaskDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nouvelle tâche
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Stats Overview */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-2">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-orange-400" />
                <div className="flex items-baseline space-x-2">
                  <p className="text-2xl font-bold text-foreground">{todoTasks.length}</p>
                  <p className="text-sm text-muted-foreground">À faire</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-2">
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-blue-400" />
                <div className="flex items-baseline space-x-2">
                  <p className="text-2xl font-bold text-foreground">{inProgressTasks.length}</p>
                  <p className="text-sm text-muted-foreground">En cours</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-2">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-400" />
                <div className="flex items-baseline space-x-2">
                  <p className="text-2xl font-bold text-foreground">{doneTasks.length}</p>
                  <p className="text-sm text-muted-foreground">Terminées</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Kanban Board */}
        <DndContext 
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-6 overflow-x-auto pb-6">
            {showArchived ? (
              <KanbanColumn
                title="Tâches archivées"
                status="archived"
                tasks={archivedTasksForDisplay}
                icon={Archive}
                onEdit={(task) => {
                  setEditingTask(task)
                  setParentTaskForSubtask(undefined)
                  setIsTaskDialogOpen(true)
                }}
                onArchive={handleRestoreTask}
                onDelete={handleDeleteTask}
                onDuplicate={handleDuplicateTask}
                onSaveAsTemplate={handleSaveAsTemplate}
                onToggleSubtask={handleToggleSubtask}
                expandedTasks={expandedTasks}
                onToggleExpand={handleToggleExpand}
                showArchived={showArchived}
              />
            ) : (
              <>
                <KanbanColumn
                  title="À faire"
                  status="todo"
                  tasks={todoTasks}
                  icon={AlertTriangle}
                  onEdit={(task) => {
                    setEditingTask(task)
                    setParentTaskForSubtask(undefined)
                    setIsTaskDialogOpen(true)
                  }}
                  onArchive={handleArchiveTask}
                  onDelete={handleDeleteTask}
                  onAddSubtask={handleAddSubtask}
                  onDuplicate={handleDuplicateTask}
                  onSaveAsTemplate={handleSaveAsTemplate}
                  onToggleSubtask={handleToggleSubtask}
                  expandedTasks={expandedTasks}
                  onToggleExpand={handleToggleExpand}
                  showArchived={showArchived}
                />
                <KanbanColumn
                  title="En cours"
                  status="inprogress"
                  tasks={inProgressTasks}
                  icon={Clock}
                  onEdit={(task) => {
                    setEditingTask(task)
                    setParentTaskForSubtask(undefined)
                    setIsTaskDialogOpen(true)
                  }}
                  onArchive={handleArchiveTask}
                  onDelete={handleDeleteTask}
                  onAddSubtask={handleAddSubtask}
                  onDuplicate={handleDuplicateTask}
                  onSaveAsTemplate={handleSaveAsTemplate}
                  onToggleSubtask={handleToggleSubtask}
                  expandedTasks={expandedTasks}
                  onToggleExpand={handleToggleExpand}
                  showArchived={showArchived}
                />
                <KanbanColumn
                  title="Terminé"
                  status="done"
                  tasks={doneTasks}
                  icon={CheckCircle}
                  onEdit={(task) => {
                    setEditingTask(task)
                    setParentTaskForSubtask(undefined)
                    setIsTaskDialogOpen(true)
                  }}
                  onArchive={handleArchiveTask}
                  onDelete={handleDeleteTask}
                  onAddSubtask={handleAddSubtask}
                  onDuplicate={handleDuplicateTask}
                  onSaveAsTemplate={handleSaveAsTemplate}
                  onToggleSubtask={handleToggleSubtask}
                  expandedTasks={expandedTasks}
                  onToggleExpand={handleToggleExpand}
                  showArchived={showArchived}
                />
              </>
            )}
          </div>
        </DndContext>

        {displayTasks.length === 0 && (
          <div className="text-center py-12">
            <Target className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {showArchived ? 'Aucune tâche archivée' : 'Aucune tâche active'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {showArchived 
                ? 'Les tâches archivées apparaîtront ici' 
                : 'Commencez par créer votre première tâche'
              }
            </p>
            {!showArchived && (
              <Button onClick={() => setIsTaskDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Créer une tâche
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Task Dialog */}
      <TaskDialog
        {...(editingTask && { task: editingTask })}
        {...(parentTaskForSubtask && { parentTask: parentTaskForSubtask })}
        isOpen={isTaskDialogOpen}
        onClose={() => {
          setIsTaskDialogOpen(false)
          setEditingTask(undefined)
          setParentTaskForSubtask(undefined)
        }}
        onSave={handleTaskSave}
      />

      {/* Template Save Dialog */}
      <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sauvegarder comme template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Nom du template</label>
              <Input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Nom du template..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsTemplateDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleSaveTemplate} disabled={!templateName.trim()}>
                Sauvegarder
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Template Manager */}
      <TemplateManager
        isOpen={isTemplateManagerOpen}
        onClose={() => setIsTemplateManagerOpen(false)}
        onCreateFromTemplate={async (templateId) => {
          await PokerMindService.createTaskFromTemplate(templateId)
          await loadTasks()
          setIsTemplateManagerOpen(false)
        }}
      />

      {/* Category Manager */}
      <CategoryManager
        isOpen={isCategoryManagerOpen}
        onClose={() => setIsCategoryManagerOpen(false)}
      />
    </div>
  )
}