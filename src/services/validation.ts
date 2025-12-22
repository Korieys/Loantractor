export interface ValidationRule {
    id: string
    name: string
    description: string
    type: 'REQUIRED' | 'CONFIDENCE' | 'FORMAT' | 'CUSTOM'
    threshold?: number
    field?: string // If specific to a field, undefined = global
}

export interface ValidationError {
    field: string
    message: string
    severity: 'ERROR' | 'WARNING'
}

export interface ValidationResult {
    isValid: boolean
    errors: ValidationError[]
}

const DEFAULT_RULES: ValidationRule[] = [
    {
        id: 'min-confidence',
        name: 'Minimum Confidence',
        description: 'Flag fields with low confidence scores',
        type: 'CONFIDENCE',
        threshold: 0.8
    },
    {
        id: 'required-fields',
        name: 'Required Fields',
        description: 'Ensure all fields have values',
        type: 'REQUIRED'
    }
]

export function validateExtraction(data: any[], rules: ValidationRule[] = DEFAULT_RULES): ValidationResult {
    const errors: ValidationError[] = []

    // Map data to easy access format if needed, but assuming data is ExtractedData[]
    // interface ExtractedData { field: string, value: string, confidence: number }

    data.forEach(item => {
        // 1. Check Confidence
        const confRule = rules.find(r => r.type === 'CONFIDENCE')
        if (confRule && confRule.threshold && item.confidence < confRule.threshold) {
            errors.push({
                field: item.field,
                message: `Low confidence (${Math.round(item.confidence * 100)}%)`,
                severity: 'WARNING'
            })
        }

        // 2. Check Required (Empty check)
        const reqRule = rules.find(r => r.type === 'REQUIRED')
        if (reqRule && (!item.value || item.value.trim() === '')) {
            errors.push({
                field: item.field,
                message: 'Value is missing',
                severity: 'ERROR'
            })
        }
    })

    return {
        isValid: errors.length === 0,
        errors
    }
}
