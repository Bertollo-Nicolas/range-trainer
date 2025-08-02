'use client'

import { useState, useCallback, useMemo } from 'react'
import { z } from 'zod'
import { 
  ValidationError, 
  ValidationResult, 
  formatZodError,
  validateRangeEditorData,
  validateEditorAction,
  validateMixedColor,
  validateHandAction
} from '@/lib/validation/editor-schemas'

interface UseValidationOptions<T> {
  schema: z.ZodSchema<T>
  validateOnChange?: boolean
  showWarnings?: boolean
}

interface ValidationState {
  errors: ValidationError[]
  warnings: ValidationError[]
  isValid: boolean
  isValidating: boolean
  lastValidated: Date | null
}

export function useValidation<T>({
  schema,
  validateOnChange: _validateOnChange = true,
  showWarnings = true
}: UseValidationOptions<T>) {
  const [state, setState] = useState<ValidationState>({
    errors: [],
    warnings: [],
    isValid: true,
    isValidating: false,
    lastValidated: null
  })

  // Validate data against schema
  const validate = useCallback(async (data: unknown): Promise<ValidationResult<T>> => {
    setState(prev => ({ ...prev, isValidating: true }))

    try {
      // Perform validation
      const validatedData = schema.parse(data)
      
      setState({
        errors: [],
        warnings: [],
        isValid: true,
        isValidating: false,
        lastValidated: new Date()
      })

      return {
        success: true,
        data: validatedData,
        errors: []
      }
    } catch (error) {
      let errors: ValidationError[] = []
      
      if (error instanceof z.ZodError) {
        errors = formatZodError(error)
      } else {
        errors = [{
          path: 'unknown',
          message: 'Unknown validation error',
          code: 'unknown'
        }]
      }

      setState({
        errors,
        warnings: [],
        isValid: false,
        isValidating: false,
        lastValidated: new Date()
      })

      return {
        success: false,
        errors
      }
    }
  }, [schema])

  // Validate with warnings (partial validation)
  const validateWithWarnings = useCallback(async (data: unknown): Promise<ValidationResult<T>> => {
    setState(prev => ({ ...prev, isValidating: true }))

    try {
      // Try full validation first
      const validatedData = schema.parse(data)
      
      setState({
        errors: [],
        warnings: [],
        isValid: true,
        isValidating: false,
        lastValidated: new Date()
      })

      return {
        success: true,
        data: validatedData,
        errors: []
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const allErrors = formatZodError(error)
        
        // Separate critical errors from warnings
        const criticalErrors = allErrors.filter(err => 
          err.code === 'invalid_type' || 
          err.code === 'too_small' || 
          err.code === 'too_big'
        )
        
        const warnings = allErrors.filter(err => 
          err.code !== 'invalid_type' && 
          err.code !== 'too_small' && 
          err.code !== 'too_big'
        )

        const isValid = criticalErrors.length === 0

        setState({
          errors: criticalErrors,
          warnings: showWarnings ? warnings : [],
          isValid,
          isValidating: false,
          lastValidated: new Date()
        })

        return {
          success: isValid,
          data: (isValid ? (data as T) : undefined) as any,
          errors: criticalErrors
        }
      }

      const unknownError = [{
        path: 'unknown',
        message: 'Unknown validation error',
        code: 'unknown'
      }]

      setState({
        errors: unknownError,
        warnings: [],
        isValid: false,
        isValidating: false,
        lastValidated: new Date()
      })

      return {
        success: false,
        errors: unknownError
      }
    }
  }, [schema, showWarnings])

  // Clear validation state
  const clearValidation = useCallback(() => {
    setState({
      errors: [],
      warnings: [],
      isValid: true,
      isValidating: false,
      lastValidated: null
    })
  }, [])

  // Get errors for specific field
  const getFieldErrors = useCallback((fieldPath: string): ValidationError[] => {
    return state.errors.filter(error => error.path === fieldPath)
  }, [state.errors])

  // Get warnings for specific field
  const getFieldWarnings = useCallback((fieldPath: string): ValidationError[] => {
    return state.warnings.filter(warning => warning.path === fieldPath)
  }, [state.warnings])

  // Check if specific field has errors
  const hasFieldErrors = useCallback((fieldPath: string): boolean => {
    return state.errors.some(error => error.path === fieldPath)
  }, [state.errors])

  // Check if specific field has warnings
  const hasFieldWarnings = useCallback((fieldPath: string): boolean => {
    return state.warnings.some(warning => warning.path === fieldPath)
  }, [state.warnings])

  // Validation summary
  const validationSummary = useMemo(() => ({
    totalErrors: state.errors.length,
    totalWarnings: state.warnings.length,
    hasErrors: state.errors.length > 0,
    hasWarnings: state.warnings.length > 0,
    isValid: state.isValid,
    canSave: state.isValid && state.errors.length === 0
  }), [state.errors.length, state.warnings.length, state.isValid])

  return {
    // State
    ...state,
    
    // Actions
    validate,
    validateWithWarnings,
    clearValidation,
    
    // Field-specific utilities
    getFieldErrors,
    getFieldWarnings,
    hasFieldErrors,
    hasFieldWarnings,
    
    // Summary
    validationSummary
  }
}

// Specialized hooks for common validation scenarios

export function useRangeEditorValidation(validateOnChange = true) {
  return {
    ...useValidation({ 
      schema: undefined as any, // Will be handled by validateRangeEditorData
      validateOnChange 
    }),
    validateRangeData: validateRangeEditorData
  }
}

export function useActionValidation(validateOnChange = true) {
  return {
    ...useValidation({ 
      schema: undefined as any,
      validateOnChange 
    }),
    validateAction: validateEditorAction
  }
}

export function useMixedColorValidation(validateOnChange = true) {
  return {
    ...useValidation({ 
      schema: undefined as any,
      validateOnChange 
    }),
    validateMixedColor: validateMixedColor
  }
}

export function useHandActionValidation(validateOnChange = true) {
  return {
    ...useValidation({ 
      schema: undefined as any,
      validateOnChange 
    }),
    validateHandAction: validateHandAction
  }
}

// Form validation hook for real-time validation
export function useFormValidation<T extends Record<string, any>>({
  schema,
  initialData,
  onValidationChange
}: {
  schema: z.ZodSchema<T>
  initialData: T
  onValidationChange?: (isValid: boolean, errors: ValidationError[]) => void
}) {
  const [data, setData] = useState<T>(initialData)
  const validation = useValidation({ schema, validateOnChange: true })

  // Update data and validate
  const updateField = useCallback((field: keyof T, value: any) => {
    const newData = { ...data, [field]: value }
    setData(newData)
    
    // Validate new data
    validation.validate(newData).then(result => {
      onValidationChange?.(result.success, result.errors)
    })
  }, [data, validation, onValidationChange])

  // Update multiple fields
  const updateFields = useCallback((updates: Partial<T>) => {
    const newData = { ...data, ...updates }
    setData(newData)
    
    validation.validate(newData).then(result => {
      onValidationChange?.(result.success, result.errors)
    })
  }, [data, validation, onValidationChange])

  // Reset to initial data
  const reset = useCallback(() => {
    setData(initialData)
    validation.clearValidation()
  }, [initialData, validation])

  // Validate current data
  const validateCurrent = useCallback(() => {
    return validation.validate(data)
  }, [data, validation])

  return {
    data,
    updateField,
    updateFields,
    reset,
    validateCurrent,
    ...validation,
    
    // Shortcuts for field validation
    isFieldValid: (field: keyof T) => !validation.hasFieldErrors(String(field)),
    getFieldErrorMessage: (field: keyof T) => {
      const errors = validation.getFieldErrors(String(field))
      return errors.length > 0 ? errors[0].message : ''
    }
  }
}

// Async validation hook for server-side validation
export function useAsyncValidation<T>() {
  const [isValidating, setIsValidating] = useState(false)
  const [validationResult, setValidationResult] = useState<ValidationResult<T> | null>(null)

  const validateAsync = useCallback(async (
    data: unknown,
    validationFn: (data: unknown) => Promise<ValidationResult<T>>
  ): Promise<ValidationResult<T>> => {
    setIsValidating(true)
    
    try {
      const result = await validationFn(data)
      setValidationResult(result)
      return result
    } catch (error) {
      const errorResult: ValidationResult<T> = {
        success: false,
        errors: [{
          path: 'server',
          message: 'Server validation failed',
          code: 'server_error'
        }]
      }
      setValidationResult(errorResult)
      return errorResult
    } finally {
      setIsValidating(false)
    }
  }, [])

  const clearResult = useCallback(() => {
    setValidationResult(null)
  }, [])

  return {
    isValidating,
    validationResult,
    validateAsync,
    clearResult,
    hasErrors: validationResult ? !validationResult.success : false,
    errors: validationResult?.errors || []
  }
}