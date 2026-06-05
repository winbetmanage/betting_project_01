'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTrigger,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function AdminProfilePage() {
  const [profile, setProfile] = useState({ name: '', email: '', username: '' });
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', username: '' });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    newPassword2: '',
  });
  const [password2Form, setPassword2Form] = useState({
    currentPassword: '',
    newPassword2: '',
  });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');

  useEffect(() => {
    fetch('/api/admin/profile')
      .then((r) => r.json())
      .then((data) => {
        setProfile(data);
        setForm({ name: data.name, email: data.email, username: data.username });
      });
  }, []);

  async function handleSave() {
    setSaving(true);
    setError('');
    const res = await fetch('/api/admin/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, password: confirmPassword }),
    });
    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(data.errors?.form?.[0] || 'Failed to save');
      return;
    }

    setProfile(data);
    setEditing(false);
    setConfirmPassword('');
    setDialogOpen(false);
    setSuccess('Profile updated successfully');
    setTimeout(() => setSuccess(''), 3000);
  }

  async function handleChangePassword(type: 'password' | 'password2') {
    setPwSaving(true);
    setPwError('');
    setPwSuccess('');

    const body =
      type === 'password'
        ? passwordForm
        : { currentPassword: password2Form.currentPassword, newPassword2: password2Form.newPassword2 };

    const res = await fetch('/api/admin/change-password', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setPwSaving(false);

    if (!res.ok) {
      setPwError(data.errors?.form?.[0] || 'Failed to update password');
      return;
    }

    setPwSuccess(
      type === 'password' ? 'Password updated successfully' : 'Second password updated successfully'
    );
    setPasswordForm({ currentPassword: '', newPassword: '', newPassword2: '' });
    setPassword2Form({ currentPassword: '', newPassword2: '' });
    setTimeout(() => setPwSuccess(''), 3000);
  }

  if (!profile.name) {
    return <div className="text-zinc-500">Loading...</div>;
  }

  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="text-2xl font-bold text-zinc-900">Admin Profile</h1>

      {/* Success / Error messages */}
      {success && (
        <div className="rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-800">
          {success}
        </div>
      )}

      {/* Profile Info Section */}
      <div className="rounded-xl border border-zinc-300 bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900">Profile Information</h2>
          {!editing && (
            <Button
              variant="outline"
              onClick={() => {
                setForm({ name: profile.name, email: profile.email, username: profile.username });
                setEditing(true);
              }}
            >
              Edit
            </Button>
          )}
        </div>

        {editing ? (
          <div className="mt-4 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">Name</label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">Email</label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">Username</label>
              <Input
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
              />
            </div>
            <div className="flex gap-3">
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger render={<Button>Save Changes</Button>} />
                <DialogPortal>
                  <DialogOverlay />
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Confirm Password</DialogTitle>
                      <DialogDescription>
                        Enter your current password to save changes.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                      <Input
                        type="password"
                        placeholder="Current password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                      {error && (
                        <p className="mt-2 text-sm text-red-600">{error}</p>
                      )}
                    </div>
                    <DialogFooter>
                      <DialogClose render={<Button variant="outline">Cancel</Button>} />
                      <Button onClick={handleSave} disabled={saving || !confirmPassword}>
                        {saving ? 'Saving...' : 'Confirm'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </DialogPortal>
              </Dialog>
              <Button variant="outline" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <div>
              <span className="text-sm text-zinc-500">Name</span>
              <p className="text-zinc-900">{profile.name}</p>
            </div>
            <div>
              <span className="text-sm text-zinc-500">Email</span>
              <p className="text-zinc-900">{profile.email}</p>
            </div>
            <div>
              <span className="text-sm text-zinc-500">Username</span>
              <p className="text-zinc-900">{profile.username}</p>
            </div>
          </div>
        )}
      </div>

      {/* Change Password Section */}
      <div className="rounded-xl border border-zinc-300 bg-white p-6">
        <h2 className="text-lg font-semibold text-zinc-900">Change Password</h2>
        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Current Password</label>
            <Input
              type="password"
              value={passwordForm.currentPassword}
              onChange={(e) =>
                setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
              }
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">New Password</label>
            <Input
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">
              Confirm New Password
            </label>
            <Input
              type="password"
              value={passwordForm.newPassword2}
              onChange={(e) => setPasswordForm({ ...passwordForm, newPassword2: e.target.value })}
            />
          </div>
          <Button
            onClick={() => handleChangePassword('password')}
            disabled={
              pwSaving ||
              !passwordForm.currentPassword ||
              !passwordForm.newPassword ||
              passwordForm.newPassword !== passwordForm.newPassword2
            }
          >
            {pwSaving ? 'Updating...' : 'Update Password'}
          </Button>
        </div>
      </div>

      {/* Change Second Password Section */}
      <div className="rounded-xl border border-zinc-300 bg-white p-6">
        <h2 className="text-lg font-semibold text-zinc-900">Change Second Password</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Used for admin login with two-factor authentication.
        </p>
        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Current Password</label>
            <Input
              type="password"
              value={password2Form.currentPassword}
              onChange={(e) =>
                setPassword2Form({ ...password2Form, currentPassword: e.target.value })
              }
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">
              New Second Password
            </label>
            <Input
              type="password"
              value={password2Form.newPassword2}
              onChange={(e) =>
                setPassword2Form({ ...password2Form, newPassword2: e.target.value })
              }
            />
          </div>
          {pwError && <p className="text-sm text-red-600">{pwError}</p>}
          {pwSuccess && <p className="text-sm text-green-600">{pwSuccess}</p>}
          <Button
            onClick={() => handleChangePassword('password2')}
            disabled={
              pwSaving ||
              !password2Form.currentPassword ||
              !password2Form.newPassword2
            }
          >
            {pwSaving ? 'Updating...' : 'Update Second Password'}
          </Button>
        </div>
      </div>
    </div>
  );
}
