import { redirect } from "next/navigation";

export default async function AsistenciaEmpleadoRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/admin/trabajadores/${id}?tab=asistencia`);
}
