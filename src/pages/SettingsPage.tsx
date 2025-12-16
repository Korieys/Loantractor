import { User, Bell, Database, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useEffect, useState } from 'react';
import { supabase, updateUserProfile } from '../services/supabase';

export function SettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form State
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            setEmail(user.email || '');
            setFirstName(user.user_metadata?.first_name || '');
            setLastName(user.user_metadata?.last_name || '');
        }
        setLoading(false);
    };

    const handleSaveProfile = async () => {
        setSaving(true);
        try {
            await updateUserProfile({
                data: {
                    first_name: firstName,
                    last_name: lastName
                }
            });
            alert('Profile updated successfully!');
        } catch (error) {
            alert('Failed to update profile.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="p-8 text-center">Loading settings...</div>;
    }

    return (
        <div className="space-y-6">
            <header>
                <h2 className="text-2xl font-bold text-slate-800">Settings</h2>
                <p className="text-slate-500">Manage your account and application preferences.</p>
            </header>

            <div className="grid gap-6">
                {/* Profile Section */}
                <section className="bg-white p-6 rounded-lg border border-slate-200">
                    <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        <User size={20} className="text-primary" />
                        Profile Settings
                    </h3>
                    <div className="space-y-4 max-w-lg">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
                                <input
                                    type="text"
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-md"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
                                <input
                                    type="text"
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-md"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                            <input
                                type="email"
                                value={email}
                                disabled
                                className="w-full px-3 py-2 border border-slate-200 rounded-md bg-slate-50 text-slate-500 cursor-not-allowed"
                            />
                        </div>
                        <Button onClick={handleSaveProfile} disabled={saving}>
                            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Save Changes
                        </Button>
                    </div>
                </section>

                {/* Notifications */}
                <section className="bg-white p-6 rounded-lg border border-slate-200">
                    <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        <Bell size={20} className="text-primary" />
                        Notifications
                    </h3>
                    <div className="space-y-3">
                        <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-md hover:bg-slate-50 cursor-pointer">
                            <input type="checkbox" defaultChecked className="w-4 h-4 text-primary rounded focus:ring-primary" />
                            <span className="text-sm text-slate-700">Email me when a document is fully processed</span>
                        </label>
                        <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-md hover:bg-slate-50 cursor-pointer">
                            <input type="checkbox" className="w-4 h-4 text-primary rounded focus:ring-primary" />
                            <span className="text-sm text-slate-700">Weekly digest of activities</span>
                        </label>
                    </div>
                </section>

                {/* API Settings */}
                <section className="bg-white p-6 rounded-lg border border-slate-200">
                    <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        <Database size={20} className="text-primary" />
                        Data Integrations
                    </h3>
                    <p className="text-sm text-slate-600 mb-4">Connect Loantractor to your existing LOS or CRM.</p>
                    <div className="flex gap-3">
                        <Button variant="outline">Connect Encompass</Button>
                        <Button variant="outline">Connect Salesforce</Button>
                    </div>
                </section>
            </div>
        </div>
    );
}
