import { FileText, DollarSign, Building, ScrollText, FileQuestion } from 'lucide-react'
import { Card } from '../ui/Card'
import { cn } from '../../lib/utils'

export type LoanDocType = 'Pay Stub' | 'Bank Statement' | 'Tax Return' | 'Loan Application' | 'Other'

interface DocTypeSelectorProps {
    onSelect: (type: LoanDocType) => void
    onCancel: () => void
}

export function DocTypeSelector({ onSelect, onCancel }: DocTypeSelectorProps) {
    const types: { id: LoanDocType; icon: any; desc: string }[] = [
        { id: 'Pay Stub', icon: DollarSign, desc: 'Income verification, pay period details' },
        { id: 'Bank Statement', icon: Building, desc: 'Assets, transaction history, balances' },
        { id: 'Tax Return', icon: FileText, desc: '1040, W-2, historical income data' },
        { id: 'Loan Application', icon: ScrollText, desc: '1003 form, borrower declarations' },
        { id: 'Other', icon: FileQuestion, desc: 'General loan documents or correspondence' },
    ]

    return (
        <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Select Document Type</h2>
                <p className="text-slate-500">Helping the AI identify the document type improves extraction accuracy.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {types.map((type) => (
                    <button
                        key={type.id}
                        onClick={() => onSelect(type.id)}
                        className="text-left focus:outline-none group"
                    >
                        <Card className="h-full p-6 hover:shadow-lg hover:border-primary/50 transition-all duration-200 group-hover:-translate-y-1">
                            <div className={cn(
                                "w-12 h-12 rounded-full flex items-center justify-center mb-4 transition-colors",
                                "bg-slate-100 text-slate-500 group-hover:bg-primary/10 group-hover:text-primary"
                            )}>
                                <type.icon size={24} />
                            </div>
                            <h3 className="font-semibold text-slate-900 mb-1">{type.id}</h3>
                            <p className="text-sm text-slate-500">{type.desc}</p>
                        </Card>
                    </button>
                ))}
            </div>

            <div className="mt-8 text-center">
                <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 font-medium text-sm">
                    Cancel Processing
                </button>
            </div>
        </div>
    )
}
