import { trpc } from '@/api/client'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Shield, ShieldOff, UserX, UserCheck } from 'lucide-react'
import { authClient } from '@/lib/auth-client'

export function AdminUsersPage() {
  const qc = useQueryClient()
  const { data: session } = authClient.useSession()
  const { data, isLoading } = trpc.admin.users.list.useQuery({})
  const users = data?.users ?? []

  function invalidate() {
    qc.invalidateQueries({ queryKey: [['admin', 'users']] })
  }

  const setRole = trpc.admin.users.setRole.useMutation({ onSuccess: invalidate })
  const setBanned = trpc.admin.users.setBanned.useMutation({ onSuccess: invalidate })
  const deleteUser = trpc.admin.users.delete.useMutation({ onSuccess: invalidate })

  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-2xl font-bold">Users</h1>

      {isLoading && <p className="text-muted-foreground">Loading…</p>}

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium">User</th>
              <th className="text-left px-4 py-3 font-medium">Role</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-right px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.map((user) => {
              const isSelf = user.id === session?.user.id
              return (
                <tr key={user.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <p className="font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                      {user.role ?? 'user'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {user.banned ? (
                      <Badge variant="destructive">Banned</Badge>
                    ) : (
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        Active
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {!isSelf && (
                        <>
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            title={user.role === 'admin' ? 'Remove admin' : 'Make admin'}
                            onClick={() =>
                              setRole.mutate({
                                userId: user.id,
                                role: user.role === 'admin' ? 'user' : 'admin',
                              })
                            }
                          >
                            {user.role === 'admin' ? (
                              <ShieldOff className="h-4 w-4" />
                            ) : (
                              <Shield className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            title={user.banned ? 'Unban' : 'Ban'}
                            onClick={() =>
                              setBanned.mutate({ userId: user.id, banned: !user.banned })
                            }
                          >
                            {user.banned ? (
                              <UserCheck className="h-4 w-4 text-green-600" />
                            ) : (
                              <UserX className="h-4 w-4 text-orange-500" />
                            )}
                          </Button>
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            title="Delete user"
                            onClick={() => {
                              if (confirm(`Delete ${user.name}? This cannot be undone.`)) {
                                deleteUser.mutate({ userId: user.id })
                              }
                            }}
                          >
                            <UserX className="h-4 w-4 text-destructive" />
                          </Button>
                        </>
                      )}
                      {isSelf && <span className="text-xs text-muted-foreground">You</span>}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
