export function hasAdminRole(roles: Array<{ role: string }> | null | undefined) {
  return (roles ?? []).some((role) => role.role === "admin");
}
