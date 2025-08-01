'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Plus, 
  Filter, 
  MoreHorizontal,
  Calendar,
  Flag
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Task } from '@/types/mind'

const mockTasks: Task[] = [
  {
    id: '1',
    title: 'Analyser la session d\'hier',
    description: 'Revoir les 20 dernières mains, identifier les erreurs',
    category: 'Review',
    status: 'todo',
    priority: 'high',
    due_date: '2024-01-15',
    created_at: '2024-01-10',
    updated_at: '2024-01-10'
  },
  {
    id: '2',
    title: 'Session 2h NL50',
    category: 'Grind',
    status: 'in_progress',
    priority: 'medium',
    created_at: '2024-01-10',
    updated_at: '2024-01-10'
  },
  {
    id: '3',
    title: 'Méditation mindfulness',
    description: '15 minutes de méditation',
    category: 'Mental',
    status: 'done',
    priority: 'low',
    created_at: '2024-01-10',
    updated_at: '2024-01-10',
    completed_at: '2024-01-10'
  },
  {
    id: '4',
    title: 'Étudier les ranges 3bet BTN vs UTG',
    category: 'Review',
    status: 'todo',
    priority: 'medium',
    created_at: '2024-01-10',
    updated_at: '2024-01-10'
  }
]

export function TaskManager() {
  const [tasks, setTasks] = useState<Task[]>(mockTasks)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [draggedTask, setDraggedTask] = useState<Task | null>(null)

  const columns = [
    { id: 'todo', title: 'À faire', status: 'todo' as const },
    { id: 'in_progress', title: 'En cours', status: 'in_progress' as const },
    { id: 'done', title: 'Terminé', status: 'done' as const }
  ]

  const categories = ['Grind', 'Mental', 'Review']

  const filteredTasks = selectedCategory === 'all' 
    ? tasks 
    : tasks.filter(task => task.category === selectedCategory)

  const getTasksByStatus = (status: Task['status']) => {
    return filteredTasks.filter(task => task.status === status)
  }

  const addQuickTask = () => {
    if (!newTaskTitle.trim()) return

    const newTask: Task = {
      id: Date.now().toString(),
      title: newTaskTitle,
      category: 'Grind',
      status: 'todo',
      priority: 'medium',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    setTasks([...tasks, newTask])
    setNewTaskTitle('')
  }

  const updateTaskStatus = (taskId: string, newStatus: Task['status']) => {
    setTasks(tasks.map(task => 
      task.id === taskId 
        ? { 
            ...task, 
            status: newStatus, 
            updated_at: new Date().toISOString(),
            ...(newStatus === 'done' && { completed_at: new Date().toISOString() })
          }
        : task
    ))
  }

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Grind': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'Mental': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      case 'Review': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const handleDragStart = (e: React.DragEvent, task: Task) => {
    setDraggedTask(task)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, status: Task['status']) => {
    e.preventDefault()
    if (draggedTask && draggedTask.status !== status) {
      updateTaskStatus(draggedTask.id, status)
    }
    setDraggedTask(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold">Task Manager</h1>
          <p className="text-muted-foreground">Organisez vos tâches poker en mode Kanban</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full sm:w-48">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filtrer par catégorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les catégories</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Ajout rapide de tâche */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Ajout rapide
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Nouvelle tâche..."
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addQuickTask()}
              className="flex-1"
            />
            <Button onClick={addQuickTask}>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {columns.map((column) => (
          <div key={column.id} className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">{column.title}</h3>
              <Badge variant="outline">
                {getTasksByStatus(column.status).length}
              </Badge>
            </div>

            <div 
              className="min-h-[400px] space-y-3 p-2 rounded-lg border-2 border-dashed border-muted"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.status)}
            >
              {getTasksByStatus(column.status).map((task) => (
                <Card 
                  key={task.id}
                  className="cursor-move hover:shadow-md transition-shadow"
                  draggable
                  onDragStart={(e) => handleDragStart(e, task)}
                >
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <h4 className="font-medium text-sm leading-tight">{task.title}</h4>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              <MoreHorizontal className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>Modifier</DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600">Supprimer</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {task.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {task.description}
                        </p>
                      )}

                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" className={getCategoryColor(task.category)}>
                          {task.category}
                        </Badge>
                        <Badge variant="outline" className={getPriorityColor(task.priority)}>
                          <Flag className="h-3 w-3 mr-1" />
                          {task.priority}
                        </Badge>
                      </div>

                      {task.due_date && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {new Date(task.due_date).toLocaleDateString('fr-FR')}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {getTasksByStatus(column.status).length === 0 && (
                <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                  Aucune tâche
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}