import { useState } from 'react'
import { supabase } from '../../services/supabase'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Card } from '../ui/Card'
import { Loader2 } from 'lucide-react'

interface AuthFormProps {
    onSuccess: () => void
}

export function AuthForm({ onSuccess }: AuthFormProps) {
    const [loading, setLoading] = useState(false)
    const [isLogin, setIsLogin] = useState(true)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState<string | null>(null)

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            if (isLogin) {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                })
                if (error) throw error
            } else {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                })
                if (error) throw error
                alert('Check your email for the confirmation link!')
            }
            onSuccess()
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card className="w-full max-w-md mx-auto p-6 bg-white/80 backdrop-blur-sm border-slate-200 shadow-xl">
            <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-slate-800">
                    {isLogin ? 'Welcome Back' : 'Create Account'}
                </h2>
                <p className="text-slate-500 text-sm">
                    {isLogin ? 'Sign in to access your saved documents' : 'Sign up to start saving your work'}
                </p>
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
                <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Email Address</label>
                    <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder="name@example.com"
                    />
                </div>
                <div className="space-y-2">
                    <label htmlFor="password" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Password</label>
                    <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        placeholder="••••••••"
                    />
                </div>

                {error && (
                    <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md">
                        {error}
                    </div>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {isLogin ? 'Sign In' : 'Sign Up'}
                </Button>
            </form>

            <div className="mt-4 text-center text-sm">
                <span className="text-slate-500">
                    {isLogin ? "Don't have an account? " : "Already have an account? "}
                </span>
                <button
                    onClick={() => setIsLogin(!isLogin)}
                    className="text-primary hover:underline font-medium"
                >
                    {isLogin ? 'Sign Up' : 'Sign In'}
                </button>
            </div>
        </Card>
    )
}
