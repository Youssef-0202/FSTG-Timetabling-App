const API_BASE = "http://192.168.56.1:8000";

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "API Error");
  }
  if (res.status === 204) return null as T;
  return res.json();
}

// ─── Types alignés sur schema.py du Backend ─── 

export interface Department {
  id: number;
  name: string;
}

export interface Teacher {
  id: number;
  name: string;
  email: string;
  availabilities: Record<string, unknown>;
}

export interface Room {
  id: number;
  name: string;
  capacity: number;
  type: "AMPHI" | "SALLE_TD" | "SALLE_TP" | "SALLE_TP_INFO" | "SALLE_TP_BIO" | "SALLE_TD_CHIMIE" | string;
}

export interface Filiere {
  id: number;
  name: string;
  type: string; // "TC", "LST", "MST", "CI"
  dept_id: number;
}

export interface GroupeFiliere {
  id: number;
  filiere_id: number;
  semestre: string;
  academic_year: string;
  total_students: number;
}

export interface Section {
  id: number;
  name: string;
  semestre: string;
  total_capacity: number;
  groupes: GroupeFiliere[];
}

export interface TDGroup {
  id: number;
  name: string;
  section_id: number;
  size: number;
}

export interface Module {
  id: number;
  name: string;
  code: string;
  dept_id: number;
}

export interface ModulePart {
  id: number;
  module_id: number;
  type: string;
  weekly_hours: number;
  required_room_type: string;
}

export interface Timeslot {
  id: number;
  day: string;
  start_time: string;
  end_time: string;
}

export interface Assignment {
  id: number;
  module_part_id: number;
  teacher_id: number;
  room_id: number | null;
  slot_id: number | null;
  section_id: number | null; // Pour les CM
  is_locked: boolean;
  td_groups: TDGroup[];      // Pour les TD/TP
}

export type AssignmentCreate = Omit<Assignment, "id" | "room_id" | "slot_id" | "td_groups"> & { 
  room_id?: number | null; 
  slot_id?: number | null; 
  tdgroup_ids: number[];
};

export interface DashboardStats {
  total_teachers: number;
  total_rooms: number;
  total_sections: number;
  total_modules: number;
  total_assignments: number;
  hard_violations: number;
}

// ─── API Endpoints ───

//  Dashboard Stats 
export const getStats = () => apiFetch<DashboardStats>("/stats");

//  Departments 
export const getDepartments = () => apiFetch<Department[]>("/departments");
export const createDepartment = (data: Omit<Department, "id">) =>
  apiFetch<Department>("/departments", { method: "POST", body: JSON.stringify(data) });
export const deleteDepartment = (id: number) =>
  apiFetch<null>(`/departments/${id}`, { method: "DELETE" });

//  Filieres 
export const getFilieres = () => apiFetch<Filiere[]>("/filieres");
export const createFiliere = (data: Omit<Filiere, "id">) =>
  apiFetch<Filiere>("/filieres", { method: "POST", body: JSON.stringify(data) });
export const deleteFiliere = (id: number) =>
  apiFetch<null>(`/filieres/${id}`, { method: "DELETE" });

//  Teachers 
export const getTeachers  = () => apiFetch<Teacher[]>("/teachers");
export const createTeacher = (data: Omit<Teacher, "id">) =>
  apiFetch<Teacher>("/teachers", { method: "POST", body: JSON.stringify(data) });
export const updateTeacher = (id: number, data: Partial<Teacher>) =>
  apiFetch<Teacher>(`/teachers/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const deleteTeacher = (id: number) =>
  apiFetch<null>(`/teachers/${id}`, { method: "DELETE" });

// ─── Rooms 
export const getRooms  = (type?: string) =>
  apiFetch<Room[]>("/rooms" + (type ? `?type=${type}` : ""));
export const createRoom = (data: Omit<Room, "id">) =>
  apiFetch<Room>("/rooms", { method: "POST", body: JSON.stringify(data) });
export const updateRoom = (id: number, data: Partial<Room>) =>
  apiFetch<Room>(`/rooms/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const deleteRoom = (id: number) =>
  apiFetch<null>(`/rooms/${id}`, { method: "DELETE" });

// ─── Groupe Filieres (Cohortes) 
export const getGroupeFilieres = () => apiFetch<GroupeFiliere[]>("/groupe-filieres");
export const createGroupeFiliere = (data: Omit<GroupeFiliere, "id">) =>
  apiFetch<GroupeFiliere>("/groupe-filieres", { method: "POST", body: JSON.stringify(data) });
export const deleteGroupeFiliere = (id: number) =>
  apiFetch<null>(`/groupe-filieres/${id}`, { method: "DELETE" });

// ─── Sections 
export const getSections = () => apiFetch<Section[]>("/sections");
export const createSection = (data: Omit<Section, "id" | "groupes"> & { groupe_ids: number[] }) =>
  apiFetch<Section>("/sections", { method: "POST", body: JSON.stringify(data) });
export const deleteSection = (id: number) =>
  apiFetch<null>(`/sections/${id}`, { method: "DELETE" });

// ─── TD Groups 
export const getTDGroups = () => apiFetch<TDGroup[]>("/td-groups");
export const createTDGroup = (data: Omit<TDGroup, "id">) =>
  apiFetch<TDGroup>("/td-groups", { method: "POST", body: JSON.stringify(data) });
export const deleteTDGroup = (id: number) =>
  apiFetch<null>(`/td-groups/${id}`, { method: "DELETE" });

// ─── Modules 
export const getModules  = () => apiFetch<Module[]>("/modules");
export const createModule = (data: Omit<Module, "id">) =>
  apiFetch<Module>("/modules", { method: "POST", body: JSON.stringify(data) });
export const updateModule = (id: number, data: Partial<Module>) =>
  apiFetch<Module>(`/modules/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const deleteModule = (id: number) =>
  apiFetch<null>(`/modules/${id}`, { method: "DELETE" });

// ─── Groupe Modules (Pool)
export interface GroupeModule {
  id: number;
  module_id: number;
  effectif: number;
  groupes: GroupeFiliere[];
}

export const getGroupeModules = () => apiFetch<GroupeModule[]>("/groupe-modules");
export const createGroupeModule = (data: { module_id: number, effectif: number, groupe_ids: number[] }) =>
  apiFetch<GroupeModule>("/groupe-modules", { method: "POST", body: JSON.stringify(data) });
export const updateGroupeModule = (id: number, data: Partial<{ effectif: number, groupe_ids: number[] }>) =>
  apiFetch<GroupeModule>(`/groupe-modules/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const deleteGroupeModule = (id: number) =>
  apiFetch<null>(`/groupe-modules/${id}`, { method: "DELETE" });


// ─── Module Parts & Timeslots 
export const getModuleParts = () => apiFetch<ModulePart[]>("/module-parts");
export const createModulePart = (data: Partial<ModulePart>) =>
    apiFetch<ModulePart>("/module-parts", { method: "POST", body: JSON.stringify(data) });
export const updateModulePart = (id: number, data: Partial<ModulePart>) =>
    apiFetch<ModulePart>(`/module-parts/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const deleteModulePart = (id: number) =>
    apiFetch<void>(`/module-parts/${id}`, { method: "DELETE" });

export const getTimeslots   = () => apiFetch<Timeslot[]>("/timeslots");
export const createTimeslot = (data: Partial<Timeslot>) =>
    apiFetch<Timeslot>("/timeslots", { method: "POST", body: JSON.stringify(data) });
export const updateTimeslot = (id: number, data: Partial<Timeslot>) =>
    apiFetch<Timeslot>(`/timeslots/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const deleteTimeslot = (id: number) =>
    apiFetch<void>(`/timeslots/${id}`, { method: "DELETE" });

// ─── Assignments 
export const getAssignments = () => apiFetch<Assignment[]>("/assignments");
export const getPreviewSchedule = () => apiFetch<Assignment[]>("/preview-schedule");
export const createAssignment = (data: AssignmentCreate) =>
  apiFetch<Assignment>("/assignments", { method: "POST", body: JSON.stringify(data) });
export const updateAssignment = (id: number, data: Partial<AssignmentCreate>) =>
  apiFetch<Assignment>(`/assignments/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const deleteAssignment = (id: number) =>
  apiFetch<void>(`/assignments/${id}`, { method: "DELETE" });
