'use client'

import { useState, useCallback, useMemo } from 'react'
import { TreeNode, EditorContext, NavigationState } from '@/types/editor'

interface UseTreeNavigationOptions {
  rootNode?: TreeNode | null
  initialSelectedNode?: TreeNode | null
  onNodeSelect?: (node: TreeNode | null) => void
}

export const useTreeNavigation = ({
  rootNode = null,
  initialSelectedNode = null,
  onNodeSelect
}: UseTreeNavigationOptions = {}) => {
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(initialSelectedNode)
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')

  // Calculate current path from root to selected node
  const currentPath = useMemo((): TreeNode[] => {
    if (!selectedNode || !rootNode) return []
    
    const path: TreeNode[] = []
    let current: TreeNode | null = selectedNode
    
    // Build path by traversing up the tree
    while (current) {
      path.unshift(current)
      if (current.id === rootNode.id) break
      
      // Find parent in the tree structure
      current = findNodeById(rootNode, current.parentId)
    }
    
    return path
  }, [selectedNode, rootNode])

  // Generate breadcrumbs from current path
  const breadcrumbs = useMemo(() => {
    return currentPath.map(node => ({
      node,
      label: getBreadcrumbLabel(node)
    }))
  }, [currentPath])

  // Create editor context
  const editorContext: EditorContext = useMemo(() => ({
    currentPath,
    breadcrumbs,
    rootNode
  }), [currentPath, breadcrumbs, rootNode])

  // Filter nodes based on search query
  const filteredNodes = useMemo(() => {
    if (!rootNode || !searchQuery.trim()) return []
    
    const query = searchQuery.toLowerCase()
    const results: TreeNode[] = []
    
    traverseTree(rootNode, (node) => {
      if (node.name.toLowerCase().includes(query) ||
          (node.type === 'range' && (node.data as any)?.description?.toLowerCase().includes(query))) {
        results.push(node)
      }
    })
    
    return results
  }, [rootNode, searchQuery])

  // Navigation state
  const navigationState: NavigationState = useMemo(() => ({
    selectedNode,
    expandedNodes,
    searchQuery,
    filteredNodes
  }), [selectedNode, expandedNodes, searchQuery, filteredNodes])

  // Select a node and notify parent
  const selectNode = useCallback((node: TreeNode | null) => {
    setSelectedNode(node)
    onNodeSelect?.(node)
    
    // Auto-expand path to selected node
    if (node && rootNode) {
      const pathIds = getPathToNode(rootNode, node.id).map(n => n.id)
      setExpandedNodes(prev => new Set([...prev, ...pathIds]))
    }
  }, [onNodeSelect, rootNode])

  // Toggle node expansion
  const toggleNode = useCallback((nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev)
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId)
      } else {
        newSet.add(nodeId)
      }
      return newSet
    })
  }, [])

  // Expand all nodes
  const expandAll = useCallback(() => {
    if (!rootNode) return
    
    const allNodeIds: string[] = []
    traverseTree(rootNode, (node) => {
      if (node.type === 'folder' || hasChildren(node)) {
        allNodeIds.push(node.id)
      }
    })
    
    setExpandedNodes(new Set(allNodeIds))
  }, [rootNode])

  // Collapse all nodes
  const collapseAll = useCallback(() => {
    setExpandedNodes(new Set())
  }, [])

  // Navigate to parent node
  const navigateToParent = useCallback(() => {
    if (!selectedNode || !rootNode) return
    
    const parent = findNodeById(rootNode, selectedNode.parentId)
    if (parent) {
      selectNode(parent)
    }
  }, [selectedNode, rootNode, selectNode])

  // Navigate to next sibling
  const navigateToNextSibling = useCallback(() => {
    if (!selectedNode || !rootNode) return
    
    const siblings = getSiblings(rootNode, selectedNode.id)
    const currentIndex = siblings.findIndex(s => s.id === selectedNode.id)
    
    if (currentIndex >= 0 && currentIndex < siblings.length - 1) {
      selectNode(siblings[currentIndex + 1])
    }
  }, [selectedNode, rootNode, selectNode])

  // Navigate to previous sibling
  const navigateToPreviousSibling = useCallback(() => {
    if (!selectedNode || !rootNode) return
    
    const siblings = getSiblings(rootNode, selectedNode.id)
    const currentIndex = siblings.findIndex(s => s.id === selectedNode.id)
    
    if (currentIndex > 0) {
      selectNode(siblings[currentIndex - 1])
    }
  }, [selectedNode, rootNode, selectNode])

  // Clear search and reset filters
  const clearSearch = useCallback(() => {
    setSearchQuery('')
  }, [])

  return {
    // State
    selectedNode,
    expandedNodes,
    searchQuery,
    currentPath,
    breadcrumbs,
    filteredNodes,
    editorContext,
    navigationState,
    
    // Actions
    selectNode,
    toggleNode,
    expandAll,
    collapseAll,
    setSearchQuery,
    clearSearch,
    
    // Navigation
    navigateToParent,
    navigateToNextSibling,
    navigateToPreviousSibling,
    
    // Utilities
    isNodeExpanded: (nodeId: string) => expandedNodes.has(nodeId),
    isNodeSelected: (nodeId: string) => selectedNode?.id === nodeId,
  }
}

// Utility functions
function findNodeById(root: TreeNode, nodeId: string | null): TreeNode | null {
  if (!nodeId) return null
  
  if (root.id === nodeId) return root
  
  if (root.children) {
    for (const child of root.children) {
      const found = findNodeById(child, nodeId)
      if (found) return found
    }
  }
  
  return null
}

function traverseTree(node: TreeNode, callback: (node: TreeNode) => void): void {
  callback(node)
  
  if (node.children) {
    for (const child of node.children) {
      traverseTree(child, callback)
    }
  }
}

function getPathToNode(root: TreeNode, nodeId: string): TreeNode[] {
  if (root.id === nodeId) return [root]
  
  if (root.children) {
    for (const child of root.children) {
      const path = getPathToNode(child, nodeId)
      if (path.length > 0) {
        return [root, ...path]
      }
    }
  }
  
  return []
}

function getSiblings(root: TreeNode, nodeId: string): TreeNode[] {
  const target = findNodeById(root, nodeId)
  if (!target || !target.parentId) return []
  
  const parent = findNodeById(root, target.parentId)
  return parent?.children || []
}

function hasChildren(node: TreeNode): boolean {
  return Boolean(node.children && node.children.length > 0)
}

function getBreadcrumbLabel(node: TreeNode): string {
  switch (node.type) {
    case 'folder':
      return node.name
    case 'range':
      return node.name
    case 'player':
      return `${node.position} - ${node.name}`
    case 'action':
      return `${node.actionType} - ${node.name}`
    default:
      return (node as any).name || 'Unknown'
  }
}