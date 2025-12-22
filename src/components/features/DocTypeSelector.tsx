import { FileText, DollarSign, Building, ScrollText, FileQuestion } from 'lucide-react'
import { Card } from '../ui/Card'
import { cn } from '../../lib/utils'

export type LoanDocType = 'Pay Stub' | 'Bank Statement' | 'Tax Return' | 'Loan Application' | 'Other'

interface DocTypeSelectorProps {
    onSelect: (type: LoanDocType) => void
    onCancel: () => void
    showLabel?: boolean
}

export function DocTypeSelector({ onSelect, onCancel, showLabel = true }: DocTypeSelectorProps) {
    const types: { id: LoanDocType; icon: any; desc: string }[] = [
        { id: 'Pay Stub', icon: DollarSign, desc: 'Income verification, pay period details' },
        { id: 'Bank Statement', icon: Building, desc: 'Assets, transaction history, balances' },
        { id: 'Tax Return', icon: FileText, desc: '1040, W-2, historical income data' },
        { id: 'Loan Application', icon: ScrollText, desc: '1003 form, borrower declarations' },
        { id: 'Other', icon: FileQuestion, desc: 'General loan documents or correspondence' },
    ]

    return (
        <div className="max-w-4xl mx-auto">
            {showLabel && (
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Select Document Type</h2>
                    <p className="text-slate-500">Helping the AI identify the document type improves extraction accuracy.</p>
                </div>
            )}

            <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${!showLabel ? 'gap-y-2' : ''}`}>
                {types.map((type) => (
                    <button
                        key={type.id}
                        onClick={() => onSelect(type.id)}
                        className="text-left focus:outline-none group"
                    >
                        <Card className={cn(
                            "h-full hover:shadow-lg hover:border-primary/50 transition-all duration-200 group-hover:-translate-y-1",
                            showLabel ? "p-6" : "p-3 flex items-center gap-3"
                        )}>
                            <div className={cn(
                                "rounded-full flex items-center justify-center transition-colors",
                                "bg-slate-100 text-slate-500 group-hover:bg-primary/10 group-hover:text-primary",
                                showLabel ? "w-12 h-12 mb-4" : "w-8 h-8 shrink-0"
                            )}>
                                <type.icon size={showLabel ? 24 : 16} />
                            </div>
                            <div>
                                <h3 className={cn("font-semibold text-slate-900", showLabel ? "mb-1" : "text-sm")}>{type.id}</h3>
                                {showLabel && <p className="text-sm text-slate-500">{type.desc}</p>}
                            </div>
                        </Card>
                    </button>
                ))}
            </div>

            {showLabel && (
                <div className="mt-8 text-center">
                    <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 font-medium text-sm">
                        Cancel Processing
                    </button>
                </div>
            )}
        </div>
    )
}
