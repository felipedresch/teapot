import { createFileRoute, Outlet } from '@tanstack/react-router'
export const Route = createFileRoute('/lista-de-presentes')({
  component: Outlet,
})
