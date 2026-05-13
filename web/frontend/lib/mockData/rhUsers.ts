const STORAGE_KEY = 'mockRHUsers'

export interface RHUserInput {
  name: string;
  email: string;
  company_id: string;
  department: string;
  position: string;
  phone: string;
}

export interface RHUser {
  id: string;
  auth_user_id: string; // Link to frontend auth user
  name: string;
  email: string;
  phone: string;
  company_id: string; // Foreign key to company
  company_name?: string; // For display purposes
  department: string;
  position: string;
  status: 'pending' | 'active';
  created_at: string;
}

/**
 * Generate a unique ID
 */
function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Add a new RH user
 */
export function addRHUser(userData: RHUserInput): RHUser {
  try {
    const rhUsers = getRHUsers();

    // In real app, you'd create auth user first and get auth_user_id
    // For now, we'll simulate it
    const newRHUser: RHUser = {
      id: generateId(),
      auth_user_id: generateId(), // Simulated auth user ID
      name: userData.name,
      phone:userData.phone,
      email: userData.email,
      company_id: userData.company_id,
      department: userData.department,
      position: userData.position,
      status: 'pending', 
      created_at: new Date().toISOString(),
    };

    rhUsers.push(newRHUser);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rhUsers));

    console.log('RH User created:', newRHUser);
    return newRHUser;
  } catch (error) {
    console.error('Error adding RH user:', error);
    throw new Error('Failed to create RH user');
  }
}

/**
 * Get all RH users from localStorage
 */
export function getRHUsers(): RHUser[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return [];
    }
    return JSON.parse(stored) as RHUser[];
  } catch (error) {
    console.error('Error loading RH users:', error);
    return [];
  }
}

/**
 * Get RH user by ID
 */
export function getRHUserById(id: string): RHUser | undefined {
  const rhUsers = getRHUsers();
  return rhUsers.find(user => user.id === id);
}

/**
 * Delete RH user
 */
export function deleteRHUser(id: string): boolean {
  try {
    const rhUsers = getRHUsers();
    const filtered = rhUsers.filter(user => user.id !== id);

    if (filtered.length === rhUsers.length) {
      console.error('RH User not found:', id);
      return false;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    console.log('RH User deleted:', id);
    return true;
  } catch (error) {
    console.error('Error deleting RH user:', error);
    return false;
  }
}

export function clearAllRHUsers(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    console.log('All RH users cleared');
  } catch (error) {
    console.error('Error clearing RH users:', error);
  }
}



